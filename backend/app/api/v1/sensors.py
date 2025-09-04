from flask import Blueprint, jsonify, request
from app.core.database import DatabaseManager
from datetime import datetime, timedelta

sensors_bp = Blueprint('sensors', __name__)
db = DatabaseManager()


@sensors_bp.route("/sensor-data-list")
def sensor_data_list():
    type_ = request.args.get('type', 'temperature')
    limit = int(request.args.get('limit', 5))

    data = db.get_recent_data(limit=limit)
    for doc in data:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])

    return jsonify(data)


@sensors_bp.route("/sensor-data")
def sensor_data():
    data = db.get_recent_data(limit=1)
    if data:
        doc = data[0]
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
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


@sensors_bp.route("/sensor-data/chart")
def chart_data():
    time_period = request.args.get('timePeriod', 'today')

    end_time = datetime.utcnow()

    if time_period == 'today':
        start_time = end_time.replace(hour=0, minute=0, second=0, microsecond=0)
    elif time_period == '1day':
        start_time = end_time - timedelta(days=1)
    elif time_period == '2days':
        start_time = end_time - timedelta(days=2)
    else:
        start_time = end_time.replace(hour=0, minute=0, second=0, microsecond=0)

    data = db.get_data_by_time_range(start_time, end_time)

    for doc in data:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])

    return jsonify(data)
