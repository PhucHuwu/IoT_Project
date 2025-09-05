import SensorDataChartController from "../control/sensor-data-chart-control.js";
import SensorDataTableController from "../control/sensor-data-table-control.js";

class SensorDataPageLoader {
    constructor() {
        this.chartController = null;
        this.tableController = null;
    }

    async init() {
        try {
            this.chartController = new SensorDataChartController();
            await this.chartController.init();

            this.tableController = new SensorDataTableController();

            console.log("Trang sensor-data đã được khởi tạo thành công");
        } catch (error) {
            console.error("Lỗi khi khởi tạo trang sensor-data:", error);
        }
    }

    destroy() {
        if (this.chartController) {
            this.chartController.destroy();
        }
        if (this.tableController) {
            this.tableController.destroy();
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const pageLoader = new SensorDataPageLoader();
    await pageLoader.init();

    window.sensorDataPageLoader = pageLoader;
});

export default SensorDataPageLoader;
