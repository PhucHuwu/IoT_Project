import { API_CONFIG } from "../utils/constants.js";

class ApiService {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
    }

    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API fetch error:", error);
            throw error;
        }
    }

    async getSensorDataList(type = "temperature", limit = 5) {
        return this.fetch(`/sensor-data-list?type=${type}&limit=${limit}`);
    }

    async getLatestSensorData() {
        return this.fetch("/sensor-data");
    }

    async addSensorData(data) {
        return this.fetch("/sensor-data", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async getDeviceStatus(deviceId) {
        return this.fetch(`/devices/${deviceId}`);
    }

    async updateDeviceStatus(deviceId, status) {
        return this.fetch(`/devices/${deviceId}`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        });
    }
}

export const apiService = new ApiService();
