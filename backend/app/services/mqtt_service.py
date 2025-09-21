import paho.mqtt.client as mqtt
import json
import ssl
import os
import time
from typing import Optional, Callable
from app.core.logger_config import logger
from app.core.config import MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_DATA_TOPIC, MQTT_USERNAME, MQTT_PASSWORD, MQTT_ACTION_HISTORY_TOPIC
from app.services.validation_service import DataValidator


class MQTTManager:

    def __init__(self, message_callback: Optional[Callable] = None, status_callback: Optional[Callable] = None):
        self.mqtt_client: Optional[mqtt.Client] = None
        self.message_callback = message_callback
        self.status_callback = status_callback
        self.is_connected = False
        self.setup_client()

    def setup_client(self):
        try:
            pid = os.getpid()
            ts = int(time.time())
            client_id = f"python_iot_receiver_{pid}_{ts}"
            self.mqtt_client = mqtt.Client(client_id=client_id)
            self._client_id = client_id
            self._reconnect_attempts = 0

            try:
                self.mqtt_client.enable_logger()
            except Exception:
                pass

            self.mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

            context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            self.mqtt_client.tls_set_context(context)

            try:
                self.mqtt_client.reconnect_delay_set(min_delay=1, max_delay=120)
            except Exception:
                pass

            self.mqtt_client.on_connect = self._on_connect
            self.mqtt_client.on_message = self._on_message
            self.mqtt_client.on_disconnect = self._on_disconnect
            self.mqtt_client.on_log = self._on_log

            logger.info(f"MQTT client initialized (client_id={client_id})")

        except Exception as e:
            logger.error(f"MQTT client initialization failed: {e}")
            raise

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.is_connected = True
            logger.info(f"Connected to MQTT broker: {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT} (client_id={getattr(self, '_client_id', 'unknown')})")

            client.subscribe(MQTT_DATA_TOPIC)
            logger.info(f"Subscribed to topic: {MQTT_DATA_TOPIC}")
            client.subscribe(MQTT_ACTION_HISTORY_TOPIC)
            logger.info(f"Subscribed to topic: {MQTT_ACTION_HISTORY_TOPIC}")

        else:
            self.is_connected = False
            logger.error(f"Failed to connect to MQTT broker, return code: {rc}")

    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False
        if rc != 0:
            self._reconnect_attempts += 1
            logger.warning(
                f"Unexpected MQTT disconnection (rc={rc}) (client_id={getattr(self, '_client_id', 'unknown')}). Will auto-reconnect (attempt={self._reconnect_attempts})")
        else:
            logger.info("Disconnected from MQTT broker")

    def _on_log(self, client, userdata, level, buf):
        try:
            logger.debug(f"paho-mqtt: level={level}, msg={buf}")
        except Exception:
            pass

    def _on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')

            logger.info(f"Received message on topic '{topic}': {payload}")

            if topic == MQTT_DATA_TOPIC:
                sensor_data = json.loads(payload)
                if not DataValidator.validate_sensor_data(sensor_data):
                    logger.warning(f"Invalid data received: {sensor_data}")
                    return
                if self.message_callback:
                    self.message_callback(sensor_data)
            elif topic == MQTT_ACTION_HISTORY_TOPIC:
                try:
                    status_data = json.loads(payload)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON status payload: {payload}")
                    return
                if self.status_callback:
                    self.status_callback(status_data)
            else:
                logger.debug(f"Unhandled topic received: {topic}")

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON data: {payload}, Error: {e}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")

    def connect(self) -> bool:
        try:
            logger.info(f"Connecting to MQTT broker {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}...")
            self.mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
            return True
        except Exception as e:
            logger.error(f"Error connecting to MQTT broker: {e}")
            return False

    def start_loop(self):
        try:
            logger.info("Starting MQTT message loop...")
            self.mqtt_client.loop_forever()
        except Exception as e:
            logger.error(f"Error in MQTT loop: {e}")
            raise

    def stop(self):
        try:
            if self.mqtt_client:
                self.mqtt_client.disconnect()
                self.is_connected = False
                logger.info("MQTT client disconnected")
        except Exception as e:
            logger.error(f"Error stopping MQTT client: {e}")

    def publish_message(self, topic: str, message: str) -> bool:
        try:
            if not self.is_connected:
                logger.warning("MQTT client not connected")
                return False

            result = self.mqtt_client.publish(topic, message)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Message published to topic '{topic}': {message}")
                return True
            else:
                logger.error(f"Failed to publish message, return code: {result.rc}")
                return False

        except Exception as e:
            logger.error(f"Error publishing message: {e}")
            return False
