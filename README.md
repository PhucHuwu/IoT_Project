# IoT Monitoring System

A comprehensive IoT monitoring and control system using ESP32, featuring a modern web interface and powerful backend API with advanced NoSQL query capabilities.

## Overview

This project implements a complete IoT monitoring system including:

-   **Hardware**: ESP32 device with DHT11 temperature/humidity sensor, light sensor, and 3 LED controls
-   **Backend**: REST API built with Flask, MongoDB, and MQTT integration
-   **Frontend**: Responsive web interface with real-time charts, data tables, and LED controls
-   **Communication**: MQTT protocol for real-time communication between ESP32 and backend
-   **Advanced Features**: NoSQL queries, data aggregation, time-based filtering, and comprehensive search

## System Architecture

```
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│  ESP32 Device   │            │   Backend API   │            │    Frontend     │
│                 │            │     (Flask)     │            │    (HTML/JS)    │
│                 │    MQTT    │                 │    HTTP    │                 │
│ - DHT11 Sensor  │ ─────────► │ - MQTT Client   │ ◄───────── │ - Real-time UI  │
│ - Light Sensor  │            │ - REST API      │            │ - Charts        │
│ - 3x LED Control│            │ - MongoDB       │            │ - Data Tables   │
│ - WiFi + MQTT   │            │ - NoSQL Queries │            │ - LED Controls  │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

## Key Features

### Hardware (ESP32)

-   **DHT11 Sensor**: Temperature and humidity readings
-   **Light Sensor**: Analog light sensor via ADC (Pin 34)
-   **LED Control**: 3 LEDs (Pins 25, 26, 27) with remote control
-   **WiFi Connectivity**: Automatic connection and reconnection
-   **MQTT Communication**: Secure TLS connection to HiveMQ Cloud
-   **Real-time Data**: Sends sensor data every 1 second
-   **Action History**: Publishes LED status changes

### Backend API

-   **RESTful API** with versioning (`/api/v1/`) and Swagger documentation
-   **MQTT Integration**: Receives sensor data and publishes LED commands
-   **MongoDB Database**: Stores sensor data and action history
-   **Advanced NoSQL Queries**: Text search, range queries, aggregation
-   **Real-time LED Control**: MQTT-based remote LED control
-   **Data Validation**: Comprehensive input validation and error handling
-   **Pagination & Filtering**: Advanced data filtering with time-based queries
-   **Timezone Support**: Vietnam timezone handling for all timestamps
-   **Health Monitoring**: System status and connection monitoring

### Frontend

-   **Home Page**: Real-time sensor cards, LED controls, and interactive charts
-   **Sensor Data Page**: Advanced data table with search, filtering, and pagination
-   **Action History Page**: LED control history with comprehensive filtering
-   **Profile Page**: User interface for system settings
-   **Responsive Design**: Mobile-friendly interface with sidebar navigation
-   **Real-time Updates**: Live data updates without page refresh
-   **Interactive Charts**: Chart.js integration with time-based data visualization

## Installation and Setup

### System Requirements

-   Python 3.8+
-   MongoDB (local or cloud)
-   MQTT Broker (HiveMQ Cloud recommended)
-   ESP32 development board
-   Arduino IDE with ESP32 board package

### Backend Setup

1. **Clone repository and install dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment variables:**
   Create `.env` file in `backend/` directory:

```env
# Database Configuration
MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DB_NAME=iot_database
MONGODB_COLLECTION_NAME=sensor_data

# MQTT Configuration (HiveMQ Cloud)
MQTT_BROKER_HOST=your-hivemq-broker-host
MQTT_BROKER_PORT=8883
MQTT_USERNAME=your-hivemq-username
MQTT_PASSWORD=your-hivemq-password
MQTT_DATA_TOPIC=esp32/iot/data
MQTT_CONTROL_TOPIC=esp32/iot/control
MQTT_ACTION_HISTORY_TOPIC=esp32/iot/action-history

# API Configuration
API_HOST=0.0.0.0
API_PORT=5000
SECRET_KEY=your-secret-key
DEBUG_MODE=True

# Sensor Thresholds (Optional)
TEMP_NORMAL_MIN=25.0
TEMP_NORMAL_MAX=35.0
HUMIDITY_NORMAL_MIN=40.0
HUMIDITY_NORMAL_MAX=60.0
LIGHT_NORMAL_MIN=40.0
LIGHT_NORMAL_MAX=60.0
```

3. **Run backend:**

```bash
python main.py
```

Backend will run at `http://localhost:5000`

**API Documentation**: Available at `http://localhost:5000/docs/`

### Frontend Setup

Frontend consists of static files served by Flask backend. No additional dependencies required.

The frontend is automatically served by the Flask backend at `http://localhost:5000/`

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
   Edit parameters in `hardware/IoT_Device/IoT_Device.ino` file:

```cpp
// WiFi Configuration
const char *wifiSsid = "YOUR_WIFI_SSID";
const char *wifiPassword = "YOUR_WIFI_PASSWORD";

// MQTT Configuration (HiveMQ Cloud)
const char *mqttServer = "your-hivemq-broker-host";
const char *mqttUsername = "your-hivemq-username";
const char *mqttPassword = "your-hivemq-password";
```

4. **Upload code to ESP32**

## API Documentation

Complete API documentation is available at `http://localhost:5000/docs/` when the backend is running.

### Main Endpoints

#### Sensor Data Endpoints

-   **GET** `/api/v1/sensors/sensor-data` - Get latest sensor data
-   **GET** `/api/v1/sensors/sensor-data-list` - Get paginated sensor data with advanced filtering
-   **GET** `/api/v1/sensors/sensor-data/chart` - Get chart data with time-based filtering
-   **POST** `/api/v1/sensors/sensor-data` - Add new sensor data
-   **GET** `/api/v1/sensors/sensor-data/{id}` - Get sensor data by ID

#### LED Control Endpoints

-   **POST** `/api/v1/sensors/led-control` - Control LED (ON/OFF)
-   **GET** `/api/v1/sensors/led-status` - Get current LED status
-   **GET** `/api/v1/sensors/action-history` - Get LED action history

#### NoSQL Query Endpoints

-   **GET** `/api/v1/nosql/search/text` - Text search in sensor data
-   **GET** `/api/v1/nosql/search/range` - Search by numeric value range
-   **POST** `/api/v1/nosql/search/multi-criteria` - Multi-criteria search
-   **GET** `/api/v1/nosql/aggregated` - Get aggregated data by time periods
-   **GET** `/api/v1/nosql/statistics` - Get data statistics
-   **POST** `/api/v1/nosql/search/advanced` - Advanced search with pagination

#### System Endpoints

-   **GET** `/api/v1/system/health` - System health check
-   **GET** `/api/v1/system/info` - System information

### Query Parameters

#### Sensor Data List (`/sensor-data-list`)

-   `page`: Page number (default: 1)
-   `per_page`: Records per page (default: 10, max: 100)
-   `sort_field`: Sort field (timestamp, temperature, humidity, light)
-   `sort_order`: Sort order (asc, desc)
-   `limit`: Limit number of records or "all"
-   `timePeriod`: Time period (today, 1day, 2days)
-   `dateFrom`, `dateTo`: Start/end date (YYYY-MM-DD)
-   `search`: Search term for filtering
-   `search_criteria`: Search criteria (all, temperature, humidity, light, time)
-   `sample`: Sampling frequency (1, 2, 3, etc.)

#### LED Control (`/led-control`)

**Request Body:**

```json
{
    "led_id": "LED1|LED2|LED3",
    "action": "ON|OFF"
}
```

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

-   **`esp32/iot/data`**: Sensor data from ESP32 (temperature, humidity, light)
-   **`esp32/iot/control`**: LED control commands from backend to ESP32
-   **`esp32/iot/action-history`**: LED status changes and action history

### MQTT Message Formats

#### Sensor Data (`esp32/iot/data`)

```json
{
    "temperature": 25.5,
    "humidity": 60.2,
    "light": 45.8
}
```

#### LED Control (`esp32/iot/control`)

```
LED1_ON
LED1_OFF
LED2_ON
LED2_OFF
LED3_ON
LED3_OFF
```

#### Action History (`esp32/iot/action-history`)

```json
{
    "type": "led_status",
    "led": "LED1",
    "state": "ON"
}
```

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

Use mosquitto client to test MQTT (example commands in `hardware/IoT_Device/pubsub.txt`):

```bash
# Subscribe to sensor data
mosquitto_sub -h your-hivemq-broker -p 8883 -u username -P password -t "esp32/iot/data"

# Subscribe to action history
mosquitto_sub -h your-hivemq-broker -p 8883 -u username -P password -t "esp32/iot/action-history"

# Send LED control command
mosquitto_pub -h your-hivemq-broker -p 8883 -u username -P password -t "esp32/iot/control" -m "LED1_ON"

# Send test sensor data
mosquitto_pub -h your-hivemq-broker -p 8883 -u username -P password -t "esp32/iot/data" -m '{"temperature":25.0,"humidity":60.0,"light":80.0}'
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
    - Verify API endpoints are accessible
    - Check CORS configuration
    - Ensure backend is running on correct port

5. **NoSQL queries not working:**

    - Verify MongoDB connection
    - Check collection names and indexes
    - Review query syntax and parameters

6. **LED control not working:**
    - Check MQTT broker connection
    - Verify LED control topic subscription
    - Check ESP32 MQTT client status

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
