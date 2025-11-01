from typing import Dict, Any
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from app.core.database import DatabaseManager
from app.services.mqtt_service import MQTTManager
from app.core.logger_config import logger
from app.core.timezone_utils import get_current_vietnam_time


class IoTMQTTReceiver:

    def __init__(self):
        self.db_manager = DatabaseManager()
        self.mqtt_manager = MQTTManager(message_callback=self.process_sensor_data, status_callback=self.process_action_status)
        self._executor = ThreadPoolExecutor(max_workers=4)

    def process_sensor_data(self, sensor_data: Dict[str, Any]):
        try:
            document_id = self.db_manager.insert_sensor_data(sensor_data)

            if document_id:
                logger.info(f"Sensor data processed successfully: {document_id}")
            else:
                logger.error("Failed to store sensor data in database")

        except Exception as e:
            logger.error(f"Error processing sensor data: {e}")

    def process_action_status(self, status_data: Dict[str, Any]):
        try:
            current_time = get_current_vietnam_time()
            logger.info(f"process_action_status received at {current_time.isoformat()}: {status_data}")
            if not isinstance(status_data, dict):
                logger.warning(f"Invalid status data type: {status_data}")
                return

            led = status_data.get('led')
            state = status_data.get('state')
            if not led or not state:
                logger.warning(f"Missing led/state in status message: {status_data}")
                return

            logger.info(f"LED status message validated: {led}={state}. LEDControlService will handle database storage.")

        except Exception as e:
            logger.error(f"Error processing action status: {e}")

    def start_receiving(self):
        try:
            if not self.db_manager.is_connected():
                logger.error("Database not connected. Cannot start receiver.")
                return False

            if not self.mqtt_manager.connect():
                logger.error("Failed to connect to MQTT broker")
                return False

            self.mqtt_manager.start_loop()
            return True

        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt. Stopping...")
            self.stop()
            return False
        except Exception as e:
            logger.error(f"Error starting receiver: {e}")
            return False

    def stop(self):
        try:
            self.mqtt_manager.stop()
            self.db_manager.close_connection()
            logger.info("IoT MQTT Receiver stopped successfully")
        except Exception as e:
            logger.error(f"Error stopping receiver: {e}")

    def get_recent_data(self, limit: int = 10):
        try:
            data = self.db_manager.get_recent_data(limit)

            if not data:
                logger.info("No data found in database")
                return []

            logger.info(f"Retrieved {len(data)} recent records")
            for record in data:
                logger.info(f"[{record['timestamp']}] "
                            f"T: {record['temperature']}°C, "
                            f"H: {record['humidity']}%, "
                            f"L: {record['light']}%")

            return data

        except Exception as e:
            logger.error(f"Error retrieving recent data: {e}")
            return []


def main():
    receiver = None

    try:
        receiver = IoTMQTTReceiver()

        logger.info("=== Recent Sensor Data ===")
        receiver.get_recent_data(5)

        logger.info("=== Starting MQTT Receiver ===")
        logger.info("Press Ctrl+C to stop...")

        receiver.start_receiving()

    except Exception as e:
        logger.error(f"Application error: {e}")

    finally:
        if receiver:
            receiver.stop()


if __name__ == "__main__":
    main()
