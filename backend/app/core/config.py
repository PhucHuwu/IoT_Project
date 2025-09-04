import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_CONNECTION_STRING = os.getenv('MONGODB_CONNECTION_STRING')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'iot_database')
MONGODB_COLLECTION_NAME = os.getenv('MONGODB_COLLECTION_NAME', 'sensor_data')

MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST')
MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', 8883))
MQTT_DATA_TOPIC = os.getenv('MQTT_DATA_TOPIC', 'esp32/iot/data')
MQTT_USERNAME = os.getenv('MQTT_USERNAME')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD')

TEMP_HIGH_THRESHOLD = float(os.getenv('TEMP_HIGH_THRESHOLD', 35.0))
TEMP_LOW_THRESHOLD = float(os.getenv('TEMP_LOW_THRESHOLD', 0.0))
HUMIDITY_HIGH_THRESHOLD = float(os.getenv('HUMIDITY_HIGH_THRESHOLD', 80.0))
HUMIDITY_LOW_THRESHOLD = float(os.getenv('HUMIDITY_LOW_THRESHOLD', 20.0))
LIGHT_LOW_THRESHOLD = float(os.getenv('LIGHT_LOW_THRESHOLD', 100.0))

API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', 5000))
DEBUG_MODE = os.getenv('DEBUG_MODE', 'False').lower() in ('true', '1', 'yes', 'on')


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = DEBUG_MODE
