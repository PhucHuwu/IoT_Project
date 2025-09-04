from pymongo import MongoClient
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from logger_config import logger
from config import MONGODB_CONNECTION_STRING, MONGODB_DB_NAME, MONGODB_COLLECTION_NAME


class DatabaseManager:

    def __init__(self):
        self.mongo_client: Optional[MongoClient] = None
        self.db = None
        self.collection = None
        self.connect()

    def connect(self) -> bool:
        try:
            self.mongo_client = MongoClient(
                MONGODB_CONNECTION_STRING,
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
                socketTimeoutMS=10000
            )
            self.db = self.mongo_client[MONGODB_DB_NAME]
            self.collection = self.db[MONGODB_COLLECTION_NAME]

            self.mongo_client.admin.command('ping')
            logger.info("Connected to MongoDB successfully")
            return True

        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            return False

    def insert_sensor_data(self, sensor_data: Dict[str, Any]) -> Optional[str]:
        try:
            if 'timestamp' not in sensor_data:
                sensor_data['timestamp'] = datetime.now(timezone.utc)

            result = self.collection.insert_one(sensor_data)
            logger.info(f"Data stored in MongoDB with ID: {result.inserted_id}")

            logger.info(f"Temperature: {sensor_data.get('temperature')}°C, "
                        f"Humidity: {sensor_data.get('humidity')}%, "
                        f"Light: {sensor_data.get('light')}%")

            return str(result.inserted_id)

        except Exception as e:
            logger.error(f"Error inserting sensor data: {e}")
            return None

    def get_recent_data(self, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            cursor = self.collection.find().sort("timestamp", -1).limit(limit)
            data = list(cursor)

            logger.info(f"Retrieved {len(data)} recent records")
            return data

        except Exception as e:
            logger.error(f"Error retrieving data: {e}")
            return []

    def close_connection(self):
        try:
            if self.mongo_client:
                self.mongo_client.close()
                logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")

    def is_connected(self) -> bool:
        try:
            if self.mongo_client:
                self.mongo_client.admin.command('ping')
                return True
        except:
            pass
        return False
