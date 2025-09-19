import SensorDataService from "../services/api.js";
import SensorDataChart from "../view/charts/sensor-data-chart.js";

class SensorDataChartController {
    constructor() {
        this.chartView = new SensorDataChart();
        this.currentSensorType = "temperature";
        this.selectedDate = this.getLocalDateString();
        this.isLoading = false;
        this.refreshInterval = null;

        this.datePicker = document.getElementById("datePicker");
        this.sensorTypeSelector = document.getElementById("sensorTypeSelector");
    }

    async init() {
        this.setupEventListeners();
        this.initializeDatePicker();
        await this.loadChart();
        this.startAutoRefresh();
    }

    initializeDatePicker() {
        const today = new Date();
        const formattedDate = this.getLocalDateString(today);
        this.datePicker.value = formattedDate;
        this.selectedDate = formattedDate;

        this.datePicker.max = formattedDate;

        console.log("Date picker initialized with:", this.selectedDate);
    }

    setupEventListeners() {
        if (this.sensorTypeSelector) {
            this.sensorTypeSelector.addEventListener("change", (e) => {
                this.currentSensorType = e.target.value;
                this.loadChart();
            });
        }

        if (this.datePicker) {
            this.datePicker.addEventListener("change", (e) => {
                this.selectedDate = e.target.value;
                console.log("Selected date changed to:", this.selectedDate);
                this.stopAutoRefresh();
                this.loadChart();
                this.startAutoRefresh();
            });
        }
    }

    async loadChart() {
        if (this.isLoading) return;

        try {
            console.log(
                `Loading chart for sensor type: ${this.currentSensorType}, date: ${this.selectedDate}`
            );

            this.isLoading = true;
            const data = await this.getSensorData();

            console.log("Received data:", data);

            if (data && data.length > 0) {
                this.chartView.updateChart(data, this.currentSensorType);
                this.updateScrollIndicator(data.length);
                console.log("Chart updated successfully");
            } else {
                console.warn("Không có dữ liệu để hiển thị");
            }
        } catch (error) {
            console.error("Lỗi khi load biểu đồ:", error);
            this.chartView.showError();
        } finally {
            this.isLoading = false;
        }
    }

    async getSensorData() {
        try {
            const response = await fetch(
                `http://localhost:5001/api/v1/sensors/sensor-data/chart?date=${this.selectedDate}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
            throw error;
        }
    }

    updateScrollIndicator(dataLength) {
        const scrollInfo = document.getElementById("scrollInfo");
        if (scrollInfo) {
            if (dataLength > 20) {
                scrollInfo.textContent = `Hiển thị ${dataLength} bản ghi - Cuộn ngang để xem thêm`;
            } else {
                scrollInfo.textContent = `Hiển thị tất cả ${dataLength} bản ghi`;
            }
        }
    }

    async refreshChartSilently() {
        if (this.isLoading) return;

        try {
            const data = await this.getSensorData();
            if (data && data.length > 0) {
                this.chartView.updateChart(data, this.currentSensorType);
                this.updateScrollIndicator(data.length);
            }
        } catch (error) {
            console.error("Lỗi khi refresh biểu đồ:", error);
        }
    }

    startAutoRefresh() {
        const today = this.getLocalDateString();
        if (this.selectedDate === today) {
            this.refreshInterval = setInterval(() => {
                this.refreshChartSilently();
            }, 30000);
        }
    }

    getLocalDateString(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
        this.chartView.destroy();
    }
}

export default SensorDataChartController;
