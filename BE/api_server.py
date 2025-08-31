from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
import logging
import json
from bson import ObjectId
import pytz

app = Flask(__name__)
CORS(app)

CONNECTION_STRING = "mongodb://localhost:27017/"
DB_NAME = "iot_database"
COLLECTION_NAME = "sensor_data"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    mongo_client = MongoClient(CONNECTION_STRING)
    db = mongo_client[DB_NAME]
    collection = db[COLLECTION_NAME]
except Exception as e:
    mongo_client = None


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.strftime('%a, %d %b %Y %H:%M:%S')
        return super(JSONEncoder, self).default(obj)


app.json_encoder = JSONEncoder


def get_current_time():
    vietnam_tz = pytz.timezone('Asia/Ho_Chi_Minh')
    return datetime.now(vietnam_tz).replace(tzinfo=None)


def normalize_timestamp(timestamp):
    if timestamp is None:
        return None

    if isinstance(timestamp, datetime):
        return timestamp

    return timestamp


@app.route('/api/sensor/latest', methods=['GET'])
def get_latest_sensor_data():
    try:
        if not mongo_client:
            return jsonify({"error": "Database connection failed"}), 500

        latest_record = collection.find_one(sort=[("timestamp", -1)])

        if not latest_record:
            return jsonify({
                "temperature": None,
                "humidity": None,
                "light": None,
                "timestamp": None,
                "status": "no_data",
                "message": "No data available"
            })

        current_time = get_current_time()
        data_timestamp = normalize_timestamp(latest_record.get('timestamp'))

        if data_timestamp:
            time_diff = (current_time - data_timestamp).total_seconds()
            is_recent = time_diff <= 30
            status = "online" if is_recent else "offline"
            offline_duration = int(time_diff) if not is_recent else 0
        else:
            status = "no_data"
            offline_duration = 0
            time_diff = None

        return jsonify({
            "temperature": latest_record.get('temperature'),
            "humidity": latest_record.get('humidity'),
            "light": latest_record.get('light'),
            "timestamp": latest_record.get('timestamp'),
            "device_id": latest_record.get('device_id', 'esp32_001'),
            "status": status,
            "offline_duration": offline_duration,
            "data_age_seconds": int(time_diff) if time_diff is not None else None,
            "current_time_vietnam": current_time,
            "data_timestamp_normalized": data_timestamp
        })

    except Exception as e:
        return jsonify({"error": "Internal server error", "status": "error"}), 500


@app.route('/api/sensor/history', methods=['GET'])
def get_sensor_history():
    try:
        if not mongo_client:
            return jsonify({"error": "Database connection failed"}), 500

        from flask import request
        period = request.args.get('period', 'today')

        now = get_current_time()
        end_time = None

        if period == 'all':
            start_time = datetime.min
            end_time = None
        elif period == 'today':
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = now
        elif period == '1day':
            yesterday = now - timedelta(days=1)
            start_time = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
        elif period == '2days':
            two_days_ago = now - timedelta(days=2)
            start_time = two_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=1)
        elif period == '7days':
            start_time = now - timedelta(days=7)
            end_time = None
        elif period == '30days':
            start_time = now - timedelta(days=30)
            end_time = None
        else:
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_time = now
        if end_time is not None:
            match_condition = {
                "timestamp": {
                    "$gte": start_time,
                    "$lt": end_time
                }
            }
        else:
            match_condition = {"timestamp": {"$gte": start_time}}

        cursor = collection.find(match_condition).sort("timestamp", 1)
        results = list(cursor)

        labels = []
        temperature_data = []
        humidity_data = []
        light_data = []

        for record in results:
            timestamp = record.get('timestamp')
            if timestamp:
                if period in ['today', '1day', '2days']:
                    labels.append(timestamp.strftime("%H:%M"))
                elif period in ['7days']:
                    labels.append(timestamp.strftime("%d/%m %H:%M"))
                elif period in ['30days', 'all']:
                    labels.append(timestamp.strftime("%d/%m"))
                else:
                    labels.append(timestamp.strftime("%d/%m %H:%M"))
            else:
                labels.append("")

            temp_val = record.get('temperature')
            hum_val = record.get('humidity')
            light_val = record.get('light')

            temperature_data.append(temp_val)
            humidity_data.append(hum_val)
            light_data.append(light_val)

        if not results:
            return jsonify({
                "labels": [],
                "temperature": [],
                "humidity": [],
                "light": [],
                "message": "No historical data available"
            })

        return jsonify({
            "labels": labels,
            "temperature": temperature_data,
            "humidity": humidity_data,
            "light": light_data,
            "period": period,
            "total_records": len(results),
            "data_type": "raw_values"
        })

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/sensor/all-data', methods=['GET'])
def get_all_sensor_data():
    try:
        if not mongo_client:
            return jsonify({"error": "Database connection failed"}), 500

        from flask import request
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 1000))
        skip = (page - 1) * limit

        total_records = collection.count_documents({})

        cursor = collection.find({}).sort("timestamp", -1).skip(skip).limit(limit)
        records = list(cursor)
        data = []
        labels = []
        temperature_data = []
        humidity_data = []
        light_data = []

        for record in records:
            timestamp = record.get('timestamp')
            if timestamp:
                labels.append(timestamp.strftime("%d/%m/%Y %H:%M"))
            else:
                labels.append("")

            temp = record.get('temperature', 0)
            hum = record.get('humidity', 0)
            light = record.get('light', 0)

            temperature_data.append(temp)
            humidity_data.append(hum)
            light_data.append(light)

            data.append({
                "timestamp": timestamp,
                "temperature": temp,
                "humidity": hum,
                "light": light,
                "device_id": record.get('device_id', 'unknown')
            })

        return jsonify({
            "data": data,
            "labels": labels,
            "temperature": temperature_data,
            "humidity": humidity_data,
            "light": light_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_records": total_records,
                "total_pages": (total_records + limit - 1) // limit,
                "has_next": page * limit < total_records,
                "has_prev": page > 1
            }
        })

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/sensor/latest-n', methods=['GET'])
def get_latest_n_sensor_data():
    try:
        if not mongo_client:
            return jsonify({"error": "Database connection failed"}), 500

        from flask import request
        limit = int(request.args.get('limit', 20))

        if limit > 1000:
            limit = 1000

        cursor = collection.find({}).sort("timestamp", -1).limit(limit)
        records = list(cursor)

        records.reverse()

        data = []
        labels = []
        temperature_data = []
        humidity_data = []
        light_data = []

        vietnam_tz = pytz.timezone('Asia/Ho_Chi_Minh')

        for record in records:
            timestamp = record.get('timestamp')
            if timestamp:
                if timestamp.tzinfo is None:
                    display_time = timestamp
                else:
                    display_time = timestamp.astimezone(vietnam_tz).replace(tzinfo=None)

                labels.append(display_time.strftime("%H:%M:%S"))
            else:
                labels.append("")

            temp = record.get('temperature')
            hum = record.get('humidity')
            light = record.get('light')

            temperature_data.append(temp)
            humidity_data.append(hum)
            light_data.append(light)

            data.append({
                "timestamp": timestamp,
                "temperature": temp,
                "humidity": hum,
                "light": light,
                "device_id": record.get('device_id', 'esp32_001')
            })

        current_time = get_current_time()
        most_recent_timestamp = records[-1].get('timestamp') if records else None

        data_age_seconds = 0
        if most_recent_timestamp:
            most_recent = normalize_timestamp(most_recent_timestamp)
            if most_recent:
                data_age_seconds = int((current_time - most_recent).total_seconds())

        return jsonify({
            "data": data,
            "labels": labels,
            "temperature": temperature_data,
            "humidity": humidity_data,
            "light": light_data,
            "total_records": len(records),
            "requested_limit": limit,
            "data_age_seconds": data_age_seconds,
            "timezone": "Asia/Ho_Chi_Minh (UTC+7)",
            "current_time_vietnam": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "oldest_entry": records[0].get('timestamp').strftime("%Y-%m-%d %H:%M:%S") if records else None,
            "newest_entry": records[-1].get('timestamp').strftime("%Y-%m-%d %H:%M:%S") if records else None
        })

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/sensor/connection-status', methods=['GET'])
def get_connection_status():
    try:
        if not mongo_client:
            return jsonify({"error": "Database connection failed"}), 500

        current_time = get_current_time()

        latest_record = collection.find_one(sort=[("timestamp", -1)])

        if not latest_record:
            return jsonify({
                "status": "no_data",
                "is_online": False,
                "last_seen": None,
                "offline_duration": 0,
                "device_id": "unknown",
                "message": "No sensor data found"
            })

        data_timestamp = normalize_timestamp(latest_record.get('timestamp'))
        device_id = latest_record.get('device_id', 'esp32_001')

        if data_timestamp:
            time_diff = (current_time - data_timestamp).total_seconds()
            is_online = time_diff <= 30

            yesterday = current_time - timedelta(days=1)
            total_records_24h = collection.count_documents({
                "timestamp": {"$gte": yesterday}
            })

            expected_records_24h = 24 * 60 * 12
            uptime_percentage = min((total_records_24h / expected_records_24h) * 100, 100) if expected_records_24h > 0 else 0

            return jsonify({
                "status": "online" if is_online else "offline",
                "is_online": is_online,
                "last_seen": data_timestamp,
                "offline_duration": int(time_diff) if not is_online else 0,
                "device_id": device_id,
                "uptime_24h_percent": round(uptime_percentage, 1),
                "total_records_24h": total_records_24h,
                "expected_records_24h": expected_records_24h,
                "data_age_seconds": int(time_diff),
                "current_time_vietnam": current_time
            })
        else:
            return jsonify({
                "status": "unknown",
                "is_online": False,
                "last_seen": None,
                "offline_duration": 0,
                "device_id": device_id,
                "message": "Invalid timestamp in latest record"
            })

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/sensor/stats', methods=['GET'])
def get_sensor_stats():
    try:
        if not mongo_client:
            return jsonify({"error": "Database connection failed"}), 500

        total_records = collection.count_documents({})

        today = get_current_time().replace(hour=0, minute=0, second=0, microsecond=0)
        today_records = collection.count_documents({"timestamp": {"$gte": today}})

        pipeline = [
            {"$match": {"timestamp": {"$gte": today}}},
            {"$group": {
                "_id": None,
                "avg_temperature": {"$avg": "$temperature"},
                "avg_humidity": {"$avg": "$humidity"},
                "avg_light": {"$avg": "$light"}
            }}
        ]

        avg_result = list(collection.aggregate(pipeline))
        averages = avg_result[0] if avg_result else {
            "avg_temperature": 0,
            "avg_humidity": 0,
            "avg_light": 0
        }

        return jsonify({
            "total_records": total_records,
            "today_records": today_records,
            "today_averages": {
                "temperature": round(averages["avg_temperature"], 1) if averages["avg_temperature"] else 0,
                "humidity": round(averages["avg_humidity"], 1) if averages["avg_humidity"] else 0,
                "light": round(averages["avg_light"], 1) if averages["avg_light"] else 0
            }
        })

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/led/control', methods=['POST'])
def control_led():
    try:
        from flask import request
        data = request.get_json()

        led_id = data.get('led_id')
        status = data.get('status')

        return jsonify({
            "success": True,
            "message": f"LED {led_id} turned {status}",
            "led_id": led_id,
            "status": status
        })

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        mongo_client.admin.command('ping')
        return jsonify({
            "status": "healthy",
            "mongodb": "connected",
            "timestamp": get_current_time().isoformat(),
            "timezone": "Asia/Ho_Chi_Minh (UTC+7)"
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "mongodb": "disconnected",
            "error": str(e),
            "timestamp": get_current_time().isoformat(),
            "timezone": "Asia/Ho_Chi_Minh (UTC+7)"
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
