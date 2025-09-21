from flask import request
from flask_restx import Resource, reqparse
from app.core.database import DatabaseManager
from datetime import datetime, timedelta, timezone
from app.core.logger_config import logger
from app.services.led_control_service import LEDControlService
from app.services.status_service import StatusService
from app.core.timezone_utils import get_vietnam_timezone, create_vietnam_datetime
from app.api.swagger_config import (
    sensors_ns, sensor_data_model, sensor_data_response_model,
    led_control_model, led_status_model, action_history_model,
    success_response_model, error_response_model
)

db = DatabaseManager()
led_service = LEDControlService()

sensor_list_parser = reqparse.RequestParser()
sensor_list_parser.add_argument('page', type=int, default=1, help='Số trang')
sensor_list_parser.add_argument('per_page', type=int, default=10, help='Số bản ghi mỗi trang')
sensor_list_parser.add_argument('sort_field', type=str, default='timestamp',
                                choices=['timestamp', 'temperature', 'light', 'humidity'],
                                help='Trường sắp xếp')
sensor_list_parser.add_argument('sort_order', type=str, default='desc',
                                choices=['asc', 'desc'], help='Thứ tự sắp xếp')
sensor_list_parser.add_argument('search', type=str, help='Từ khóa tìm kiếm')
sensor_list_parser.add_argument('search_criteria', type=str, default='all',
                                choices=['all', 'time', 'temperature', 'humidity', 'light'],
                                help='Tiêu chí tìm kiếm')
sensor_list_parser.add_argument('limit', type=str, help='Giới hạn số bản ghi hoặc "all"')
sensor_list_parser.add_argument('timePeriod', type=str,
                                choices=['today', '1day', '2days'],
                                help='Khoảng thời gian')
sensor_list_parser.add_argument('dateFrom', type=str, help='Ngày bắt đầu (YYYY-MM-DD)')
sensor_list_parser.add_argument('dateTo', type=str, help='Ngày kết thúc (YYYY-MM-DD)')
sensor_list_parser.add_argument('tempMin', type=float, help='Nhiệt độ tối thiểu')
sensor_list_parser.add_argument('tempMax', type=float, help='Nhiệt độ tối đa')
sensor_list_parser.add_argument('humidityMin', type=float, help='Độ ẩm tối thiểu')
sensor_list_parser.add_argument('humidityMax', type=float, help='Độ ẩm tối đa')
sensor_list_parser.add_argument('lightMin', type=float, help='Ánh sáng tối thiểu')
sensor_list_parser.add_argument('lightMax', type=float, help='Ánh sáng tối đa')
sensor_list_parser.add_argument('sample', type=int, default=1, help='Tỷ lệ lấy mẫu')

chart_parser = reqparse.RequestParser()
chart_parser.add_argument('timePeriod', type=str, help='Khoảng thời gian')
chart_parser.add_argument('date', type=str, help='Ngày cụ thể (YYYY-MM-DD)')
chart_parser.add_argument('limit', type=str, help='Giới hạn số bản ghi hoặc "all"')

action_history_parser = reqparse.RequestParser()
action_history_parser.add_argument('page', type=int, default=1, help='Số trang')
action_history_parser.add_argument('per_page', type=int, default=10, help='Số bản ghi mỗi trang')
action_history_parser.add_argument('sort_field', type=str, default='timestamp',
                                   choices=['timestamp', 'led', 'state'],
                                   help='Trường sắp xếp')
action_history_parser.add_argument('sort_order', type=str, default='desc',
                                   choices=['asc', 'desc'], help='Thứ tự sắp xếp')
action_history_parser.add_argument('search', type=str, help='Từ khóa tìm kiếm')
action_history_parser.add_argument('device_filter', type=str, default='all',
                                   choices=['all', 'LED1', 'LED2', 'LED3'],
                                   help='Lọc theo thiết bị')
action_history_parser.add_argument('state_filter', type=str, default='all',
                                   choices=['all', 'ON', 'OFF'],
                                   help='Lọc theo trạng thái')
action_history_parser.add_argument('limit', type=int, help='Giới hạn số bản ghi')


@sensors_ns.route('/sensor-data')
class SensorDataResource(Resource):
    @sensors_ns.marshal_with(sensor_data_response_model)
    @sensors_ns.doc('get_latest_sensor_data', description='Lấy dữ liệu cảm biến mới nhất')
    def get(self):
        try:
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

                return doc
            return {}
        except Exception as e:
            logger.error(f"Error in get latest sensor data: {e}")
            sensors_ns.abort(500, message=str(e))

    @sensors_ns.expect(sensor_data_model)
    @sensors_ns.doc('add_sensor_data', description='Thêm dữ liệu cảm biến mới')
    def post(self):
        try:
            data = request.get_json()
            result = db.insert_data(data)
            return {"status": "success", "id": str(result.inserted_id)}, 201
        except Exception as e:
            logger.error(f"Error in add sensor data: {e}")
            return {"status": "error", "message": str(e)}, 400


@sensors_ns.route('/sensor-data/<string:sensor_id>')
class SensorDataByIdResource(Resource):
    @sensors_ns.marshal_with(success_response_model)
    @sensors_ns.doc('get_sensor_data_by_id', description='Lấy dữ liệu cảm biến theo ID')
    def get(self, sensor_id):
        try:
            data = db.get_data_by_id(sensor_id)
            if data:
                if '_id' in data:
                    data['_id'] = str(data['_id'])
                return {"status": "success", "data": data}
            else:
                sensors_ns.abort(404, message="Sensor data not found")
        except Exception as e:
            logger.error(f"Error in get sensor data by id: {e}")
            sensors_ns.abort(500, message=str(e))


@sensors_ns.route('/sensor-data-list')
class SensorDataListResource(Resource):
    @sensors_ns.expect(sensor_list_parser)
    @sensors_ns.marshal_with(success_response_model)
    @sensors_ns.doc('get_sensor_data_list', description='Lấy danh sách dữ liệu cảm biến với phân trang và lọc')
    def get(self):
        try:
            args = sensor_list_parser.parse_args()

            page = args['page']
            per_page = args['per_page']
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 10

            sort_field = args['sort_field']
            sort_order = args['sort_order']
            if sort_order not in ['asc', 'desc']:
                sort_order = 'desc'
            if sort_field not in ['timestamp', 'temperature', 'light', 'humidity']:
                sort_field = 'timestamp'

            search_term = args['search'] or ''
            search_criteria = args['search_criteria']

            limit_arg = args['limit']
            if isinstance(limit_arg, str) and limit_arg.lower() == 'all':
                limit = None
            else:
                try:
                    limit = int(limit_arg) if limit_arg else None
                    if limit and limit <= 0:
                        limit = None
                except (ValueError, TypeError):
                    limit = None

            time_period = args['timePeriod']
            try:
                sample = int(args['sample'])
                if sample < 1:
                    sample = 1
            except ValueError:
                sample = 1

            date_from = args['dateFrom']
            date_to = args['dateTo']
            temp_min = args['tempMin']
            temp_max = args['tempMax']
            light_min = args['lightMin']
            light_max = args['lightMax']
            humidity_min = args['humidityMin']
            humidity_max = args['humidityMax']

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
                    temp_filter['$gte'] = float(temp_min)
                if temp_max is not None:
                    temp_filter['$lte'] = float(temp_max)
                if temp_filter:
                    query_filter['temperature'] = temp_filter

            if light_min is not None or light_max is not None:
                light_filter = {}
                if light_min is not None:
                    light_filter['$gte'] = float(light_min)
                if light_max is not None:
                    light_filter['$lte'] = float(light_max)
                if light_filter:
                    query_filter['light'] = light_filter

            if humidity_min is not None or humidity_max is not None:
                humidity_filter = {}
                if humidity_min is not None:
                    humidity_filter['$gte'] = float(humidity_min)
                if humidity_max is not None:
                    humidity_filter['$lte'] = float(humidity_max)
                if humidity_filter:
                    query_filter['humidity'] = humidity_filter

            if search_term:
                data = db.search_by_multiple_criteria({'text_search': search_term})

                if sort_field in ['temperature', 'humidity', 'light']:
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                elif sort_field == 'timestamp':
                    reverse = sort_order == 'desc'
                    data.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=reverse)

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
                if query_filter:
                    result = db.search_with_pagination_optimized(
                        query=query_filter,
                        page=page,
                        per_page=per_page,
                        sort_field=sort_field,
                        sort_order=sort_order
                    )
                    result['search'] = {'term': '', 'criteria': 'all'}
                else:
                    data = db.get_recent_data(limit=None)

                    if sort_field in ['temperature', 'humidity', 'light']:
                        reverse = sort_order == 'desc'
                        data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)
                    elif sort_field == 'timestamp':
                        reverse = sort_order == 'desc'
                        data.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=reverse)

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

            return {
                "status": "success",
                "data": result['data'],
                "pagination": result['pagination'],
                "sort": result['sort'],
                "search": result['search'],
                "count": len(result['data']),
                "total_count": result['pagination']['total_count']
            }

        except Exception as e:
            logger.error(f"Error in sensor_data_list: {e}")
            return {
                "status": "error",
                "message": str(e),
                "data": []
            }, 500


@sensors_ns.route('/sensor-data/chart')
class SensorChartDataResource(Resource):
    @sensors_ns.expect(chart_parser)
    @sensors_ns.doc('get_chart_data', description='Lấy dữ liệu cho biểu đồ')
    def get(self):
        try:
            args = chart_parser.parse_args()

            time_period = args['timePeriod']
            date_str = args['date']
            limit_arg = args['limit']

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
                    data.sort(key=lambda x: x.get('timestamp', datetime.min))

                    if not is_all_data and limit and len(data) > limit:
                        data = data[-limit:]

                except ValueError:
                    data = db.get_recent_data(limit=limit)
                    data.sort(key=lambda x: x.get('timestamp', datetime.min))
            else:
                if is_all_data:
                    data = db.get_recent_data(limit=None)
                    data.sort(key=lambda x: x.get('timestamp', datetime.min))
                else:
                    data = db.get_recent_data(limit=limit)
                    data.sort(key=lambda x: x.get('timestamp', datetime.min))

            logger.info(f"Chart data request - date_str: {date_str}, time_period: {time_period}, limit: {limit_arg}")

            for doc in data:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])

            return data

        except Exception as e:
            logger.error(f"Error in chart data: {e}")
            sensors_ns.abort(500, message=str(e))


@sensors_ns.route('/led-control')
class LEDControlResource(Resource):
    @sensors_ns.expect(led_control_model)
    @sensors_ns.doc('control_led', description='Điều khiển LED')
    def post(self):
        try:
            data = request.get_json()
            led_id = data.get('led_id')
            action = data.get('action')

            if not led_id or not action:
                return {"status": "error", "message": "Missing led_id or action"}, 400

            if led_id not in ['LED1', 'LED2', 'LED3']:
                return {"status": "error", "message": "Invalid led_id"}, 400

            if action not in ['ON', 'OFF']:
                return {"status": "error", "message": "Invalid action"}, 400

            success = led_service.send_led_command(led_id, action)

            if success:
                logger.info(f"LED control command sent: {led_id}_{action}")
                return {"status": "success", "message": f"Command {led_id}_{action} sent successfully"}
            else:
                return {"status": "error", "message": "Failed to send command"}, 500

        except Exception as e:
            logger.error(f"LED control error: {e}")
            return {"status": "error", "message": str(e)}, 500


@sensors_ns.route('/led-status')
class LEDStatusResource(Resource):
    @sensors_ns.marshal_with(led_status_model)
    @sensors_ns.doc('get_led_status', description='Lấy trạng thái LED')
    def get(self):
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
                        if not current_timestamp or (timestamp and timestamp > current_timestamp):
                            led_states[led_id] = state
                            led_states[f'{led_id}_timestamp'] = timestamp

            response_data = {
                'LED1': led_states['LED1'],
                'LED2': led_states['LED2'],
                'LED3': led_states['LED3']
            }

            return {"status": "success", "data": response_data}

        except Exception as e:
            logger.error(f"Error in led_status: {e}")
            sensors_ns.abort(500, message=str(e))


@sensors_ns.route('/action-history')
class ActionHistoryResource(Resource):
    @sensors_ns.expect(action_history_parser)
    @sensors_ns.marshal_with(success_response_model)
    @sensors_ns.doc('get_action_history', description='Lấy lịch sử hành động')
    def get(self):
        try:
            args = action_history_parser.parse_args()

            page = args['page']
            per_page = args['per_page']
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 10

            sort_field = args['sort_field']
            sort_order = args['sort_order']
            if sort_order not in ['asc', 'desc']:
                sort_order = 'desc'
            if sort_field not in ['timestamp', 'led', 'state']:
                sort_field = 'timestamp'

            search_term = args['search'] or ''
            device_filter = args['device_filter']
            state_filter = args['state_filter']

            limit = args['limit']
            if limit and limit > 0 and limit < per_page:
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

            return {
                "status": "success",
                "data": result['data'],
                "pagination": result['pagination'],
                "filters": result['filters'],
                "sort": result['sort'],
                "count": len(result['data']),
                "total_count": result['pagination']['total_count']
            }

        except Exception as e:
            logger.error(f"Error in action_history: {e}")
            return {"status": "error", "message": str(e), "data": []}, 500
