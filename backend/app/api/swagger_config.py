from flask_restx import Api, fields
from flask import Blueprint

swagger_bp = Blueprint('swagger', __name__)

api = Api(
    swagger_bp,
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

multi_criteria_model = api.model('MultiCriteria', {
    'start_date': fields.String(description='Ngày bắt đầu (YYYY-MM-DD)', example='2024-01-01'),
    'end_date': fields.String(description='Ngày kết thúc (YYYY-MM-DD)', example='2024-01-31'),
    'temperature_min': fields.Float(description='Nhiệt độ tối thiểu'),
    'temperature_max': fields.Float(description='Nhiệt độ tối đa'),
    'humidity_min': fields.Float(description='Độ ẩm tối thiểu'),
    'humidity_max': fields.Float(description='Độ ẩm tối đa'),
    'light_min': fields.Float(description='Ánh sáng tối thiểu'),
    'light_max': fields.Float(description='Ánh sáng tối đa'),
    'text_search': fields.String(description='Từ khóa tìm kiếm text')
})

advanced_search_model = api.model('AdvancedSearch', {
    'query': fields.Raw(description='Query MongoDB'),
    'page': fields.Integer(description='Số trang', default=1),
    'per_page': fields.Integer(description='Số bản ghi mỗi trang', default=10),
    'sort_field': fields.String(description='Trường sắp xếp', default='timestamp'),
    'sort_order': fields.String(description='Thứ tự sắp xếp', enum=['asc', 'desc'], default='desc')
})

statistics_model = api.model('Statistics', {
    'temperature': fields.Raw(description='Thống kê nhiệt độ'),
    'humidity': fields.Raw(description='Thống kê độ ẩm'),
    'light': fields.Raw(description='Thống kê ánh sáng')
})

aggregated_data_model = api.model('AggregatedData', {
    '_id': fields.Raw(description='ID nhóm'),
    'avg_temperature': fields.Float(description='Nhiệt độ trung bình'),
    'avg_humidity': fields.Float(description='Độ ẩm trung bình'),
    'avg_light': fields.Float(description='Ánh sáng trung bình'),
    'count': fields.Integer(description='Số lượng bản ghi')
})

health_check_model = api.model('HealthCheck', {
    'database': fields.String(description='Trạng thái database', enum=['connected', 'disconnected']),
    'mqtt': fields.String(description='Trạng thái MQTT', enum=['connected', 'disconnected']),
    'timestamp': fields.String(description='Thời gian kiểm tra'),
    'version': fields.String(description='Phiên bản hệ thống')
})

system_info_model = api.model('SystemInfo', {
    'name': fields.String(description='Tên hệ thống'),
    'version': fields.String(description='Phiên bản'),
    'description': fields.String(description='Mô tả hệ thống'),
    'endpoints': fields.Raw(description='Danh sách endpoints'),
    'features': fields.List(fields.String, description='Các tính năng')
})

chart_data_model = api.model('ChartData', {
    'timestamp': fields.DateTime(description='Thời gian'),
    'temperature': fields.Float(description='Nhiệt độ'),
    'humidity': fields.Float(description='Độ ẩm'),
    'light': fields.Float(description='Ánh sáng')
})

export_data_model = api.model('ExportData', {
    'format': fields.String(description='Định dạng export', enum=['json', 'csv', 'xlsx']),
    'start_date': fields.String(description='Ngày bắt đầu'),
    'end_date': fields.String(description='Ngày kết thúc'),
    'fields': fields.List(fields.String, description='Các trường cần export')
})
