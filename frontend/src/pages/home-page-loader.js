import SensorCardController from "../control/home-page-sensor-card-control.js";
import ChartController from "../control/home-page-chart-control.js";

class HomePageLoader {
  constructor() {
    this.sensorCardController = null;
    this.chartController = null;
  }

  async init() {
    try {
      // Khởi tạo sensor cards
      this.sensorCardController = new SensorCardController();
      await this.sensorCardController.init();

      // Khởi tạo charts
      this.chartController = new ChartController();
      await this.chartController.init();

      console.log("Trang home-page đã được khởi tạo thành công");
    } catch (error) {
      console.error("Lỗi khi khởi tạo trang home-page:", error);
    }
  }

  destroy() {
    if (this.sensorCardController) {
      this.sensorCardController.destroy();
    }
    if (this.chartController) {
      this.chartController.destroy();
    }
  }
}

const homePageLoader = new HomePageLoader();

document.addEventListener("DOMContentLoaded", () => {
  homePageLoader.init();
});

window.addEventListener("beforeunload", () => {
  homePageLoader.destroy();
});

export default homePageLoader;
