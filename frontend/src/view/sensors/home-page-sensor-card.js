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

  updateTemperatureStatus(value) {
    const temperatureCard = document.querySelector(".sensor-card.temperature");
    if (temperatureCard) {
      temperatureCard.classList.remove(
        "status-normal",
        "status-warning",
        "status-danger"
      );
      if (value < 15) {
        temperatureCard.classList.add("status-warning");
      } else if (value > 35) {
        temperatureCard.classList.add("status-danger");
      } else {
        temperatureCard.classList.add("status-normal");
      }
    }
  }

  updateLightStatus(value) {
    const lightCard = document.querySelector(".sensor-card.light");
    if (lightCard) {
      lightCard.classList.remove("status-normal", "status-warning");
      if (value < 30) {
        lightCard.classList.add("status-warning");
      } else {
        lightCard.classList.add("status-normal");
      }
    }
  }

  updateHumidityStatus(value) {
    const humidityCard = document.querySelector(".sensor-card.humidity");
    if (humidityCard) {
      humidityCard.classList.remove(
        "status-normal",
        "status-warning",
        "status-danger"
      );
      if (value < 30 || value > 80) {
        humidityCard.classList.add("status-warning");
      } else if (value > 90) {
        humidityCard.classList.add("status-danger");
      } else {
        humidityCard.classList.add("status-normal");
      }
    }
  }

  showErrorState() {
    const sensorCards = document.querySelectorAll(".sensor-card .sensor-value");
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
}

export default SensorCardView;
