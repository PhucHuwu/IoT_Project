from app.api.routes import api_bp
from app.services.data_service import IoTMQTTReceiver
from app.core.config import Config
from app.core.database import DatabaseManager
from app.core.logger_config import logger
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_restx import Api, Resource, fields
from datetime import datetime
import threading
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))


sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=["*"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    api = Api(
        app,
        version='1.0',
        title='IoT Monitoring System API',
        description='API REST cho hệ thống giám sát IoT với các chức năng quản lý dữ liệu cảm biến, điều khiển LED, phân trang, sắp xếp và tìm kiếm dữ liệu',
        doc='/docs/',
        prefix='/api/v1'
    )

    sensors_ns = api.namespace('sensors', description='API quản lý dữ liệu cảm biến và điều khiển LED')

    sensor_data_model = api.model('SensorData', {
        'temperature': fields.Float(required=True, description='Nhiệt độ (Celsius)', example=25.5),
        'humidity': fields.Float(required=True, description='Độ ẩm (%)', example=60.2),
        'light': fields.Float(required=True, description='Ánh sáng (%)', example=45.8),
        'timestamp': fields.DateTime(description='Thời gian (ISO 8601)', example='2024-01-15T10:30:00+07:00')
    })

    led_control_model = api.model('LEDControl', {
        'led_id': fields.String(required=True, description='ID của LED', enum=['LED1', 'LED2', 'LED3'], example='LED1'),
        'action': fields.String(required=True, description='Hành động', enum=['ON', 'OFF'], example='ON')
    })

    success_response_model = api.model('SuccessResponse', {
        'status': fields.String(description='Trạng thái', example='success'),
        'data': fields.Raw(description='Dữ liệu trả về'),
        'message': fields.String(description='Thông báo')
    })

    error_response_model = api.model('ErrorResponse', {
        'status': fields.String(description='Trạng thái', example='error'),
        'message': fields.String(description='Thông báo lỗi'),
        'error': fields.String(description='Chi tiết lỗi')
    })

    @sensors_ns.route('/sensor-data')
    class SensorDataResource(Resource):
        @sensors_ns.doc('get_latest_sensor_data',
                        description='Lấy dữ liệu cảm biến mới nhất từ ESP32',
                        responses={
                            200: 'Thành công - Trả về dữ liệu cảm biến mới nhất',
                            500: 'Lỗi server - Không thể kết nối database'
                        })
        def get(self):
            try:
                from app.core.database import DatabaseManager
                from app.services.status_service import StatusService

                db = DatabaseManager()
                data = db.get_recent_data(limit=1)

                if data:
                    doc = data[0]
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])

                    if 'timestamp' in doc and hasattr(doc['timestamp'], 'isoformat'):
                        doc['timestamp'] = doc['timestamp'].isoformat()

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
                else:
                    return {
                        "error": "Không có dữ liệu cảm biến",
                        "message": "Database trống hoặc chưa có dữ liệu từ ESP32"
                    }

            except Exception as e:
                return {
                    "error": f"Lỗi khi lấy dữ liệu: {str(e)}",
                    "message": "Không thể kết nối đến database"
                }, 500

    @sensors_ns.route('/sensor-data-list')
    class SensorDataListResource(Resource):
        @sensors_ns.doc('get_sensor_data_list',
                        description='Lấy danh sách dữ liệu cảm biến với phân trang, sắp xếp và tìm kiếm',
                        params={
                            'page': 'Số trang (mặc định: 1)',
                            'per_page': 'Số bản ghi mỗi trang (mặc định: 10)',
                            'limit': 'Giới hạn số bản ghi (có thể là số hoặc "all")',
                            'sample': 'Tỷ lệ lấy mẫu dữ liệu (mặc định: 1)',
                            'sort_field': 'Trường sắp xếp (timestamp, temperature, humidity, light)',
                            'sort_order': 'Thứ tự sắp xếp (asc, desc)',
                            'search': 'Từ khóa tìm kiếm',
                            'search_criteria': 'Tiêu chí tìm kiếm (all, time, temperature, humidity, light)'
                        },
                        responses={
                            200: 'Thành công - Trả về danh sách dữ liệu cảm biến',
                            500: 'Lỗi server - Không thể kết nối database'
                        })
        def get(self):
            try:
                from flask import request
                from app.core.database import DatabaseManager
                import re

                page = int(request.args.get('page', 1))
                per_page = int(request.args.get('per_page', 10))
                limit = request.args.get('limit', '10')
                search_term = request.args.get('search', '')
                search_criteria = request.args.get('search_criteria', 'all')
                sort_field = request.args.get('sort_field', 'timestamp')
                sort_order = request.args.get('sort_order', 'desc')

                try:
                    sample = int(request.args.get('sample', 1))
                    if sample < 1:
                        sample = 1
                except ValueError:
                    sample = 1

                db = DatabaseManager()

                if search_term:
                    if search_criteria == 'time':
                        data = db.search_by_time_string(search_term)
                    elif search_criteria in ['temperature', 'humidity', 'light']:
                        if search_term.replace('.', '').isdigit():
                            search_value = float(search_term)
                            criteria = {
                                f'{search_criteria}_min': search_value,
                                f'{search_criteria}_max': search_value
                            }
                            data = db.search_by_multiple_criteria(criteria)
                        else:
                            data = []
                    else:
                        criteria = {'text_search': search_term}
                        data = db.search_by_multiple_criteria(criteria)

                    if sample and sample > 1:
                        data = data[::sample]
                else:
                    if limit == 'all':
                        data = db.get_recent_data(limit=None)
                    else:
                        try:
                            limit_int = int(limit)
                            data = db.get_recent_data(limit=limit_int)
                        except ValueError:
                            data = db.get_recent_data(limit=10)

                if sample and sample > 1:
                    data = data[::sample]

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

                total_count = len(data)
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_data = data[start_idx:end_idx]

                for doc in paginated_data:
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])

                    if 'timestamp' in doc and hasattr(doc['timestamp'], 'isoformat'):
                        doc['timestamp'] = doc['timestamp'].isoformat()

                return {
                    "status": "success",
                    "data": paginated_data,
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total_count": total_count,
                        "total_pages": (total_count + per_page - 1) // per_page,
                        "has_prev": page > 1,
                        "has_next": end_idx < total_count
                    },
                    "sort": {
                        "field": sort_field,
                        "order": sort_order
                    },
                    "search": {
                        "term": search_term,
                        "criteria": search_criteria
                    },
                    "count": len(paginated_data),
                    "total_count": total_count
                }

            except Exception as e:
                return {
                    "error": f"Lỗi khi lấy danh sách dữ liệu: {str(e)}",
                    "message": "Không thể kết nối đến database"
                }, 500

    @sensors_ns.route('/sensor-data', methods=['POST'])
    class SensorDataAddResource(Resource):
        @sensors_ns.expect(sensor_data_model)
        @sensors_ns.doc('add_sensor_data',
                        description='Thêm dữ liệu cảm biến mới từ ESP32',
                        responses={
                            201: 'Thành công - Dữ liệu cảm biến đã được thêm',
                            400: 'Lỗi request - Thiếu trường bắt buộc',
                            500: 'Lỗi server - Không thể thêm dữ liệu vào database'
                        })
        def post(self):
            try:
                from flask import request
                from app.core.database import DatabaseManager
                from datetime import datetime

                data = request.get_json()

                required_fields = ['temperature', 'humidity', 'light']
                for field in required_fields:
                    if field not in data:
                        return {"error": f"Thiếu trường bắt buộc: {field}"}, 400

                if 'timestamp' not in data:
                    data['timestamp'] = datetime.now()

                db = DatabaseManager()
                result = db.insert_sensor_data(data)

                if result:
                    return {
                        "status": "success",
                        "message": "Dữ liệu cảm biến đã được thêm thành công",
                        "data": {
                            "id": result,
                            "temperature": data['temperature'],
                            "humidity": data['humidity'],
                            "light": data['light'],
                            "timestamp": data['timestamp']
                        }
                    }
                else:
                    return {"error": "Không thể thêm dữ liệu vào database"}, 500

            except Exception as e:
                return {
                    "error": f"Lỗi khi thêm dữ liệu: {str(e)}",
                    "message": "Không thể kết nối đến database"
                }, 500

    @sensors_ns.route('/led-control', methods=['POST'])
    class LEDControlResource(Resource):
        @sensors_ns.expect(led_control_model)
        @sensors_ns.doc('control_led',
                        description='Điều khiển LED qua MQTT',
                        responses={
                            200: 'Thành công - Lệnh điều khiển LED đã được gửi',
                            400: 'Lỗi request - Thiếu led_id hoặc action',
                            500: 'Lỗi server - Không thể gửi lệnh điều khiển'
                        })
        def post(self):
            try:
                from flask import request
                from app.services.led_control_service import LEDControlService

                data = request.get_json()
                led_id = data.get('led_id')
                action = data.get('action')

                if not led_id or not action:
                    return {"error": "led_id và action là bắt buộc"}, 400

                led_service = LEDControlService()
                result = led_service.send_led_command(led_id, action)

                if result:
                    return {
                        "status": "success",
                        "message": f"LED {led_id} đã được {action}",
                        "data": {"led_id": led_id, "action": action}
                    }
                else:
                    return {"error": "Không thể điều khiển LED"}, 500

            except Exception as e:
                return {"error": str(e)}, 500

    @sensors_ns.route('/led-status')
    class LEDStatusResource(Resource):
        @sensors_ns.doc('get_led_status',
                        description='Lấy trạng thái hiện tại của tất cả LED',
                        responses={
                            200: 'Thành công - Trả về trạng thái LED',
                            500: 'Lỗi server - Không thể lấy trạng thái LED'
                        })
        def get(self):
            try:
                from app.services.led_control_service import LEDControlService
                led_service = LEDControlService()

                status = {
                    "LED1": "OFF",
                    "LED2": "OFF",
                    "LED3": "OFF"
                }

                return {
                    "status": "success",
                    "data": status
                }

            except Exception as e:
                return {"error": str(e)}, 500

    @sensors_ns.route('/action-history')
    class ActionHistoryResource(Resource):
        @sensors_ns.doc('get_action_history',
                        description='Lấy lịch sử hành động điều khiển LED',
                        params={
                            'page': 'Số trang (mặc định: 1)',
                            'per_page': 'Số bản ghi mỗi trang (mặc định: 10)',
                            'limit': 'Giới hạn số bản ghi',
                            'sort_field': 'Trường sắp xếp (timestamp, led, state)',
                            'sort_order': 'Thứ tự sắp xếp (asc, desc)',
                            'search': 'Từ khóa tìm kiếm',
                            'device_filter': 'Lọc theo thiết bị (all, LED1, LED2, LED3)',
                            'state_filter': 'Lọc theo trạng thái (all, ON, OFF)'
                        },
                        responses={
                            200: 'Thành công - Trả về lịch sử hành động',
                            500: 'Lỗi server - Không thể lấy lịch sử hành động'
                        })
        def get(self):
            try:
                from flask import request
                from app.core.database import DatabaseManager

                page = int(request.args.get('page', 1))
                per_page = int(request.args.get('per_page', 10))
                sort_field = request.args.get('sort_field', 'timestamp')
                sort_order = request.args.get('sort_order', 'desc')
                search_term = request.args.get('search', '')
                device_filter = request.args.get('device_filter', 'all')
                state_filter = request.args.get('state_filter', 'all')
                limit = int(request.args.get('limit', 0))

                if limit > 0 and limit < per_page:
                    per_page = limit

                db = DatabaseManager()
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

                    if 'timestamp' in doc and hasattr(doc['timestamp'], 'isoformat'):
                        doc['timestamp'] = doc['timestamp'].isoformat()

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
                return {"status": "error", "message": str(e), "data": []}, 500

    @sensors_ns.route('/sensor-data/chart')
    class ChartDataResource(Resource):
        @sensors_ns.doc('get_chart_data',
                        description='Lấy dữ liệu cảm biến cho biểu đồ',
                        params={
                            'limit': 'Giới hạn số bản ghi (mặc định: 50, có thể là "all")',
                            'date': 'Ngày cụ thể (YYYY-MM-DD)',
                            'timePeriod': 'Khoảng thời gian (today, 1day, 2days)'
                        },
                        responses={
                            200: 'Thành công - Trả về dữ liệu cho biểu đồ',
                            500: 'Lỗi server - Không thể lấy dữ liệu biểu đồ'
                        })
        def get(self):
            try:
                from flask import request
                from app.core.database import DatabaseManager
                from app.core.timezone_utils import get_vietnam_timezone, create_vietnam_datetime

                limit_arg = request.args.get('limit', '50')
                date_str = request.args.get('date', None)
                time_period = request.args.get('timePeriod', None)

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

                db = DatabaseManager()
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
                        data.sort(key=lambda x: x.get('timestamp') or datetime.min)
                        if not is_all_data and limit and len(data) > limit:
                            data = data[-limit:]
                    except ValueError:
                        data = db.get_recent_data(limit=limit)
                        data.sort(key=lambda x: x.get('timestamp') or datetime.min)
                else:
                    if is_all_data:
                        data = db.get_recent_data(limit=None)
                    else:
                        data = db.get_recent_data(limit=limit)
                    data.sort(key=lambda x: x.get('timestamp') or datetime.min)

                for doc in data:
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])

                    if 'timestamp' in doc and hasattr(doc['timestamp'], 'isoformat'):
                        doc['timestamp'] = doc['timestamp'].isoformat()

                return data

            except Exception as e:
                return {"error": f"Lỗi khi lấy dữ liệu biểu đồ: {str(e)}"}, 500

    @sensors_ns.route('/available-dates')
    class AvailableDates(Resource):
        @sensors_ns.doc('get_available_dates',
                        description='Lấy danh sách các ngày có dữ liệu cảm biến',
                        responses={
                            200: 'Thành công',
                            500: 'Lỗi server'
                        })
        def get(self):
            try:
                db = DatabaseManager()
                collection = db.collection

                cursor = collection.find({}, {"timestamp": 1}).sort("timestamp", -1)
                data = list(cursor)

                available_dates = set()
                for item in data:
                    if 'timestamp' in item:
                        timestamp = item['timestamp']
                        if isinstance(timestamp, datetime):
                            date_str = timestamp.strftime("%Y-%m-%d")
                            available_dates.add(date_str)
                        elif isinstance(timestamp, str):
                            try:
                                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                date_str = dt.strftime("%Y-%m-%d")
                                available_dates.add(date_str)
                            except:
                                continue

                available_dates = sorted(list(available_dates), reverse=True)

                logger.info(f"Found {len(available_dates)} dates with sensor data")

                return {
                    "status": "success",
                    "data": available_dates,
                    "count": len(available_dates)
                }

            except Exception as e:
                logger.error(f"Error getting available dates: {e}")
                return {
                    "status": "error",
                    "message": str(e),
                    "data": []
                }, 500

    api.add_namespace(sensors_ns)

    app.register_blueprint(api_bp)

    @app.route('/')
    def serve_frontend():
        return send_from_directory('../frontend/public', 'home-page.html')

    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory('../frontend/public', filename)

    @app.route('/src/<path:filename>')
    def serve_src(filename):
        return send_from_directory('../frontend/src', filename)

    return app


def start_mqtt_receiver():
    mqtt_receiver = IoTMQTTReceiver()
    mqtt_receiver.start_receiving()


def main():
    app = create_app()

    use_reloader = True
    debug_mode = True

    try:
        debug_mode = app.config.get('DEBUG', True)
    except Exception:
        pass

    is_main_process = True
    if debug_mode:
        is_main_process = (os.environ.get('WERKZEUG_RUN_MAIN') == 'true')

    if is_main_process:
        mqtt_thread = threading.Thread(target=start_mqtt_receiver, daemon=True)
        mqtt_thread.start()

    app.run(host="0.0.0.0", port=5000, debug=debug_mode)


if __name__ == "__main__":
    main()
