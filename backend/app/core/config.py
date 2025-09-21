import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_CONNECTION_STRING = os.getenv('MONGODB_CONNECTION_STRING')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'iot_database')
MONGODB_COLLECTION_NAME = os.getenv('MONGODB_COLLECTION_NAME', 'sensor_data')

MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST')
MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', 8883))
MQTT_DATA_TOPIC = os.getenv('MQTT_DATA_TOPIC', 'esp32/iot/data')
MQTT_CONTROL_TOPIC = os.getenv('MQTT_CONTROL_TOPIC', 'esp32/iot/control')
MQTT_ACTION_HISTORY_TOPIC = os.getenv('MQTT_ACTION_HISTORY_TOPIC', 'esp32/iot/action-history')
MQTT_USERNAME = os.getenv('MQTT_USERNAME')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD')

TEMP_NORMAL_MIN = float(os.getenv('TEMP_NORMAL_MIN', 25.0))
TEMP_NORMAL_MAX = float(os.getenv('TEMP_NORMAL_MAX', 35.0))
TEMP_WARNING_MIN = float(os.getenv('TEMP_WARNING_MIN', 15.0))
TEMP_WARNING_MAX = float(os.getenv('TEMP_WARNING_MAX', 40.0))

HUMIDITY_NORMAL_MIN = float(os.getenv('HUMIDITY_NORMAL_MIN', 40.0))
HUMIDITY_NORMAL_MAX = float(os.getenv('HUMIDITY_NORMAL_MAX', 60.0))
HUMIDITY_WARNING_MIN = float(os.getenv('HUMIDITY_WARNING_MIN', 30.0))
HUMIDITY_WARNING_MAX = float(os.getenv('HUMIDITY_WARNING_MAX', 70.0))

LIGHT_NORMAL_MIN = float(os.getenv('LIGHT_NORMAL_MIN', 40.0))
LIGHT_NORMAL_MAX = float(os.getenv('LIGHT_NORMAL_MAX', 60.0))
LIGHT_WARNING_MIN = float(os.getenv('LIGHT_WARNING_MIN', 20.0))
LIGHT_WARNING_MAX = float(os.getenv('LIGHT_WARNING_MAX', 80.0))

API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', 5000))
DEBUG_MODE = os.getenv('DEBUG_MODE', 'False').lower() in ('true', '1', 'yes', 'on')


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = DEBUG_MODE
