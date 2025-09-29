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
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 10

        sort_field = request.args.get('sort_field', 'timestamp')
        sort_order = request.args.get('sort_order', 'desc')
        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'
        if sort_field not in ['timestamp', 'temperature', 'light', 'humidity']:
            sort_field = 'timestamp'

        search_term = request.args.get('search', '')
        search_criteria = request.args.get('search_criteria', 'all')

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

        try:
            sample = int(request.args.get('sample', 1))
            if sample < 1:
                sample = 1
        except ValueError:
            sample = 1

        query_filter = {}

        logger.info(f"Sensor data list query filter: {query_filter}")
        logger.info(f"CRUD params - page: {page}, per_page: {per_page}, sort: {sort_field}:{sort_order}, search: '{search_term}' ({search_criteria})")

        if search_term:
            import re
            time_patterns = [
                r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$',
                r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$',
                r'^(\d{1,2}):(\d{1,2})$',
                r'^(\d{1,2})/(\d{1,2})/(\d{4})$',
                r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$'
            ]

            is_time_search = any(re.match(pattern, search_term) for pattern in time_patterns)

            if is_time_search:
                data = db.search_by_time_string(search_term)

                if sort_field in ['temperature', 'humidity', 'light']:
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                elif sort_field == 'timestamp':
                    reverse = sort_order == 'desc'

                    def get_timestamp_for_sort(x):
                        ts = x.get('timestamp')
                        if isinstance(ts, str):
                            try:
                                from dateutil import parser
                                return parser.parse(ts)
                            except:
                                return datetime.min
                        elif isinstance(ts, datetime):
                            return ts
                        else:
                            return datetime.min
                    data.sort(key=get_timestamp_for_sort, reverse=reverse)

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
                    'search': {'term': search_term, 'criteria': search_criteria}
                }
            else:
                criteria = {}

                if search_criteria == 'all':
                    criteria['text_search'] = search_term
                elif search_criteria == 'time':
                    data = db.search_by_time_string(search_term)

                    if sort_field in ['temperature', 'humidity', 'light']:
                        reverse = sort_order == 'desc'
                        data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                    elif sort_field == 'timestamp':
                        reverse = sort_order == 'desc'
                        data.sort(key=lambda x: x.get('timestamp') or datetime.min, reverse=reverse)

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
                        'search': {'term': search_term, 'criteria': search_criteria}
                    }

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
                    if search_term.replace('.', '').isdigit():
                        search_value = float(search_term)
                        criteria[f'{search_criteria}_min'] = search_value
                        criteria[f'{search_criteria}_max'] = search_value

                data = db.search_by_multiple_criteria(criteria)

                if sort_field in ['temperature', 'humidity', 'light']:
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                elif sort_field == 'timestamp':
                    reverse = sort_order == 'desc'

                    def get_timestamp_for_sort(x):
                        ts = x.get('timestamp')
                        if isinstance(ts, str):
                            try:
                                from dateutil import parser
                                return parser.parse(ts)
                            except:
                                return datetime.min
                        elif isinstance(ts, datetime):
                            return ts
                        else:
                            return datetime.min
                    data.sort(key=get_timestamp_for_sort, reverse=reverse)

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
                    'search': {'term': search_term, 'criteria': search_criteria}
                }
        else:
            data = db.get_recent_data(limit=None)

            if sort_field in ['temperature', 'humidity', 'light']:
                reverse = sort_order == 'desc'
                data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
            elif sort_field == 'timestamp':
                reverse = sort_order == 'desc'

                def get_timestamp_for_sort(x):
                    ts = x.get('timestamp')
                    if isinstance(ts, str):
                        try:
                            from dateutil import parser
                            return parser.parse(ts)
                        except:
                            return datetime.min
                    elif isinstance(ts, datetime):
                        return ts
                    else:
                        return datetime.min
                data.sort(key=get_timestamp_for_sort, reverse=reverse)

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

        if 'temperature' in doc and 'humidity' in doc and 'light' in doc:
            sensor_statuses = StatusService.get_sensor_statuses(
                doc['temperature'], doc['humidity'], doc['light']
            )
            doc['sensor_statuses'] = sensor_statuses

            overall_status, overall_color = StatusService.get_overall_status(sensor_statuses)
            doc['overall_status'] = {
                'status': overall_status,
                'color_class': overall_color
            }

        return jsonify(doc)

    return jsonify({})


@sensors_bp.route("/sensor-data/chart")
def chart_data():
    time_period = request.args.get('timePeriod', None)
    date_str = request.args.get('date', None)
    limit_arg = request.args.get('limit', None)

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

    if date_str:
        try:
            selected_date_local = create_vietnam_datetime(
                *datetime.strptime(date_str, '%Y-%m-%d').timetuple()[:3],
                hour=0, minute=0, second=0, microsecond=0
            )
            start_time = selected_date_local
            end_time = selected_date_local.replace(hour=23, minute=59, second=59, microsecond=999999)

            data = db.search_by_time_range_optimized(start_time, end_time)

            def get_timestamp_for_sort(x):
                ts = x.get('timestamp')
                if isinstance(ts, str):
                    try:
                        from dateutil import parser
                        return parser.parse(ts)
                    except:
                        return datetime.min
                elif isinstance(ts, datetime):
                    return ts
                else:
                    return datetime.min
            data.sort(key=get_timestamp_for_sort)

            if not is_all_data and limit and len(data) > limit:
                data = data[-limit:]

        except ValueError:
            data = db.get_recent_data(limit=limit)

            def get_timestamp_for_sort(x):
                ts = x.get('timestamp')
                if isinstance(ts, str):
                    try:
                        from dateutil import parser
                        return parser.parse(ts)
                    except:
                        return datetime.min
                elif isinstance(ts, datetime):
                    return ts
                else:
                    return datetime.min
            data.sort(key=get_timestamp_for_sort)
    else:
        if is_all_data:
            data = db.get_recent_data(limit=None)

            def get_timestamp_for_sort(x):
                ts = x.get('timestamp')
                if isinstance(ts, str):
                    try:
                        from dateutil import parser
                        return parser.parse(ts)
                    except:
                        return datetime.min
                elif isinstance(ts, datetime):
                    return ts
                else:
                    return datetime.min
            data.sort(key=get_timestamp_for_sort)
        else:
            data = db.get_recent_data(limit=limit)

            def get_timestamp_for_sort(x):
                ts = x.get('timestamp')
                if isinstance(ts, str):
                    try:
                        from dateutil import parser
                        return parser.parse(ts)
                    except:
                        return datetime.min
                elif isinstance(ts, datetime):
                    return ts
                else:
                    return datetime.min
            data.sort(key=get_timestamp_for_sort)

    logger.info(f"Chart data request - date_str: {date_str}, time_period: {time_period}, limit: {limit_arg}")
    logger.info(f"Mode: {'Historical' if date_str else 'Realtime'}, All Data: {is_all_data}")
    logger.info(f"Found {len(data)} records (limit: {limit})")

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
        data = db.get_recent_action_history_optimized(limit=100)

        led_states = {'LED1': 'OFF', 'LED2': 'OFF', 'LED3': 'OFF'}

        for record in data:
            if record.get('type') == 'led_status':
                led_id = record.get('led')
                state = record.get('state')
                timestamp = record.get('timestamp')

                if led_id in led_states:
                    current_timestamp = led_states.get(f'{led_id}_timestamp')
                    if not current_timestamp or (timestamp and isinstance(timestamp, datetime) and isinstance(current_timestamp, datetime) and timestamp > current_timestamp):
                        led_states[led_id] = state
                        led_states[f'{led_id}_timestamp'] = timestamp

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
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 10

        sort_field = request.args.get('sort_field', 'timestamp')
        sort_order = request.args.get('sort_order', 'desc')
        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'
        if sort_field not in ['timestamp', 'led', 'state']:
            sort_field = 'timestamp'

        search_term = request.args.get('search', '')
        device_filter = request.args.get('device_filter', 'all')
        state_filter = request.args.get('state_filter', 'all')

        limit = int(request.args.get('limit', 0))
        if limit > 0 and limit < per_page:
            per_page = limit

        logger.info(
            f"Action history CRUD params - page: {page}, per_page: {per_page}, sort: {sort_field}:{sort_order}, search: '{search_term}', device: {device_filter}, state: {state_filter}")

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
