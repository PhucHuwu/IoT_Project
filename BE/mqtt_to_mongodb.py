import paho.mqtt.client as mqtt
import json
from datetime import datetime
import ssl
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, DuplicateKeyError
import logging

BROKER_HOST = "9b88959e8c674540989f6ed6cf143c4d.s1.eu.hivemq.cloud"
BROKER_PORT = 8883
DATA_TOPIC = "esp32/iot/data"
USERNAME = "PhucHuwu"
PASSWORD = "Phuc3724@"

CONNECTION_STRING = "mongodb://localhost:27017/"
DB_NAME = "iot_database"
COLLECTION_NAME = "sensor_data"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MQTTToMongoDB:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.username_pw_set(USERNAME, PASSWORD)
        self.connected = False

        context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        self.client.tls_set_context(context)

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message

        self.mongo_client = None
        self.db = None
        self.collection = None
        self.init_mongodb()

    def init_mongodb(self):
        try:
            self.mongo_client = MongoClient(CONNECTION_STRING)
            self.mongo_client.admin.command('ping')

            self.db = self.mongo_client[DB_NAME]
            self.collection = self.db[COLLECTION_NAME]

            self.collection.create_index("timestamp")

            logger.info("Connected to MongoDB successfully")
            return True
        except ConnectionFailure as e:
            logger.error(f"MongoDB connection error: {e}")
            return False
        except Exception as e:
            logger.error(f"MongoDB initialization error: {e}")
            return False

    def on_connect(self, client, userdata, flags, return_code):
        if return_code == 0:
            if not self.connected:
                logger.info("Connected to MQTT Broker")
                self.connected = True
            self.client.subscribe(DATA_TOPIC)
        else:
            logger.error(f"Connection failed, return code: {return_code}")

    def on_disconnect(self, client, userdata, return_code):
        if self.connected:
            logger.info("Disconnected from MQTT Broker")
            self.connected = False

    def save_to_mongodb(self, data):
        try:
            document = {
                "timestamp": datetime.now(),
                "temperature": data.get('temperature'),
                "humidity": data.get('humidity'),
                "light": data.get('light'),
                "device_id": data.get('device_id', 'esp32_001'),
                "created_at": datetime.now().isoformat()
            }

            result = self.collection.insert_one(document)

            logger.info(f"Data saved successfully - ID: {result.inserted_id}")
            logger.info(f"Data: Temperature={document['temperature']}°C, "
                        f"Humidity={document['humidity']}%, Light={document['light']}%")

            return True
        except Exception as e:
            logger.error(f"Error saving data to MongoDB: {e}")
            return False

    def on_message(self, client, userdata, message):
        timestamp = datetime.now().strftime('%d-%m-%Y %H:%M:%S')
        topic = message.topic
        payload = message.payload.decode('utf-8')

        if topic == DATA_TOPIC:
            try:
                data = json.loads(payload)

                if self.validate_data(data):
                    if self.save_to_mongodb(data):
                        logger.info(f"[{timestamp}] Data processed and saved successfully")
                    else:
                        logger.error(f"[{timestamp}] Error saving data")
                else:
                    logger.warning(f"[{timestamp}] Invalid data: {payload}")

            except json.JSONDecodeError:
                logger.error(f"[{timestamp}] JSON decode error: {payload}")

    def validate_data(self, data):
        required_fields = ['temperature', 'humidity', 'light']

        for field in required_fields:
            if field not in data:
                logger.warning(f"Missing required field: {field}")
                return False

            if not isinstance(data[field], (int, float)):
                logger.warning(f"Invalid data type for {field}: {type(data[field])}")
                return False

        if not (-50 <= data['temperature'] <= 100):
            logger.warning(f"Temperature out of range: {data['temperature']}")
            return False

        if not (0 <= data['humidity'] <= 100):
            logger.warning(f"Humidity out of range: {data['humidity']}")
            return False

        if not (0 <= data['light'] <= 100):
            logger.warning(f"Light out of range: {data['light']}")
            return False

        return True

    def connect(self):
        try:
            logger.info(f"Connecting to MQTT broker: {BROKER_HOST}:{BROKER_PORT}")
            self.client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
            return True
        except Exception as error:
            logger.error(f"MQTT broker connection error: {error}")
            return False

    def start(self):
        if not self.mongo_client:
            logger.error("Cannot connect to MongoDB. Stopping program.")
            return

        if self.connect():
            try:
                logger.info("Starting MQTT listener and saving to MongoDB...")
                self.client.loop_forever()
            except KeyboardInterrupt:
                logger.info("Stopping program...")
                self.cleanup()
        else:
            logger.error("Cannot connect to MQTT broker")

    def cleanup(self):
        if self.client:
            self.client.disconnect()

        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB connection closed")

    def get_latest_records(self, limit=10):
        try:
            records = list(self.collection.find().sort("timestamp", -1).limit(limit))
            return records
        except Exception as e:
            logger.error(f"Error retrieving data from MongoDB: {e}")
            return []

    def get_statistics(self):
        try:
            total_records = self.collection.count_documents({})

            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_records = self.collection.count_documents({"timestamp": {"$gte": today}})

            pipeline = [
                {"$group": {
                    "_id": None,
                    "avg_temperature": {"$avg": "$temperature"},
                    "avg_humidity": {"$avg": "$humidity"},
                    "avg_light": {"$avg": "$light"}
                }}
            ]

            avg_result = list(self.collection.aggregate(pipeline))

            stats = {
                "total_records": total_records,
                "today_records": today_records,
                "averages": avg_result[0] if avg_result else None
            }

            return stats
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return None


def main():
    logger.info("Starting MQTT to MongoDB program...")

    mqtt_mongodb = MQTTToMongoDB()

    try:
        mqtt_mongodb.start()
    except Exception as e:
        logger.error(f"Error in main program: {e}")
    finally:
        mqtt_mongodb.cleanup()


if __name__ == "__main__":
    main()
