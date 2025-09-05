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
        else:
            self.is_connected = False

    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False

    def send_led_command(self, led_id: str, action: str) -> bool:
        try:
            mqtt_command = f"{led_id}_{action}"

            client = self._create_client()

            # Kết nối
            client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)

            timeout = 3
            elapsed = 0
            while not self.is_connected and elapsed < timeout:
                client.loop(timeout=0.1)
                time.sleep(0.1)
                elapsed += 0.1

            if self.is_connected:
                result = client.publish(MQTT_CONTROL_TOPIC, mqtt_command)
                client.loop(timeout=0.5)  # Đảm bảo message được gửi

                # Ngắt kết nối
                client.disconnect()

                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    logger.info(f"LED Control: Command '{mqtt_command}' sent successfully")
                    return True
                else:
                    logger.error(f"LED Control: Failed to publish command, rc={result.rc}")
                    return False
            else:
                client.disconnect()
                logger.error("LED Control: Failed to connect to MQTT broker")
                return False

        except Exception as e:
            logger.error(f"LED Control Service error: {e}")
            return False
