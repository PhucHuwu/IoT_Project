import SensorDataChartController from "../control/sensor-data-chart-control.js";

class SensorDataPageLoader {
  constructor() {
    this.chartController = null;
  }

  async init() {
    try {
      this.chartController = new SensorDataChartController();
      await this.chartController.init();

      console.log("Trang sensor-data đã được khởi tạo thành công");
    } catch (error) {
      console.error("Lỗi khi khởi tạo trang sensor-data:", error);
    }
  }

  destroy() {
    if (this.chartController) {
      this.chartController.destroy();
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const pageLoader = new SensorDataPageLoader();
  await pageLoader.init();

  window.sensorDataPageLoader = pageLoader;
});

export default SensorDataPageLoader;
