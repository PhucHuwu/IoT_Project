import SensorDataService from "../services/api.js";
import SensorCardView from "../view/sensors/home-page-sensor-card.js";

class SensorCardController {
  constructor() {
    this.view = new SensorCardView();
    this.isLoading = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.updateInterval = null;
    this.isInitialLoad = true;
    this.lastData = {};
  }

  async init() {
    await this.loadSensorData();
    this.startAutoUpdate();
  }

  async loadSensorData() {
    if (this.isLoading) return;

    this.isLoading = true;

    if (this.isInitialLoad) {
      this.view.showLoadingState();
    }

    try {
      const data = await SensorDataService.getLatestSensorData();

      if (data && Object.keys(data).length > 0) {
        this.updateSensorCards(data);
        this.retryCount = 0;
        this.isInitialLoad = false;
      } else {
        console.warn("Không có dữ liệu cảm biến");
        this.handleError();
      }
    } catch (error) {
      console.error("Lỗi khi load dữ liệu cảm biến:", error);
      this.handleError();
    } finally {
      this.isLoading = false;
    }
  }

  updateSensorCards(data) {
    if (
      data.temperature !== undefined &&
      data.temperature !== this.lastData.temperature
    ) {
      this.view.updateTemperatureCard(data.temperature);
      this.lastData.temperature = data.temperature;
    }

    if (data.light !== undefined && data.light !== this.lastData.light) {
      this.view.updateLightCard(data.light);
      this.lastData.light = data.light;
    }

    if (
      data.humidity !== undefined &&
      data.humidity !== this.lastData.humidity
    ) {
      this.view.updateHumidityCard(data.humidity);
      this.lastData.humidity = data.humidity;
    }
  }

  handleError() {
    this.retryCount++;

    if (this.retryCount <= this.maxRetries) {
      console.log(
        `Thử lại lần ${this.retryCount}/${this.maxRetries} sau 5 giây...`
      );
      setTimeout(() => {
        this.loadSensorData();
      }, 5000);
    } else {
      console.error("Đã thử lại tối đa, hiển thị trạng thái lỗi");
      this.view.showErrorState();
    }
  }

  startAutoUpdate() {
    this.updateInterval = setInterval(() => {
      this.loadSensorData();
    }, 1000);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy() {
    this.stopAutoUpdate();
  }
}

export default SensorCardController;
