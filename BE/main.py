from flask import Flask, jsonify, request
from flask_cors import CORS
from database import DatabaseManager
from iot_receiver import IoTMQTTReceiver
import threading

app = Flask(__name__)
CORS(app)
db = DatabaseManager()


@app.route("/api/sensor-data-list")
def sensor_data_list():
    type_ = request.args.get('type', 'temperature')
    limit = int(request.args.get('limit', 5))
    data = db.get_recent_data(limit=limit)
    for doc in data:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
    return jsonify(data)


@app.route("/api/sensor-data")
def sensor_data():
    data = db.get_recent_data(limit=1)
    if data:
        doc = data[0]
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
        return jsonify(doc)
    return jsonify({})


if __name__ == "__main__":
    mqtt_receiver = IoTMQTTReceiver()
    t = threading.Thread(target=mqtt_receiver.start_receiving, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=5001)
