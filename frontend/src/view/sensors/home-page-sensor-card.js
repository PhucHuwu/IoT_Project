class SensorCardView {
    constructor() {
        this.temperatureValue = null;
        this.lightValue = null;
        this.humidityValue = null;
    }

    updateTemperatureCard(value) {
        const temperatureCard = document.querySelector(
            ".sensor-card.temperature .sensor-value"
        );
        if (temperatureCard) {
            const currentValue = parseFloat(temperatureCard.textContent);
            if (Math.abs(currentValue - value) > 0.1 || isNaN(currentValue)) {
                this.temperatureValue = value;
                temperatureCard.style.opacity = "0.7";
                setTimeout(() => {
                    temperatureCard.textContent = `${value.toFixed(1)}°C`;
                    temperatureCard.style.opacity = "1";
                    this.updateTemperatureStatus(value);
                }, 100);
            }
        }
    }

    updateLightCard(value) {
        const lightCard = document.querySelector(
            ".sensor-card.light .sensor-value"
        );
        if (lightCard) {
            const currentValue = parseFloat(lightCard.textContent);
            if (Math.abs(currentValue - value) > 0.1 || isNaN(currentValue)) {
                this.lightValue = value;
                lightCard.style.opacity = "0.7";
                setTimeout(() => {
                    lightCard.textContent = `${value.toFixed(1)}%`;
                    lightCard.style.opacity = "1";
                    this.updateLightStatus(value);
                }, 100);
            }
        }
    }

    updateHumidityCard(value) {
        const humidityCard = document.querySelector(
            ".sensor-card.humidity .sensor-value"
        );
        if (humidityCard) {
            const currentValue = parseFloat(humidityCard.textContent);
            if (Math.abs(currentValue - value) > 0.1 || isNaN(currentValue)) {
                this.humidityValue = value;
                humidityCard.style.opacity = "0.7";
                setTimeout(() => {
                    humidityCard.textContent = `${value.toFixed(1)}%`;
                    humidityCard.style.opacity = "1";
                    this.updateHumidityStatus(value);
                }, 100);
            }
        }
    }

    updateTemperatureStatus(value, statusInfo = null) {
        const temperatureCard = document.querySelector(
            ".sensor-card.temperature"
        );
        if (temperatureCard) {
            temperatureCard.classList.remove(
                "status-normal",
                "status-warning",
                "status-danger",
                "status-error"
            );

            if (statusInfo && statusInfo.color_class) {
                temperatureCard.classList.add(statusInfo.color_class);
                console.log(
                    `Temperature: ${value}°C -> ${statusInfo.status} (${statusInfo.color_class})`
                );
            } else {
                // Fallback logic nếu không có thông tin từ backend
                if (value < 15) {
                    temperatureCard.classList.add("status-warning");
                } else if (value > 35) {
                    temperatureCard.classList.add("status-danger");
                } else {
                    temperatureCard.classList.add("status-normal");
                }
                console.log(`Temperature fallback: ${value}°C`);
            }
        }
    }

    updateLightStatus(value, statusInfo = null) {
        const lightCard = document.querySelector(".sensor-card.light");
        if (lightCard) {
            lightCard.classList.remove(
                "status-normal",
                "status-warning",
                "status-danger",
                "status-error"
            );

            if (statusInfo && statusInfo.color_class) {
                lightCard.classList.add(statusInfo.color_class);
                console.log(
                    `Light: ${value}% -> ${statusInfo.status} (${statusInfo.color_class})`
                );
            } else {
                // Fallback logic nếu không có thông tin từ backend
                if (value < 30) {
                    lightCard.classList.add("status-warning");
                } else {
                    lightCard.classList.add("status-normal");
                }
                console.log(`Light fallback: ${value}%`);
            }
        }
    }

    updateHumidityStatus(value, statusInfo = null) {
        const humidityCard = document.querySelector(".sensor-card.humidity");
        if (humidityCard) {
            humidityCard.classList.remove(
                "status-normal",
                "status-warning",
                "status-danger",
                "status-error"
            );

            if (statusInfo && statusInfo.color_class) {
                humidityCard.classList.add(statusInfo.color_class);
                console.log(
                    `Humidity: ${value}% -> ${statusInfo.status} (${statusInfo.color_class})`
                );
            } else {
                // Fallback logic nếu không có thông tin từ backend
                if (value < 30 || value > 80) {
                    humidityCard.classList.add("status-warning");
                } else if (value > 90) {
                    humidityCard.classList.add("status-danger");
                } else {
                    humidityCard.classList.add("status-normal");
                }
                console.log(`Humidity fallback: ${value}%`);
            }
        }
    }

    showErrorState() {
        const sensorCards = document.querySelectorAll(
            ".sensor-card .sensor-value"
        );
        sensorCards.forEach((card) => {
            if (card.textContent.includes("--")) {
                card.textContent = "Lỗi";
                card.parentElement.classList.add("status-error");
            }
        });
    }

    showLoadingState() {
        const temperatureCard = document.querySelector(
            ".sensor-card.temperature .sensor-value"
        );
        const lightCard = document.querySelector(
            ".sensor-card.light .sensor-value"
        );
        const humidityCard = document.querySelector(
            ".sensor-card.humidity .sensor-value"
        );

        if (temperatureCard) temperatureCard.textContent = "--°C";
        if (lightCard) lightCard.textContent = "--%";
        if (humidityCard) humidityCard.textContent = "--%";
    }

    updateFromBackendData(data) {
        console.log("updateFromBackendData called with:", data);

        if (data.sensor_statuses) {
            console.log("Using backend status data:", data.sensor_statuses);
            // Cập nhật nhiệt độ với thông tin trạng thái từ backend
            if (data.temperature !== undefined) {
                this.updateTemperatureCard(data.temperature);
                this.updateTemperatureStatus(
                    data.temperature,
                    data.sensor_statuses.temperature
                );
            }

            // Cập nhật độ ẩm với thông tin trạng thái từ backend
            if (data.humidity !== undefined) {
                this.updateHumidityCard(data.humidity);
                this.updateHumidityStatus(
                    data.humidity,
                    data.sensor_statuses.humidity
                );
            }

            // Cập nhật ánh sáng với thông tin trạng thái từ backend
            if (data.light !== undefined) {
                this.updateLightCard(data.light);
                this.updateLightStatus(data.light, data.sensor_statuses.light);
            }
        } else {
            console.log("No sensor_statuses, using fallback logic");

            // Fallback nếu không có thông tin trạng thái từ backend
            if (data.temperature !== undefined) {
                this.updateTemperatureCard(data.temperature);
                this.updateTemperatureStatus(data.temperature);
            }
            if (data.humidity !== undefined) {
                this.updateHumidityCard(data.humidity);
                this.updateHumidityStatus(data.humidity);
            }
            if (data.light !== undefined) {
                this.updateLightCard(data.light);
                this.updateLightStatus(data.light);
            }
        }
    }
}

export default SensorCardView;
