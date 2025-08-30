import paho.mqtt.client as mqtt
import json
from datetime import datetime
import ssl

BROKER_HOST = "9b88959e8c674540989f6ed6cf143c4d.s1.eu.hivemq.cloud"
BROKER_PORT = 8883
DATA_TOPIC = "esp32/iot/data"
USERNAME = "PhucHuwu"
PASSWORD = "Phuc3724@"


class MQTTDataReceiver:
    def __init__(self):
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.client.username_pw_set(USERNAME, PASSWORD)
        self.connected = False

        context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        self.client.tls_set_context(context)

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message

    def on_connect(self, client, userdata, flags, return_code, properties=None):
        if return_code == 0:
            if not self.connected:
                print("Connected to MQTT Broker!")
                self.connected = True
            self.client.subscribe(DATA_TOPIC)
        else:
            print(f"Failed to connect, return code {return_code}")

    def on_disconnect(self, client, userdata, flags, return_code, properties=None):
        if self.connected:
            print("Disconnected from MQTT Broker.")
            self.connected = False

    def on_message(self, client, userdata, message):
        timestamp = datetime.now().strftime('%d-%m-%Y %H:%M:%S')
        topic = message.topic
        payload = message.payload.decode('utf-8')

        if topic == DATA_TOPIC:
            try:
                data = json.loads(payload)
                temperature = data.get('temperature')
                humidity = data.get('humidity')
                light = data.get('light')
                print(f"[{timestamp}] Topic: {topic}, Temperature: {temperature} °C, Humidity: {humidity} %, Light: {light} %")
            except json.JSONDecodeError:
                print(f"[{timestamp}] Failed to decode JSON from payload: {payload}")

    def connect(self):
        try:
            print(f"Connecting to MQTT broker: {BROKER_HOST}:{BROKER_PORT}")
            self.client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
            return True
        except Exception as error:
            print(f"Error connecting to MQTT broker: {error}")
            return False

    def start(self):
        if self.connect():
            try:
                print("Starting MQTT client loop...")
                self.client.loop_forever()
            except KeyboardInterrupt:
                print("Stopping MQTT client...")
                self.client.disconnect()
        else:
            print("Failed to connect to MQTT broker")


def main():
    receiver = MQTTDataReceiver()
    receiver.start()


if __name__ == "__main__":
    main()
