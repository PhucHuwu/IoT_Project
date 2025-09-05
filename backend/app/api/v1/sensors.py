from flask import Blueprint, jsonify, request
from app.core.database import DatabaseManager
from datetime import datetime, timedelta, timezone
from app.core.logger_config import logger
from app.services.led_control_service import LEDControlService

sensors_bp = Blueprint('sensors', __name__)
db = DatabaseManager()
led_service = LEDControlService()


@sensors_bp.route("/sensor-data-list")
def sensor_data_list():
    try:
        limit = int(request.args.get('limit', 5))
        time_period = request.args.get('timePeriod', None)

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
                    start_date = datetime.strptime(date_from, '%Y-%m-%d').replace(
                        hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
                    )
                    timestamp_filter['$gte'] = start_date
                except ValueError:
                    pass

            if date_to:
                try:
                    end_date = datetime.strptime(date_to, '%Y-%m-%d').replace(
                        hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc
                    )
                    timestamp_filter['$lte'] = end_date
                except ValueError:
                    pass

            if timestamp_filter:
                query_filter['timestamp'] = timestamp_filter

        elif time_period:
            end_time = datetime.now(timezone.utc)
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

        if query_filter:
            data = db.get_filtered_data(query_filter, limit=limit)
        else:
            data = db.get_recent_data(limit=limit)

        for doc in data:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])

        logger.info(f"Returned {len(data)} sensor data records")

        return jsonify({
            "status": "success",
            "data": data,
            "count": len(data)
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
    time_period = request.args.get('timePeriod', None)
    date_str = request.args.get('date', None)

    end_time = datetime.now(timezone.utc)

    if date_str:
        try:
            vn_tz = timezone(timedelta(hours=7))

            selected_date_local = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=vn_tz)

            start_time = selected_date_local.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
            end_time = selected_date_local.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(timezone.utc)

        except ValueError:
            start_time = end_time.replace(hour=0, minute=0, second=0, microsecond=0)
    elif time_period == 'today':
        start_time = end_time.replace(hour=0, minute=0, second=0, microsecond=0)
    elif time_period == '1day':
        start_time = end_time - timedelta(days=1)
    elif time_period == '2days':
        start_time = end_time - timedelta(days=2)
    else:
        start_time = end_time.replace(hour=0, minute=0, second=0, microsecond=0)

    data = db.get_data_by_time_range(start_time, end_time)

    logger.info(f"Chart data request - date_str: {date_str}, time_period: {time_period}")
    logger.info(f"Query time range: {start_time} to {end_time}")
    logger.info(f"Found {len(data)} records")

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
