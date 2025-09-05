from pymongo import MongoClient
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.logger_config import logger
from app.core.config import MONGODB_CONNECTION_STRING, MONGODB_DB_NAME, MONGODB_COLLECTION_NAME


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

    def insert_data(self, data: Dict[str, Any]) -> Optional[object]:
        result_id = self.insert_sensor_data(data)
        if result_id:
            class InsertResult:
                def __init__(self, inserted_id):
                    self.inserted_id = inserted_id
            return InsertResult(result_id)
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

    def get_data_by_time_range(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        try:
            query = {
                "timestamp": {
                    "$gte": start_time,
                    "$lte": end_time
                }
            }
            cursor = self.collection.find(query).sort("timestamp", 1)
            data = list(cursor)

            logger.info(f"Retrieved {len(data)} records for time range {start_time} to {end_time}")
            return data

        except Exception as e:
            logger.error(f"Error retrieving data by time range: {e}")
            return []

    def get_filtered_data(self, query_filter: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        try:
            cursor = self.collection.find(query_filter).sort("timestamp", -1).limit(limit)
            data = list(cursor)

            logger.info(f"Retrieved {len(data)} filtered records with query: {query_filter}")
            return data

        except Exception as e:
            logger.error(f"Error retrieving filtered data: {e}")
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
