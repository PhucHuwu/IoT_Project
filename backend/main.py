from app.api.routes import api_bp
from app.services.data_service import IoTMQTTReceiver
from app.core.config import Config
from flask import Flask
from flask_cors import CORS
import threading
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))


sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=["*"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    app.register_blueprint(api_bp)

    return app


def start_mqtt_receiver():
    mqtt_receiver = IoTMQTTReceiver()
    mqtt_receiver.start_receiving()


def main():
    app = create_app()

    mqtt_thread = threading.Thread(target=start_mqtt_receiver, daemon=True)
    mqtt_thread.start()

    app.run(host="0.0.0.0", port=5001, debug=True)


if __name__ == "__main__":
    main()
