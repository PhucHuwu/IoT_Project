import SensorDataService from "../services/api.js";
import HomePageChart from "../view/charts/home-page-chart.js";

class ChartController {
    constructor() {
        this.chartView = new HomePageChart();
        this.isLoading = false;
        this.updateInterval = null;
        this.currentTimePeriods = {
            temperature: "latest5",
            light: "latest5",
            humidity: "latest5",
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadAllCharts();
        this.startAutoUpdate();
    }

    setupEventListeners() {
        const tempSelector = document.getElementById("temperatureTimePeriod");
        if (tempSelector) {
            tempSelector.addEventListener("change", (e) => {
                this.currentTimePeriods.temperature = e.target.value;
                this.loadTemperatureChart(true);
            });
        }

        const lightSelector = document.getElementById("lightTimePeriod");
        if (lightSelector) {
            lightSelector.addEventListener("change", (e) => {
                this.currentTimePeriods.light = e.target.value;
                this.loadLightChart(true);
            });
        }

        const humiditySelector = document.getElementById("humidityTimePeriod");
        if (humiditySelector) {
            humiditySelector.addEventListener("change", (e) => {
                this.currentTimePeriods.humidity = e.target.value;
                this.loadHumidityChart(true);
            });
        }
    }

    async loadAllCharts() {
        await Promise.all([
            this.loadTemperatureChart(),
            this.loadLightChart(),
            this.loadHumidityChart(),
        ]);
    }

    async loadTemperatureChart(forceRecreate = false) {
        try {
            console.log("Loading temperature chart...");
            const data = await SensorDataService.getChartData(
                this.currentTimePeriods.temperature
            );
            console.log("Temperature chart data from API:", data);

            if (forceRecreate) {
                this.chartView.forceRecreateTemperatureChart(data.data || data);
            } else {
                this.chartView.updateTemperatureChart(data.data || data);
            }
        } catch (error) {
            console.error("Lỗi khi load biểu đồ nhiệt độ:", error);
            this.chartView.showTemperatureError();
        }
    }

    async loadLightChart(forceRecreate = false) {
        try {
            const data = await SensorDataService.getChartData(
                this.currentTimePeriods.light
            );

            if (forceRecreate) {
                this.chartView.forceRecreateLightChart(data.data || data);
            } else {
                this.chartView.updateLightChart(data.data || data);
            }
        } catch (error) {
            console.error("Lỗi khi load biểu đồ ánh sáng:", error);
            this.chartView.showLightError();
        }
    }

    async loadHumidityChart(forceRecreate = false) {
        try {
            const data = await SensorDataService.getChartData(
                this.currentTimePeriods.humidity
            );

            if (forceRecreate) {
                this.chartView.forceRecreateHumidityChart(data.data || data);
            } else {
                this.chartView.updateHumidityChart(data.data || data);
            }
        } catch (error) {
            console.error("Lỗi khi load biểu đồ độ ẩm:", error);
            this.chartView.showHumidityError();
        }
    }

    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            this.loadAllCharts();
        }, 5000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    destroy() {
        this.stopAutoUpdate();
        this.chartView.destroyCharts();
    }
}

export default ChartController;
