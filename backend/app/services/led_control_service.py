import paho.mqtt.client as mqtt
import ssl
import threading
import time
from datetime import datetime
from typing import Dict, Optional
from app.core.config import MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_USERNAME, MQTT_PASSWORD, MQTT_CONTROL_TOPIC, MQTT_ACTION_HISTORY_TOPIC
from app.core.logger_config import logger
from app.core.database import DatabaseManager


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
        self.db_manager = DatabaseManager()
        self.led_states = {
            'LED1': 'OFF',
            'LED2': 'OFF',
            'LED3': 'OFF',
            'LED4': 'OFF'
        }
        self.pending_commands = {}
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
        client.on_message = self._on_message

        return client

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.is_connected = True
            logger.info("LED Control Service: MQTT Connected")
            client.subscribe(MQTT_ACTION_HISTORY_TOPIC)
            logger.info(f"LED Control Service: Subscribed to {MQTT_ACTION_HISTORY_TOPIC}")
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

    def _on_message(self, client, userdata, msg):
        try:
            import json
            topic = msg.topic
            payload = msg.payload.decode('utf-8')

            if topic == MQTT_ACTION_HISTORY_TOPIC:
                status_data = json.loads(payload)
                self._handle_led_status_confirmation(status_data)

        except Exception as e:
            logger.error(f"LED Control Service: Error processing message: {e}")

    def _handle_led_status_confirmation(self, status_data: Dict):
        try:
            led = status_data.get('led')
            state = status_data.get('state')
            msg_type = status_data.get('type')

            if msg_type == 'led_status' and led and state:
                logger.info(f"LED Control Service: Received confirmation for {led} = {state}")

                if led in self.led_states:
                    self.led_states[led] = state

                    if led in self.pending_commands:
                        del self.pending_commands[led]
                        logger.info(f"LED Control Service: Removed pending command for {led}")

                    from app.core.timezone_utils import get_vietnam_timezone
                    from datetime import datetime
                    
                    action_record = {
                        'type': 'led_status',
                        'led': led,
                        'action': f"{led}_{state}",
                        'state': state,
                        'timestamp': datetime.now(get_vietnam_timezone()),
                        'device': led,
                        'description': f"Điều khiển {led} {state}"
                    }
                    self.db_manager.save_action_history(action_record)
                    logger.info(f"LED Control Service: LED status confirmed and saved to database - {led} = {state}")

        except Exception as e:
            logger.error(f"LED Control Service: Error handling LED status confirmation: {e}")

    def send_led_command(self, led_id: str, action: str) -> bool:
        try:
            if not self.is_connected:
                logger.warning("LED Control Service: Not connected, scheduling background reconnect and returning False")
                threading.Thread(target=self._reconnect, daemon=True).start()
                return False

            mqtt_command = f"{led_id}_{action}"

            self.pending_commands[led_id] = {
                'action': action,
                'timestamp': datetime.now(),
                'timeout': 3
            }

            result = self.client.publish(MQTT_CONTROL_TOPIC, mqtt_command)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"LED Control: Command '{mqtt_command}' sent successfully, waiting for confirmation")
                return True
            else:
                logger.error(f"LED Control: Failed to publish command, rc={result.rc}")
                if led_id in self.pending_commands:
                    del self.pending_commands[led_id]
                return False

        except Exception as e:
            logger.error(f"LED Control Service error: {e}")
            return False

    def get_led_status(self, led_id: str = None) -> Dict:
        if led_id:
            return {led_id: self.led_states.get(led_id, 'OFF')}
        return self.led_states.copy()

    def is_led_pending(self, led_id: str) -> bool:
        return led_id in self.pending_commands

    def cleanup_expired_pending_commands(self):
        current_time = datetime.now()
        expired_leds = []

        for led_id, command_info in self.pending_commands.items():
            time_diff = (current_time - command_info['timestamp']).total_seconds()
            if time_diff > command_info['timeout']:
                expired_leds.append(led_id)

        for led_id in expired_leds:
            del self.pending_commands[led_id]
            logger.warning(f"LED Control Service: Pending command for {led_id} expired")
