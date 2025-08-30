const API_BASE_URL = "http://localhost:5001/api";

class IoTAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    async getLatestSensorData() {
        return this.request("/sensor/latest");
    }

    async getConnectionStatus() {
        return this.request("/sensor/connection-status");
    }

    async getSensorHistory(period = "today") {
        return this.request(`/sensor/history?period=${period}`);
    }

    async getAllSensorData(page = 1, limit = 1000) {
        return this.request(`/sensor/all-data?page=${page}&limit=${limit}`);
    }

    async getLatestNSensorData(limit = 20) {
        return this.request(`/sensor/latest-n?limit=${limit}`);
    }

    async getSensorStats() {
        return this.request("/sensor/stats");
    }

    async controlLED(ledId, status) {
        return this.request("/led/control", {
            method: "POST",
            body: JSON.stringify({
                led_id: ledId,
                status: status,
            }),
        });
    }

    async healthCheck() {
        return this.request("/health");
    }
}

window.iotAPI = new IoTAPI();
