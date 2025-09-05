#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <WiFiClientSecure.h>

#define DHT_PIN 19
#define DHT_TYPE DHT11
#define LIGHT_SENSOR_ADC_PIN 34

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

void connectToMqtt()
{
  secureWifiClient.setInsecure();
  mqttClient.setServer(mqttServer, mqttPort);
  while (!mqttClient.connected())
  {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect(mqttClientId, mqttUsername, mqttPassword))
    {
      Serial.println("Connected");
    }
    else
    {
      Serial.print("Failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retry in 5s");
      delay(5000);
    }
  }
}

void setup()
{
  Serial.begin(115200);
  dhtSensor.begin();
  analogReadResolution(12);
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

  delay(5000);
}
