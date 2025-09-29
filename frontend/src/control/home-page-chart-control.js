import SensorDataService from "../services/api.js";
import HomePageChart from "../view/charts/home-page-chart.js";

class HomePageChartController {
    constructor() {
        this.chartView = new HomePageChart();
        this.currentSensorType = "all";
        this.dataLimit = "50";
        this.selectedDate = this.getLocalDateString();
        this.isLoading = false;
        this.refreshInterval = null;

        this.datePicker = document.getElementById("datePicker");
        this.sensorTypeSelector = document.getElementById("sensorTypeSelector");
        this.dataLimitSelector = document.getElementById("dataLimitSelector");
    }

    async init() {
        this.setupEventListeners();
        await this.initializeDatePicker();
        await this.loadChart();
        this.startAutoRefresh();
    }

    async initializeDatePicker() {
        const today = new Date();
        const formattedDate = this.getLocalDateString(today);
        this.selectedDate = formattedDate;

        let availableDates = [];
        try {
            const response = await SensorDataService.getAvailableDates();
            if (response.status === "success" && response.data) {
                availableDates = response.data;
                console.log("Available dates:", availableDates);
            }
        } catch (error) {
            console.error("Lỗi khi lấy danh sách ngày có dữ liệu:", error);
        }

        // Khởi tạo Flatpickr
        if (this.datePicker) {
            flatpickr(this.datePicker, {
                dateFormat: "Y-m-d",
                maxDate: formattedDate,
                defaultDate: formattedDate,
                enable: availableDates,
                onChange: (selectedDates, dateStr) => {
                    if (selectedDates.length > 0) {
                        this.selectedDate = dateStr;
                        console.log(
                            "Selected date changed to:",
                            this.selectedDate
                        );
                        this.stopAutoRefresh();
                        this.loadChart();
                        this.startAutoRefresh();
                    }
                },
            });
        }

        console.log("Date picker initialized with:", this.selectedDate);
    }

    setupEventListeners() {
        if (this.sensorTypeSelector) {
            this.sensorTypeSelector.addEventListener("change", (e) => {
                this.currentSensorType = e.target.value;
                this.loadChart();
            });
        }

        if (this.dataLimitSelector) {
            this.dataLimitSelector.addEventListener("change", (e) => {
                this.dataLimit = e.target.value;
                console.log("Data limit changed to:", this.dataLimit);
                this.loadChart();
                this.checkAndUpdateAutoRefresh();
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
                this.chartView.showNoDataMessage();
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
            const today = this.getLocalDateString();

            console.log("Debug - selectedDate:", this.selectedDate);
            console.log("Debug - today:", today);
            console.log("Debug - isToday:", this.selectedDate === today);
            console.log("Debug - dataLimit:", this.dataLimit);

            if (this.dataLimit === "all") {
                console.log(
                    "Getting ALL data for date:",
                    this.selectedDate,
                    "(from 00:00h to 23:59h)"
                );
                console.log(
                    "Calling getSensorDataByDate with params:",
                    this.selectedDate,
                    "all"
                );
                const result = await SensorDataService.getSensorDataByDate(
                    this.selectedDate,
                    "all"
                );
                console.log("getSensorDataByDate result:", result);

                if (result && Array.isArray(result)) {
                    return result;
                } else if (
                    result &&
                    result.status === "success" &&
                    result.data
                ) {
                    return result.data;
                } else {
                    throw new Error("Không có dữ liệu từ API");
                }
            } else if (this.selectedDate === today) {
                console.log(
                    "Getting realtime data with limit:",
                    this.dataLimit,
                    "(no date parameter)"
                );
                const result = await SensorDataService.getChartData(
                    this.dataLimit
                );

                if (result && Array.isArray(result)) {
                    return result;
                } else if (
                    result &&
                    result.status === "success" &&
                    result.data
                ) {
                    return result.data;
                } else {
                    throw new Error("Không có dữ liệu từ API");
                }
            } else {
                console.log(
                    "Getting historical data for date:",
                    this.selectedDate,
                    "with limit:",
                    this.dataLimit
                );
                const result = await SensorDataService.getSensorDataByDate(
                    this.selectedDate,
                    this.dataLimit
                );

                if (result && Array.isArray(result)) {
                    return result;
                } else if (
                    result &&
                    result.status === "success" &&
                    result.data
                ) {
                    return result.data;
                } else {
                    throw new Error("Không có dữ liệu từ API");
                }
            }
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
            this.checkAndUpdateAutoRefresh();

            const data = await this.getSensorData();
            if (data && data.length > 0) {
                this.chartView.updateChart(data, this.currentSensorType);
                this.updateScrollIndicator(data.length);
                console.log(
                    "Chart refreshed silently with",
                    data.length,
                    "records"
                );
            } else {
                this.chartView.showNoDataMessage();
            }
        } catch (error) {
            console.error("Lỗi khi refresh biểu đồ:", error);
        }
    }

    startAutoRefresh() {
        const today = this.getLocalDateString();
        if (this.selectedDate === today) {
            let refreshInterval = 0;

            if (this.dataLimit === "all") {
                refreshInterval = 10000;
                console.log(
                    "Starting auto refresh for ALL data (10s interval)..."
                );
            } else {
                refreshInterval = 1000;
                console.log(
                    "Starting auto refresh for recent data (1s interval)..."
                );
            }

            this.refreshInterval = setInterval(() => {
                console.log("Auto refreshing chart...");
                this.refreshChartSilently();
            }, refreshInterval);
        } else {
            console.log("Auto refresh disabled - viewing historical data");
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
            console.log("Auto refresh stopped");
        }
    }

    checkAndUpdateAutoRefresh() {
        const today = this.getLocalDateString();
        const isToday = this.selectedDate === today;

        if (isToday && !this.refreshInterval) {
            console.log("Switching to realtime mode - starting auto refresh");
            this.startAutoRefresh();
        } else if (isToday && this.refreshInterval) {
            console.log("Updating auto refresh interval for current mode");
            this.stopAutoRefresh();
            this.startAutoRefresh();
        } else if (!isToday && this.refreshInterval) {
            console.log("Switching to historical mode - stopping auto refresh");
            this.stopAutoRefresh();
        }
    }

    destroy() {
        this.stopAutoRefresh();
        this.chartView.destroy();
    }
}

export default HomePageChartController;
