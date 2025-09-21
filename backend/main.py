from app.api.routes import api_bp
from app.services.data_service import IoTMQTTReceiver
from app.core.config import Config
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
        description='API REST cho hệ thống giám sát IoT với các chức năng quản lý dữ liệu cảm biến, điều khiển LED và truy vấn dữ liệu',
        doc='/docs/',
        prefix='/api/v1'
    )

    sensors_ns = api.namespace('sensors', description='Quản lý dữ liệu cảm biến và điều khiển LED')
    nosql_ns = api.namespace('nosql', description='Truy vấn NoSQL và thống kê dữ liệu')

    sensor_data_model = api.model('SensorData', {
        'temperature': fields.Float(required=True, description='Nhiệt độ (Celsius)', example=25.5),
        'humidity': fields.Float(required=True, description='Độ ẩm (%)', example=60.2),
        'light': fields.Float(required=True, description='Ánh sáng (%)', example=45.8),
        'timestamp': fields.DateTime(description='Thời gian (ISO 8601)', example='2024-01-15T10:30:00+07:00')
    })

    success_response_model = api.model('SuccessResponse', {
        'status': fields.String(description='Trạng thái', example='success'),
        'data': fields.Raw(description='Dữ liệu trả về'),
        'message': fields.String(description='Thông báo')
    })

    @sensors_ns.route('/test')
    class SensorTestResource(Resource):
        @sensors_ns.doc('test_sensor', description='Test endpoint cho sensors')
        @sensors_ns.marshal_with(success_response_model)
        def get(self):
            return {
                "status": "success",
                "data": {"message": "Sensors API hoạt động bình thường!"},
                "message": "Test thành công"
            }

    @nosql_ns.route('/test')
    class NoSQLTestResource(Resource):
        @nosql_ns.doc('test_nosql', description='Test endpoint cho nosql')
        @nosql_ns.marshal_with(success_response_model)
        def get(self):
            return {
                "status": "success",
                "data": {"message": "NoSQL API hoạt động bình thường!"},
                "message": "Test thành công"
            }

    @sensors_ns.route('/sensor-data')
    class SensorDataResource(Resource):
        @sensors_ns.doc('get_latest_sensor_data', description='Lấy dữ liệu cảm biến mới nhất')
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
    
    @sensors_ns.route('/sensor-data/list')
    class SensorDataListResource(Resource):
        @sensors_ns.doc('get_sensor_data_list', description='Lấy danh sách dữ liệu cảm biến với phân trang')
        def get(self):
            try:
                from flask import request
                from app.core.database import DatabaseManager
                
                page = int(request.args.get('page', 1))
                per_page = int(request.args.get('per_page', 10))
                limit = request.args.get('limit', '10')
                
                db = DatabaseManager()
                
                if limit == 'all':
                    data = db.get_recent_data(limit=None)
                else:
                    try:
                        limit_int = int(limit)
                        data = db.get_recent_data(limit=limit_int)
                    except ValueError:
                        data = db.get_recent_data(limit=10)
                
                total_count = len(data)
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_data = data[start_idx:end_idx]
                
                for doc in paginated_data:
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])
                
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
                    "count": len(paginated_data),
                    "total_count": total_count
                }
                
            except Exception as e:
                return {
                    "error": f"Lỗi khi lấy danh sách dữ liệu: {str(e)}",
                    "message": "Không thể kết nối đến database"
                }, 500
    
    @sensors_ns.route('/sensor-data/add')
    class SensorDataAddResource(Resource):
        @sensors_ns.expect(sensor_data_model)
        @sensors_ns.doc('add_sensor_data', description='Thêm dữ liệu cảm biến mới')
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
    
    led_control_model = api.model('LEDControl', {
        'led_id': fields.String(required=True, description='ID của LED', enum=['LED1', 'LED2', 'LED3'], example='LED1'),
        'action': fields.String(required=True, description='Hành động', enum=['ON', 'OFF'], example='ON')
    })

    @sensors_ns.route('/led/control')
    class LEDControlResource(Resource):
        @sensors_ns.expect(led_control_model)
        @sensors_ns.doc('control_led', description='Điều khiển LED')
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

    @sensors_ns.route('/led/status')
    class LEDStatusResource(Resource):
        @sensors_ns.doc('get_led_status', description='Lấy trạng thái tất cả LED')
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

    api.add_namespace(sensors_ns)
    api.add_namespace(nosql_ns)

    system_ns = api.namespace('system', description='Thông tin hệ thống và health check')

    @system_ns.route('/health')
    class HealthResource(Resource):
        @system_ns.doc('health_check', description='Kiểm tra trạng thái hệ thống')
        def get(self):
            try:
                from app.core.database import DatabaseManager
                db = DatabaseManager()

                try:
                    db.mongo_client.admin.command('ping')
                    db_status = "connected"
                except:
                    db_status = "disconnected"

                from app.services.led_control_service import LEDControlService
                led_service = LEDControlService()
                mqtt_status = "connected" if led_service.is_connected else "disconnected"

                return {
                    "status": "success",
                    "data": {
                        "database": db_status,
                        "mqtt": mqtt_status,
                        "timestamp": datetime.now().isoformat(),
                        "version": "1.0.0"
                    }
                }
            except Exception as e:
                return {
                    "status": "error",
                    "message": str(e)
                }, 500

    @system_ns.route('/info')
    class InfoResource(Resource):
        @system_ns.doc('system_info', description='Thông tin chi tiết về hệ thống')
        def get(self):
            return {
                "status": "success",
                "data": {
                    "name": "IoT Monitoring System",
                    "version": "1.0.0",
                    "description": "Hệ thống giám sát IoT với các chức năng quản lý dữ liệu cảm biến, điều khiển LED và truy vấn dữ liệu",
                    "endpoints": {
                        "sensors": "/api/v1/sensors/",
                        "nosql": "/api/v1/nosql/",
                        "system": "/api/v1/system/",
                        "docs": "/docs/"
                    },
                    "features": [
                        "Thu thập dữ liệu cảm biến từ ESP32",
                        "Điều khiển LED qua MQTT",
                        "Truy vấn dữ liệu NoSQL",
                        "Thống kê và phân tích dữ liệu",
                        "API documentation với Swagger"
                    ]
                }
            }

    api.add_namespace(system_ns)

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
