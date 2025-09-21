import paho.mqtt.client as mqtt
import ssl
import threading
import time
from app.core.config import MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_USERNAME, MQTT_PASSWORD, MQTT_CONTROL_TOPIC
from app.core.logger_config import logger


class LEDControlService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.client = None
        self.is_connected = False
        self._initialized = True
        self._setup_persistent_connection()

    def _setup_persistent_connection(self):
        self.client = self._create_client()
        self._connect_to_broker()

    def _connect_to_broker(self):
        try:
            self.client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
            self.client.loop_start()

            timeout = 5
            elapsed = 0
            while not self.is_connected and elapsed < timeout:
                time.sleep(0.1)
                elapsed += 0.1

            if self.is_connected:
                logger.info("LED Control Service: Connected to MQTT broker")
            else:
                logger.error("LED Control Service: Failed to connect to MQTT broker")

        except Exception as e:
            logger.error(f"LED Control Service connection error: {e}")

    def _create_client(self):
        client = mqtt.Client()
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        client.tls_set_context(context)

        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect

        return client

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.is_connected = True
            logger.info("LED Control Service: MQTT Connected")
        else:
            self.is_connected = False
            logger.error(f"LED Control Service: MQTT Connection failed, rc={rc}")

    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False
        logger.warning("LED Control Service: MQTT Disconnected")
        threading.Thread(target=self._reconnect, daemon=True).start()

    def _reconnect(self):
        time.sleep(2)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if not self.is_connected:
                    self.client.reconnect()
                    break
            except Exception as e:
                logger.error(f"LED Control Service: Reconnect attempt {attempt + 1} failed: {e}")
                time.sleep(3)

    def send_led_command(self, led_id: str, action: str) -> bool:
        try:
            if not self.is_connected:
                logger.warning("LED Control Service: Not connected, scheduling background reconnect and returning False")
                threading.Thread(target=self._reconnect, daemon=True).start()
                return False

            mqtt_command = f"{led_id}_{action}"

            result = self.client.publish(MQTT_CONTROL_TOPIC, mqtt_command)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"LED Control: Command '{mqtt_command}' sent successfully")
                return True
            else:
                logger.error(f"LED Control: Failed to publish command, rc={result.rc}")
                return False

        except Exception as e:
            logger.error(f"LED Control Service error: {e}")
            return False
