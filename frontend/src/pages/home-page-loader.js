import SensorCardController from "../control/home-page-sensor-card-control.js";

class HomePageLoader {
  constructor() {
    this.sensorCardController = null;
  }

  async init() {
    try {
      this.sensorCardController = new SensorCardController();
      await this.sensorCardController.init();
      console.log("Trang home-page đã được khởi tạo thành công");
    } catch (error) {
      console.error("Lỗi khi khởi tạo trang home-page:", error);
    }
  }

  destroy() {
    if (this.sensorCardController) {
      this.sensorCardController.destroy();
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
