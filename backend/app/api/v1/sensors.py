from flask import Blueprint, jsonify, request
from app.core.database import DatabaseManager
from datetime import datetime, timedelta, timezone
from app.core.logger_config import logger
from app.services.led_control_service import LEDControlService
from app.services.status_service import StatusService
from app.core.timezone_utils import get_vietnam_timezone, create_vietnam_datetime

sensors_bp = Blueprint('sensors', __name__)
db = DatabaseManager()
led_service = LEDControlService()


@sensors_bp.route("/sensor-data-list")
def sensor_data_list():
    try:
        # Pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 10

        # Sorting parameters
        sort_field = request.args.get('sort_field', 'timestamp')
        sort_order = request.args.get('sort_order', 'desc')
        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'
        if sort_field not in ['timestamp', 'temperature', 'light', 'humidity']:
            sort_field = 'timestamp'

        # Search parameters
        search_term = request.args.get('search', '')
        search_criteria = request.args.get('search_criteria', 'all')

        # Filter parameters
        limit_arg = request.args.get('limit', None)
        if isinstance(limit_arg, str) and limit_arg.lower() == 'all':
            limit = None
        else:
            try:
                limit = int(limit_arg) if limit_arg else None
                if limit and limit <= 0:
                    limit = None
            except (ValueError, TypeError):
                limit = None

        time_period = request.args.get('timePeriod', None)
        try:
            sample = int(request.args.get('sample', 1))
            if sample < 1:
                sample = 1
        except ValueError:
            sample = 1

        date_from = request.args.get('dateFrom', None)
        date_to = request.args.get('dateTo', None)
        temp_min = request.args.get('tempMin', None)
        temp_max = request.args.get('tempMax', None)
        light_min = request.args.get('lightMin', None)
        light_max = request.args.get('lightMax', None)
        humidity_min = request.args.get('humidityMin', None)
        humidity_max = request.args.get('humidityMax', None)

        query_filter = {}

        if date_from or date_to:
            timestamp_filter = {}
            if date_from:
                try:
                    start_date = create_vietnam_datetime(
                        *datetime.strptime(date_from, '%Y-%m-%d').timetuple()[:3],
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    timestamp_filter['$gte'] = start_date
                except ValueError:
                    pass

            if date_to:
                try:
                    end_date = create_vietnam_datetime(
                        *datetime.strptime(date_to, '%Y-%m-%d').timetuple()[:3],
                        hour=23, minute=59, second=59, microsecond=999999
                    )
                    timestamp_filter['$lte'] = end_date
                except ValueError:
                    pass

            if timestamp_filter:
                query_filter['timestamp'] = timestamp_filter

        elif time_period:
            vn_tz = get_vietnam_timezone()
            end_time = datetime.now(vn_tz)
            if time_period == 'today':
                start_time = end_time.replace(hour=0, minute=0, second=0, microsecond=0)
                query_filter['timestamp'] = {'$gte': start_time, '$lte': end_time}
            elif time_period == '1day':
                start_time = end_time - timedelta(days=1)
                query_filter['timestamp'] = {'$gte': start_time, '$lte': end_time}
            elif time_period == '2days':
                start_time = end_time - timedelta(days=2)
                query_filter['timestamp'] = {'$gte': start_time, '$lte': end_time}

        if temp_min is not None or temp_max is not None:
            temp_filter = {}
            if temp_min is not None:
                try:
                    temp_filter['$gte'] = float(temp_min)
                except ValueError:
                    pass
            if temp_max is not None:
                try:
                    temp_filter['$lte'] = float(temp_max)
                except ValueError:
                    pass
            if temp_filter:
                query_filter['temperature'] = temp_filter

        if light_min is not None or light_max is not None:
            light_filter = {}
            if light_min is not None:
                try:
                    light_filter['$gte'] = float(light_min)
                except ValueError:
                    pass
            if light_max is not None:
                try:
                    light_filter['$lte'] = float(light_max)
                except ValueError:
                    pass
            if light_filter:
                query_filter['light'] = light_filter

        if humidity_min is not None or humidity_max is not None:
            humidity_filter = {}
            if humidity_min is not None:
                try:
                    humidity_filter['$gte'] = float(humidity_min)
                except ValueError:
                    pass
            if humidity_max is not None:
                try:
                    humidity_filter['$lte'] = float(humidity_max)
                except ValueError:
                    pass
            if humidity_filter:
                query_filter['humidity'] = humidity_filter

        logger.info(f"Sensor data list query filter: {query_filter}")
        logger.info(f"CRUD params - page: {page}, per_page: {per_page}, sort: {sort_field}:{sort_order}, search: '{search_term}' ({search_criteria})")

        # Sử dụng NoSQLQueryService cho tất cả các trường hợp
        if search_term:
            # Kiểm tra xem search_term có phải là format thời gian không
            import re
            time_patterns = [
                r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$',  # HH:MM:SS DD/M/YYYY
                r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$',  # HH:MM:SS
                r'^(\d{1,2}):(\d{1,2})$',  # HH:MM
                r'^(\d{1,2})/(\d{1,2})/(\d{4})$',  # DD/M/YYYY
                r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$'  # HH:MM DD/M/YYYY
            ]

            is_time_search = any(re.match(pattern, search_term) for pattern in time_patterns)

            if is_time_search:
                # Sử dụng time string search
                data = db.search_by_time_string(search_term)

                # Sắp xếp dữ liệu TRƯỚC khi áp dụng sampling và pagination
                if sort_field in ['temperature', 'humidity', 'light']:
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                elif sort_field == 'timestamp':
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=reverse)

                # Áp dụng sampling để giảm tải dữ liệu (sau khi sort)
                if sample and sample > 1:
                    data = data[::sample]

                # Áp dụng pagination thủ công (sau khi sort và sampling)
                total_count = len(data)
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_data = data[start_idx:end_idx]

                result = {
                    'data': paginated_data,
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total_count': total_count,
                        'total_pages': max(1, (total_count + per_page - 1) // per_page),
                        'has_prev': page > 1,
                        'has_next': page < max(1, (total_count + per_page - 1) // per_page)
                    },
                    'sort': {'field': sort_field, 'order': sort_order},
                    'search': {'term': search_term, 'criteria': search_criteria}
                }
            else:
                # Xây dựng criteria cho multi-criteria search
                criteria = {}

                # Thêm time range nếu có
                if 'timestamp' in query_filter:
                    timestamp_filter = query_filter['timestamp']
                    if '$gte' in timestamp_filter and '$lte' in timestamp_filter:
                        criteria['start_time'] = timestamp_filter['$gte']
                        criteria['end_time'] = timestamp_filter['$lte']

                # Thêm numeric ranges
                if 'temperature' in query_filter:
                    temp_filter = query_filter['temperature']
                    if '$gte' in temp_filter:
                        criteria['temperature_min'] = temp_filter['$gte']
                    if '$lte' in temp_filter:
                        criteria['temperature_max'] = temp_filter['$lte']

                if 'humidity' in query_filter:
                    humidity_filter = query_filter['humidity']
                    if '$gte' in humidity_filter:
                        criteria['humidity_min'] = humidity_filter['$gte']
                    if '$lte' in humidity_filter:
                        criteria['humidity_max'] = humidity_filter['$lte']

                if 'light' in query_filter:
                    light_filter = query_filter['light']
                    if '$gte' in light_filter:
                        criteria['light_min'] = light_filter['$gte']
                    if '$lte' in light_filter:
                        criteria['light_max'] = light_filter['$lte']

                # Thêm text search
                if search_criteria == 'all':
                    criteria['text_search'] = search_term
                elif search_criteria == 'time':
                    # Tìm kiếm theo thời gian - sử dụng time string search
                    data = db.search_by_time_string(search_term)

                    # Sắp xếp dữ liệu TRƯỚC khi áp dụng sampling và pagination
                    if sort_field in ['temperature', 'humidity', 'light']:
                        reverse = sort_order == 'desc'
                        data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                    elif sort_field == 'timestamp':
                        reverse = sort_order == 'desc'
                        data.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=reverse)

                    # Áp dụng sampling để giảm tải dữ liệu (sau khi sort)
                    if sample and sample > 1:
                        data = data[::sample]

                    # Áp dụng pagination thủ công (sau khi sort và sampling)
                    total_count = len(data)
                    start_idx = (page - 1) * per_page
                    end_idx = start_idx + per_page
                    paginated_data = data[start_idx:end_idx]

                    result = {
                        'data': paginated_data,
                        'pagination': {
                            'page': page,
                            'per_page': per_page,
                            'total_count': total_count,
                            'total_pages': max(1, (total_count + per_page - 1) // per_page),
                            'has_prev': page > 1,
                            'has_next': page < max(1, (total_count + per_page - 1) // per_page)
                        },
                        'sort': {'field': sort_field, 'order': sort_order},
                        'search': {'term': search_term, 'criteria': search_criteria}
                    }

                    # Sampling đã được áp dụng trước khi phân trang

                    for doc in result['data']:
                        if '_id' in doc:
                            doc['_id'] = str(doc['_id'])

                    logger.info(f"Returned {len(result['data'])} sensor data records (sampling ratio 1:{sample})")

                    return jsonify({
                        "status": "success",
                        "data": result['data'],
                        "pagination": result['pagination'],
                        "sort": result['sort'],
                        "search": result['search'],
                        "count": len(result['data']),
                        "total_count": result['pagination']['total_count']
                    })
                elif search_criteria in ['temperature', 'humidity', 'light']:
                    # Tìm kiếm theo giá trị chính xác của field
                    if search_term.replace('.', '').isdigit():
                        search_value = float(search_term)
                        criteria[f'{search_criteria}_min'] = search_value
                        criteria[f'{search_criteria}_max'] = search_value

                # Sử dụng multi-criteria search
                data = db.search_by_multiple_criteria(criteria)

                # Sắp xếp dữ liệu TRƯỚC khi áp dụng sampling và pagination
                if sort_field in ['temperature', 'humidity', 'light']:
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                elif sort_field == 'timestamp':
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=reverse)

                # Áp dụng sampling để giảm tải dữ liệu (sau khi sort)
                if sample and sample > 1:
                    data = data[::sample]

                # Áp dụng pagination thủ công (sau khi sort và sampling)
                total_count = len(data)
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_data = data[start_idx:end_idx]

                result = {
                    'data': paginated_data,
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total_count': total_count,
                        'total_pages': max(1, (total_count + per_page - 1) // per_page),
                        'has_prev': page > 1,
                        'has_next': page < max(1, (total_count + per_page - 1) // per_page)
                    },
                    'sort': {'field': sort_field, 'order': sort_order},
                    'search': {'term': search_term, 'criteria': search_criteria}
                }
        else:
            # Không có search term, sử dụng query filter với pagination
            if query_filter:
                # Sử dụng search_with_pagination_optimized
                result = db.search_with_pagination_optimized(
                    query=query_filter,
                    page=page,
                    per_page=per_page,
                    sort_field=sort_field,
                    sort_order=sort_order
                )
                result['search'] = {'term': '', 'criteria': 'all'}
            else:
                # Lấy toàn bộ dữ liệu và áp dụng sampling trước khi phân trang
                data = db.get_recent_data(limit=None)

                # Sắp xếp dữ liệu TRƯỚC khi áp dụng sampling và pagination
                if sort_field in ['temperature', 'humidity', 'light']:
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                elif sort_field == 'timestamp':
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=reverse)

                # Áp dụng sampling để giảm tải dữ liệu (sau khi sort)
                if sample and sample > 1:
                    data = data[::sample]

                total_count = len(data)
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_data = data[start_idx:end_idx]

                result = {
                    'data': paginated_data,
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total_count': total_count,
                        'total_pages': max(1, (total_count + per_page - 1) // per_page),
                        'has_prev': page > 1,
                        'has_next': page < max(1, (total_count + per_page - 1) // per_page)
                    },
                    'sort': {'field': sort_field, 'order': sort_order},
                    'search': {'term': '', 'criteria': 'all'}
                }

        # Sampling đã được áp dụng trước khi phân trang

        for doc in result['data']:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])

        logger.info(f"Returned {len(result['data'])} sensor data records (sampling ratio 1:{sample})")

        return jsonify({
            "status": "success",
            "data": result['data'],
            "pagination": result['pagination'],
            "sort": result['sort'],
            "search": result['search'],
            "count": len(result['data']),
            "total_count": result['pagination']['total_count']
        })

    except Exception as e:
        logger.error(f"Error in sensor_data_list: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@sensors_bp.route("/sensor-data")
def sensor_data():
    data = db.get_recent_data(limit=1)
    if data:
        doc = data[0]
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])

        # Thêm thông tin trạng thái cho dữ liệu sensor
        if 'temperature' in doc and 'humidity' in doc and 'light' in doc:
            sensor_statuses = StatusService.get_sensor_statuses(
                doc['temperature'], doc['humidity'], doc['light']
            )
            doc['sensor_statuses'] = sensor_statuses

            # Thêm trạng thái tổng thể
            overall_status, overall_color = StatusService.get_overall_status(sensor_statuses)
            doc['overall_status'] = {
                'status': overall_status,
                'color_class': overall_color
            }

        return jsonify(doc)

    return jsonify({})


@sensors_bp.route("/sensor-data", methods=['POST'])
def add_sensor_data():
    try:
        data = request.get_json()
        result = db.insert_data(data)
        return jsonify({"status": "success", "id": str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@sensors_bp.route("/sensor-data/<sensor_id>")
def get_sensor_data_by_id(sensor_id):
    try:
        data = db.get_data_by_id(sensor_id)
        if data:
            if '_id' in data:
                data['_id'] = str(data['_id'])
            return jsonify({"status": "success", "data": data})
        else:
            return jsonify({"status": "error", "message": "Sensor data not found"}), 404
    except Exception as e:
        logger.error(f"Error in get_sensor_data_by_id: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@sensors_bp.route("/sensor-data/chart")
def chart_data():
    time_period = request.args.get('timePeriod', None)
    date_str = request.args.get('date', None)
    limit_arg = request.args.get('limit', None)

    # Xử lý limit parameter - mặc định là 50 nếu không có
    limit = 50
    is_all_data = False
    if limit_arg and limit_arg.lower() == 'all':
        is_all_data = True
        limit = None
    elif limit_arg:
        try:
            limit = int(limit_arg)
            if limit <= 0:
                limit = 50
        except (ValueError, TypeError):
            limit = 50

    vn_tz = get_vietnam_timezone()
    end_time = datetime.now(vn_tz)

    # Nếu có date_str, lấy dữ liệu theo ngày cụ thể
    if date_str:
        try:
            selected_date_local = create_vietnam_datetime(
                *datetime.strptime(date_str, '%Y-%m-%d').timetuple()[:3],
                hour=0, minute=0, second=0, microsecond=0
            )
            start_time = selected_date_local
            end_time = selected_date_local.replace(hour=23, minute=59, second=59, microsecond=999999)

            # Lấy dữ liệu theo ngày và sắp xếp theo thời gian
            data = db.search_by_time_range_optimized(start_time, end_time)
            data.sort(key=lambda x: x.get('timestamp', datetime.min))

            # Nếu không phải "all data", áp dụng limit
            if not is_all_data and limit and len(data) > limit:
                data = data[-limit:]  # Lấy limit cuối cùng (mới nhất)

        except ValueError:
            # Lỗi format ngày, lấy dữ liệu gần nhất
            data = db.get_recent_data(limit=limit)
            data.sort(key=lambda x: x.get('timestamp', datetime.min))
    else:
        # Không có date_str
        if is_all_data:
            # Nếu chọn "all data" nhưng không có date, lấy tất cả dữ liệu gần nhất
            data = db.get_recent_data(limit=None)
            data.sort(key=lambda x: x.get('timestamp', datetime.min))
        else:
            # Lấy x dữ liệu gần nhất từ database (realtime mode)
            data = db.get_recent_data(limit=limit)
            data.sort(key=lambda x: x.get('timestamp', datetime.min))

    logger.info(f"Chart data request - date_str: {date_str}, time_period: {time_period}, limit: {limit_arg}")
    logger.info(f"Mode: {'Historical' if date_str else 'Realtime'}, All Data: {is_all_data}")
    logger.info(f"Found {len(data)} records (limit: {limit})")

    # Log thời gian của dữ liệu để debug
    if data:
        timestamps = [item.get('timestamp') for item in data if 'timestamp' in item]
        if timestamps:
            min_time = min(timestamps)
            max_time = max(timestamps)
            logger.info(f"Data time range: {min_time} to {max_time}")

    for doc in data:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])

    return jsonify(data)


@sensors_bp.route("/led-control", methods=['POST'])
def led_control():
    try:
        data = request.get_json()
        led_id = data.get('led_id')
        action = data.get('action')

        if not led_id or not action:
            return jsonify({"status": "error", "message": "Missing led_id or action"}), 400

        if led_id not in ['LED1', 'LED2', 'LED3']:
            return jsonify({"status": "error", "message": "Invalid led_id"}), 400

        if action not in ['ON', 'OFF']:
            return jsonify({"status": "error", "message": "Invalid action"}), 400

        success = led_service.send_led_command(led_id, action)

        if success:
            logger.info(f"LED control command sent: {led_id}_{action}")
            return jsonify({"status": "success", "message": f"Command {led_id}_{action} sent successfully"})
        else:
            return jsonify({"status": "error", "message": "Failed to send command"}), 500

    except Exception as e:
        logger.error(f"LED control error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@sensors_bp.route("/led-status")
def led_status():
    try:
        # Lấy trạng thái LED hiện tại từ action history
        data = db.get_recent_action_history_optimized(limit=100)

        # Xác định trạng thái mới nhất của từng LED
        led_states = {'LED1': 'OFF', 'LED2': 'OFF', 'LED3': 'OFF'}

        for record in data:
            if record.get('type') == 'led_status':
                led_id = record.get('led')
                state = record.get('state')
                timestamp = record.get('timestamp')

                if led_id in led_states:
                    # Chỉ cập nhật nếu timestamp mới hơn
                    current_timestamp = led_states.get(f'{led_id}_timestamp')
                    if not current_timestamp or (timestamp and timestamp > current_timestamp):
                        led_states[led_id] = state
                        led_states[f'{led_id}_timestamp'] = timestamp

        # Loại bỏ các field timestamp khỏi response
        response_data = {
            'LED1': led_states['LED1'],
            'LED2': led_states['LED2'],
            'LED3': led_states['LED3']
        }

        return jsonify({"status": "success", "data": response_data})

    except Exception as e:
        logger.error(f"Error in led_status: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@sensors_bp.route("/action-history")
def action_history():
    try:
        # Pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 10

        # Sorting parameters
        sort_field = request.args.get('sort_field', 'timestamp')
        sort_order = request.args.get('sort_order', 'desc')
        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'
        if sort_field not in ['timestamp', 'led', 'state']:
            sort_field = 'timestamp'

        # Search and filter parameters
        search_term = request.args.get('search', '')
        device_filter = request.args.get('device_filter', 'all')
        state_filter = request.args.get('state_filter', 'all')

        # Backward compatibility
        limit = int(request.args.get('limit', 0))
        if limit > 0 and limit < per_page:
            per_page = limit

        logger.info(
            f"Action history CRUD params - page: {page}, per_page: {per_page}, sort: {sort_field}:{sort_order}, search: '{search_term}', device: {device_filter}, state: {state_filter}")

        # Sử dụng NoSQLQueryService cho action history
        result = db.search_action_history(
            search_term=search_term,
            device_filter=device_filter,
            state_filter=state_filter,
            sort_field=sort_field,
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )

        for doc in result['data']:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])

        return jsonify({
            "status": "success",
            "data": result['data'],
            "pagination": result['pagination'],
            "filters": result['filters'],
            "sort": result['sort'],
            "count": len(result['data']),
            "total_count": result['pagination']['total_count']
        })

    except Exception as e:
        logger.error(f"Error in action_history: {e}")
        return jsonify({"status": "error", "message": str(e), "data": []}), 500
