# IoT Monitoring System

A comprehensive IoT monitoring and control system using ESP32, featuring a modern web interface and powerful backend API.

## Overview

This project implements a complete IoT monitoring system including:

-   **Hardware**: ESP32 device with temperature, humidity, light sensors and LED control
-   **Backend**: REST API built with Flask and MongoDB
-   **Frontend**: Responsive web interface with real-time charts and data tables
-   **Communication**: MQTT protocol for real-time communication

## System Architecture

```
┌─────────────────┐    MQTT     ┌─────────────────┐    HTTP     ┌─────────────────┐
│   ESP32 Device  │ ──────────► │   Backend API   │ ◄────────── │   Frontend      │
│                 │             │   (Flask)       │             │   (HTML/JS)     │
│                 │             │                 │             │                 │
│ - DHT11 Sensor  │             │ - MQTT Client   │             │ - Real-time UI  │
│ - Light Sensor  │             │ - REST API      │             │ - Charts        │
│ - LED Control   │             │ - MongoDB       │             │ - Data Tables   │
└─────────────────┘             └─────────────────┘             └─────────────────┘
```

## Key Features

### Hardware (ESP32)

-   Read DHT11 sensor data (temperature, humidity)
-   Read light sensor via ADC
-   Remote control of 3 LEDs
-   WiFi and MQTT connectivity
-   Send data periodically every second

### Backend API

-   **RESTful API** with versioning (`/api/v1/`)
-   **MQTT Integration** to receive data from ESP32
-   **Database Management** with MongoDB
-   **Real-time Control** for LED control via MQTT
-   **Data Validation** and error handling
-   **Pagination** and filtering for data
-   **NoSQL Queries** advanced with text search and aggregation

### Frontend

-   **Home Page**: Display real-time sensor data and charts
-   **Sensor Data**: Data table with pagination and detailed charts
-   **Action History**: Track LED control commands
-   **Responsive interface** with sidebar navigation
-   **Real-time updates** without page refresh

## Installation and Setup

### System Requirements

-   Python 3.8+
-   Node.js (for development tools)
-   MongoDB
-   MQTT Broker (HiveMQ Cloud or local)

### Backend Setup

1. **Clone repository and install dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment variables:**
   Create `.env` file in `backend/` directory:

```env
# Database
MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DB_NAME=iot_database
MONGODB_COLLECTION_NAME=sensor_data

# MQTT Configuration
MQTT_BROKER_HOST=your-mqtt-broker-host
MQTT_BROKER_PORT=8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
MQTT_DATA_TOPIC=esp32/iot/data
MQTT_CONTROL_TOPIC=esp32/iot/control
MQTT_ACTION_HISTORY_TOPIC=esp32/iot/action-history

# API Configuration
API_HOST=0.0.0.0
API_PORT=5000
SECRET_KEY=your-secret-key
DEBUG_MODE=True
```

3. **Run backend:**

```bash
python main.py
```

Backend will run at `http://localhost:5000`

### Frontend Setup

Frontend consists of static files served by Flask backend. No additional dependencies required.

### Hardware Setup

1. **Install Arduino IDE and ESP32 board package**

2. **Hardware connections:**

```
ESP32 Pin Connections:
- DHT11: Pin 21
- Light Sensor: Pin 34 (ADC)
- LED1: Pin 25
- LED2: Pin 26
- LED3: Pin 27
```

3. **Configure WiFi and MQTT:**
   Edit parameters in `IoT_Device.ino` file:

```cpp
const char *wifiSsid = "YOUR_WIFI_SSID";
const char *wifiPassword = "YOUR_WIFI_PASSWORD";

const char *mqttServer = "YOUR_MQTT_BROKER";
const char *mqttUsername = "YOUR_USERNAME";
const char *mqttPassword = "YOUR_PASSWORD";
```

4. **Upload code to ESP32**

## API Documentation

### Sensor Data Endpoints

#### GET `/api/v1/sensors/sensor-data-list`

Get sensor data list with pagination and filtering.

**Query Parameters:**

-   `page`: Page number (default: 1)
-   `per_page`: Records per page (default: 10, max: 100)
-   `sort_field`: Sort field (timestamp, temperature, humidity, light)
-   `sort_order`: Sort order (asc, desc)
-   `limit`: Limit number of records
-   `timePeriod`: Time period (today, week, month)
-   `dateFrom`, `dateTo`: Start/end date (YYYY-MM-DD)
-   `sample`: Sampling frequency

#### GET `/api/v1/sensors/sensor-data/chart`

Get data for charts with aggregation options.

**Query Parameters:**

-   `timePeriod`: Time period
-   `aggregation`: Aggregation type (avg, min, max, count)
-   `interval`: Time interval between data points

#### POST `/api/v1/sensors/led-control`

Remote LED control.

**Request Body:**

```json
{
    "led_id": "LED1|LED2|LED3",
    "action": "ON|OFF"
}
```

#### GET `/api/v1/sensors/led-status`

Get current status of LEDs.

### NoSQL Query Endpoints

#### GET `/api/v1/nosql/search/text`

Search text in sensor data.

#### GET `/api/v1/nosql/search/range`

Search by numeric value range.

#### GET `/api/v1/nosql/aggregated`

Get aggregated data by criteria.

#### GET `/api/v1/nosql/statistics`

Get overall data statistics.

#### POST `/api/v1/nosql/search/advanced`

Advanced search with multiple options.

## Project Structure

```
IoT_Project/
├── .gitignore
├── README.md
│
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── main.py                                            # Entry point
│   ├── requirements.txt                                   # Python dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/                                           # API routes and blueprints
│   │   │   ├── routes.py
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── nosql_queries.py
│   │   │       ├── sensors.py
│   │   │       └── __init__.py
│   │   │
│   │   ├── core/                                          # Configuration and database
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── logger_config.py
│   │   │   ├── timezone_utils.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── models/                                        # Data models
│   │   │   ├── device.py
│   │   │   ├── sensor_data.py
│   │   │   └── __init__.py
│   │   │
│   │   └── services/                                      # Business logic
│   │       ├── data_service.py
│   │       ├── led_control_service.py
│   │       ├── mqtt_service.py
│   │       ├── nosql_query_service.py
│   │       ├── status_service.py
│   │       ├── validation_service.py
│   │       └── __init__.py
│   │
│   └── tests/
│       └── __init__.py
│
├── frontend/
│   ├── public/                                            # HTML pages
│   │   ├── action-history.html
│   │   ├── home-page.html
│   │   ├── profile.html
│   │   └── sensor-data.html
│   │
│   └── src/
│       ├── components/                                    # UI components
│       │   └── update-indicator.js
│       │
│       ├── control/                                       # Controllers
│       │   ├── action-history-table-control.js
│       │   ├── home-page-chart-control.js
│       │   ├── home-page-led-control.js
│       │   ├── home-page-sensor-card-control.js
│       │   ├── profile-control.js
│       │   ├── sensor-data-chart-control.js
│       │   └── sensor-data-table-control.js
│       │
│       ├── pages/                                         # Page loaders
│       │   ├── action-history-loader.js
│       │   ├── home-page-loader.js
│       │   └── sensor-data-loader.js
│       │
│       ├── services/                                      # API services
│       │   └── api.js
│       │
│       ├── styles/                                        # CSS files
│       │   ├── main.css
│       │   ├── pages.css
│       │   └── profile.css
│       │
│       └── view/                                          # Views and templates
│           ├── charts/
│           │   ├── home-page-chart.js
│           │   └── sensor-data-chart.js
│           │
│           ├── sensors/
│           │   └── home-page-sensor-card.js
│           │
│           └── table/
│               ├── action-history-table.js
│               └── sensor-data-table.js
│
└── hardware/
    └── IoT_Device/
        ├── IoT_Device.ino                                 # ESP32 code
        └── pubsub.txt                                     # MQTT test commands
```

## MQTT Topics

-   `esp32/iot/data`: Sensor data from ESP32
-   `esp32/iot/control`: LED control commands from backend
-   `esp32/iot/action-history`: Control action history

## Development

### Backend Development

Backend uses Flask with modular architecture:

-   **Blueprints** for API organization
-   **Services** for business logic
-   **Models** for data structures
-   **Core** for configuration and utilities

### Frontend Development

Frontend uses vanilla JavaScript with MVC architecture:

-   **Controllers** handle logic and API calls
-   **Views** display UI components
-   **Services** manage API communication
-   **Components** reusable UI elements

### Testing MQTT

Use mosquitto client to test MQTT:

```bash
# Subscribe to data topic
mosquitto_sub -h your-broker -p 8883 -u username -P password -t "esp32/iot/data"

# Send LED control command
mosquitto_pub -h your-broker -p 8883 -u username -P password -t "esp32/iot/control" -m "LED1_ON"
```

## Troubleshooting

### Common Issues

1. **ESP32 cannot connect to WiFi:**

    - Check SSID and password
    - Ensure WiFi is in 2.4GHz mode

2. **MQTT connection failed:**

    - Check broker host and port
    - Verify username/password
    - Test with mosquitto client

3. **Backend not receiving data:**

    - Check MQTT broker connection
    - Verify topic names
    - Check MongoDB connection

4. **Frontend not displaying data:**
    - Check browser console for errors
    - Verify API endpoints
    - Check CORS configuration

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

This project is developed for educational and research purposes.

## Contact

For support or contributions, please create an issue on the GitHub repository.
