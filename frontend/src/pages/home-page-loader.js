import SensorCardController from "../control/home-page-sensor-card-control.js";
import HomePageChartController from "../control/home-page-chart-control.js";
import LEDController from "../control/home-page-led-control.js";

class HomePageLoader {
    constructor() {
        this.sensorCardController = null;
        this.chartController = null;
        this.ledController = null;
    }

    async init() {
        try {
            if (typeof Chart === "undefined") {
                console.error("Chart.js chưa được load!");
                return;
            } else {
                console.log("Chart.js đã được load thành công");
            }

            this.sensorCardController = new SensorCardController();
            await this.sensorCardController.init();

            this.chartController = new HomePageChartController();
            await this.chartController.init();

            this.ledController = new LEDController();

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
        if (
            this.ledController &&
            typeof this.ledController.destroy === "function"
        ) {
            this.ledController.destroy();
        }
        this.ledController = null;
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
