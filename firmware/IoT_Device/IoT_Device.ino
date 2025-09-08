#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <WiFiClientSecure.h>

#define DHT_PIN 21
#define DHT_TYPE DHT11
#define LIGHT_SENSOR_ADC_PIN 34

#define LED1_PIN 25
#define LED2_PIN 26
#define LED3_PIN 27

// const char *wifiSsid = "FreeWife24GHz";
// const char *wifiPassword = "0977910920";
const char *wifiSsid = "IOT";
const char *wifiPassword = "12345678";

const char *mqttServer = "9b88959e8c674540989f6ed6cf143c4d.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char *mqttUsername = "PhucHuwu";
const char *mqttPassword = "Phuc3724@";
const char *mqttClientId = "ESP32_IoT_Device";

WiFiClientSecure secureWifiClient;
PubSubClient mqttClient(secureWifiClient);

DHT dhtSensor(DHT_PIN, DHT_TYPE);

void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  String message = "";
  for (int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }

  Serial.print("Message received on topic: ");
  Serial.print(topic);
  Serial.print(" - Message: ");
  Serial.println(message);

  if (String(topic) == "esp32/iot/control")
  {
    if (message == "LED1_ON")
    {
      digitalWrite(LED1_PIN, HIGH);
      Serial.println("LED1 turned ON");
    }
    else if (message == "LED1_OFF")
    {
      digitalWrite(LED1_PIN, LOW);
      Serial.println("LED1 turned OFF");
    }
    else if (message == "LED2_ON")
    {
      digitalWrite(LED2_PIN, HIGH);
      Serial.println("LED2 turned ON");
    }
    else if (message == "LED2_OFF")
    {
      digitalWrite(LED2_PIN, LOW);
      Serial.println("LED2 turned OFF");
    }
    else if (message == "LED3_ON")
    {
      digitalWrite(LED3_PIN, HIGH);
      Serial.println("LED3 turned ON");
    }
    else if (message == "LED3_OFF")
    {
      digitalWrite(LED3_PIN, LOW);
      Serial.println("LED3 turned OFF");
    }
  }
}

void connectToMqtt()
{
  secureWifiClient.setInsecure();
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);

  int attempts = 0;
  while (!mqttClient.connected() && attempts < 3)
  {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect(mqttClientId, mqttUsername, mqttPassword))
    {
      Serial.println("Connected");
      mqttClient.subscribe("esp32/iot/control");
      Serial.println("Subscribed to esp32/iot/control");
      break;
    }
    else
    {
      Serial.print("Failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retry in 2s");
      attempts++;
      delay(2000);
    }
  }
}

void setup()
{
  Serial.begin(115200);
  dhtSensor.begin();
  analogReadResolution(12);

  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);

  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  WiFi.begin(wifiSsid, wifiPassword);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  mqttClient.setServer(mqttServer, mqttPort);
}

void loop()
{
  if (!mqttClient.connected())
  {
    connectToMqtt();
  }
  mqttClient.loop();

  static unsigned long lastSensorRead = 0;
  unsigned long currentTime = millis();

  if (currentTime - lastSensorRead >= 1000)
  {
    lastSensorRead = currentTime;

    float humidityValue = dhtSensor.readHumidity();
    float temperatureValue = dhtSensor.readTemperature();
    int lightAdcValue = analogRead(LIGHT_SENSOR_ADC_PIN);
    float lightPercentValue = (1.0 - (lightAdcValue / 4095.0)) * 100.0;

    if (isnan(humidityValue) || isnan(temperatureValue))
    {
      Serial.println("Sensor error");
    }
    else
    {
      Serial.print("Temperature: ");
      Serial.print(temperatureValue);
      Serial.print(" °C, Humidity: ");
      Serial.print(humidityValue);
      Serial.print(" %, ");
    }

    Serial.print("Light: ");
    Serial.print(lightPercentValue, 1);
    Serial.println(" %");

    if (!isnan(humidityValue) && !isnan(temperatureValue))
    {
      char mqttPayload[128];
      snprintf(mqttPayload, sizeof(mqttPayload), "{\"temperature\":%.1f,\"humidity\":%.1f,\"light\":%.1f}", temperatureValue, humidityValue, lightPercentValue);
      mqttClient.publish("esp32/iot/data", mqttPayload);
    }
  }
}
