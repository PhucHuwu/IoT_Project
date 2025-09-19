import SensorDataTableController from "../control/sensor-data-table-control.js";

class SensorDataPageLoader {
    constructor() {
        this.tableController = null;
    }

    async init() {
        try {
            this.tableController = new SensorDataTableController();

            console.log(
                "Trang sensor-data đã được khởi tạo thành công (không có biểu đồ)"
            );
        } catch (error) {
            console.error("Lỗi khi khởi tạo trang sensor-data:", error);
        }
    }

    destroy() {
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
