from flask import Flask, jsonify
from flask_cors import CORS
from database import DatabaseManager


app = Flask(__name__)
CORS(app)
db = DatabaseManager()


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
    app.run(host="0.0.0.0", port=5001)
