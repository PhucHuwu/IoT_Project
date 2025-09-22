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
    const hasNewData =
      data.temperature !== this.lastData.temperature ||
      data.light !== this.lastData.light ||
      data.humidity !== this.lastData.humidity ||
      (data.sensor_statuses &&
        JSON.stringify(data.sensor_statuses) !==
          JSON.stringify(this.lastData.sensor_statuses));

    if (hasNewData) {
      this.view.updateFromBackendData(data);

      this.lastData = {
        temperature: data.temperature,
        light: data.light,
        humidity: data.humidity,
        sensor_statuses: data.sensor_statuses,
      };
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
