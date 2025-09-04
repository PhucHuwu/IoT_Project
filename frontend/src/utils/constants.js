export const API_CONFIG = {
    BASE_URL: "http://localhost:5001/api/v1",
    ENDPOINTS: {
        SENSOR_DATA: "/sensor-data",
        SENSOR_DATA_LIST: "/sensor-data-list",
        DEVICES: "/devices",
    },
};

export const CHART_CONFIG = {
    COLORS: {
        TEMPERATURE: "#ff6b6b",
        HUMIDITY: "#4ecdc4",
        LIGHT: "#ffe66d",
    },
    DEFAULT_LIMIT: 5,
    MAX_LIMIT: 50,
};

export const SENSOR_THRESHOLDS = {
    TEMPERATURE: {
        MIN: -50,
        MAX: 100,
        NORMAL_MIN: 15,
        NORMAL_MAX: 35,
    },
    HUMIDITY: {
        MIN: 0,
        MAX: 100,
        NORMAL_MIN: 30,
        NORMAL_MAX: 70,
    },
    LIGHT: {
        MIN: 0,
        MAX: 100,
        LOW_THRESHOLD: 20,
    },
};

export const UPDATE_INTERVALS = {
    REAL_TIME: 1000,
    NORMAL: 3000,
    SLOW: 5000,
};

export const DEVICE_TYPES = {
    LED: "led",
    SENSOR: "sensor",
    ACTUATOR: "actuator",
};

export const DEVICE_STATUS = {
    ON: "on",
    OFF: "off",
    UNKNOWN: "unknown",
};
