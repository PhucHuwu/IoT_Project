from flask_restx import Api, fields
from flask import Blueprint

swagger_bp = Blueprint('swagger', __name__)

api = Api(
    swagger_bp,
    version='1.0',
    title='IoT Monitoring System API',
    description='API REST cho hệ thống giám sát IoT với các chức năng quản lý dữ liệu cảm biến, điều khiển LED, phân trang, sắp xếp và tìm kiếm dữ liệu',
    doc='/docs/',
    prefix='/api/v1'
)

sensors_ns = api.namespace('sensors', description='API quản lý dữ liệu cảm biến, điều khiển LED, phân trang, sắp xếp và tìm kiếm')

sensor_data_model = api.model('SensorData', {
    'temperature': fields.Float(required=True, description='Nhiệt độ (Celsius)', example=25.5),
    'humidity': fields.Float(required=True, description='Độ ẩm (%)', example=60.2),
    'light': fields.Float(required=True, description='Ánh sáng (%)', example=45.8),
    'timestamp': fields.DateTime(description='Thời gian (ISO 8601)', example='2024-01-15T10:30:00+07:00')
})

sensor_data_response_model = api.model('SensorDataResponse', {
    'temperature': fields.Float(description='Nhiệt độ (Celsius)'),
    'humidity': fields.Float(description='Độ ẩm (%)'),
    'light': fields.Float(description='Ánh sáng (%)'),
    'timestamp': fields.DateTime(description='Thời gian'),
    '_id': fields.String(description='MongoDB ObjectId'),
    'sensor_statuses': fields.Raw(description='Trạng thái các cảm biến'),
    'overall_status': fields.Raw(description='Trạng thái tổng thể')
})

led_control_model = api.model('LEDControl', {
    'led_id': fields.String(required=True, description='ID của LED', enum=['LED1', 'LED2', 'LED3'], example='LED1'),
    'action': fields.String(required=True, description='Hành động', enum=['ON', 'OFF'], example='ON')
})

led_status_model = api.model('LEDStatus', {
    'LED1': fields.String(description='Trạng thái LED1', enum=['ON', 'OFF']),
    'LED2': fields.String(description='Trạng thái LED2', enum=['ON', 'OFF']),
    'LED3': fields.String(description='Trạng thái LED3', enum=['ON', 'OFF'])
})

action_history_model = api.model('ActionHistory', {
    'type': fields.String(description='Loại hành động'),
    'led': fields.String(description='ID LED'),
    'state': fields.String(description='Trạng thái'),
    'timestamp': fields.DateTime(description='Thời gian'),
    '_id': fields.String(description='MongoDB ObjectId')
})

pagination_model = api.model('Pagination', {
    'page': fields.Integer(description='Số trang hiện tại'),
    'per_page': fields.Integer(description='Số bản ghi mỗi trang'),
    'total_count': fields.Integer(description='Tổng số bản ghi'),
    'total_pages': fields.Integer(description='Tổng số trang'),
    'has_prev': fields.Boolean(description='Có trang trước'),
    'has_next': fields.Boolean(description='Có trang sau')
})

sort_model = api.model('Sort', {
    'field': fields.String(description='Trường sắp xếp'),
    'order': fields.String(description='Thứ tự sắp xếp', enum=['asc', 'desc'])
})

search_model = api.model('Search', {
    'term': fields.String(description='Từ khóa tìm kiếm'),
    'criteria': fields.String(description='Tiêu chí tìm kiếm')
})

success_response_model = api.model('SuccessResponse', {
    'status': fields.String(description='Trạng thái', example='success'),
    'data': fields.Raw(description='Dữ liệu trả về'),
    'pagination': fields.Nested(pagination_model, description='Thông tin phân trang'),
    'sort': fields.Nested(sort_model, description='Thông tin sắp xếp'),
    'search': fields.Nested(search_model, description='Thông tin tìm kiếm'),
    'count': fields.Integer(description='Số bản ghi trong response'),
    'total_count': fields.Integer(description='Tổng số bản ghi')
})

error_response_model = api.model('ErrorResponse', {
    'status': fields.String(description='Trạng thái', example='error'),
    'message': fields.String(description='Thông báo lỗi'),
    'data': fields.List(fields.Raw, description='Dữ liệu lỗi')
})

chart_data_model = api.model('ChartData', {
    'timestamp': fields.DateTime(description='Thời gian'),
    'temperature': fields.Float(description='Nhiệt độ'),
    'humidity': fields.Float(description='Độ ẩm'),
    'light': fields.Float(description='Ánh sáng')
})
