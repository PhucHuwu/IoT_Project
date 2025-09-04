import { SENSOR_THRESHOLDS } from "./constants.js";

export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function formatSensorValue(value, type) {
    if (value === null || value === undefined || isNaN(value)) {
        return "--";
    }

    const formattedValue = Number(value).toFixed(1);

    switch (type) {
        case "temperature":
            return `${formattedValue}°C`;
        case "humidity":
            return `${formattedValue}%`;
        case "light":
            return `${formattedValue}%`;
        default:
            return formattedValue;
    }
}

export function getSensorStatus(value, type) {
    if (value === null || value === undefined || isNaN(value)) {
        return "unknown";
    }

    const threshold = SENSOR_THRESHOLDS[type.toUpperCase()];
    if (!threshold) return "normal";

    switch (type) {
        case "temperature":
            if (value < threshold.NORMAL_MIN || value > threshold.NORMAL_MAX) {
                return "warning";
            }
            break;
        case "humidity":
            if (value < threshold.NORMAL_MIN || value > threshold.NORMAL_MAX) {
                return "warning";
            }
            break;
        case "light":
            if (value < threshold.LOW_THRESHOLD) {
                return "warning";
            }
            break;
    }

    return "normal";
}

export function getStatusColorClass(status) {
    switch (status) {
        case "normal":
            return "status-normal";
        case "warning":
            return "status-warning";
        case "error":
            return "status-error";
        default:
            return "status-unknown";
    }
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

export function deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => deepClone(item));

    if (typeof obj === "object") {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

export function isValidSensorValue(value, type) {
    if (value === null || value === undefined || isNaN(value)) {
        return false;
    }

    const threshold = SENSOR_THRESHOLDS[type.toUpperCase()];
    if (!threshold) return true;

    return value >= threshold.MIN && value <= threshold.MAX;
}
