from flask import Blueprint
from .v1.sensors import sensors_bp

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

api_bp.register_blueprint(sensors_bp, url_prefix='/sensors')
