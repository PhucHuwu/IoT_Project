from flask import Blueprint
from .v1.sensors import sensors_bp
from .v1.nosql_queries import nosql_bp

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

api_bp.register_blueprint(sensors_bp, url_prefix='/sensors')
api_bp.register_blueprint(nosql_bp, url_prefix='/nosql')
