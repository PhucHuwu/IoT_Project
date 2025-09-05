import SensorDataService from "../services/api.js";
import SensorDataChart from "../view/charts/sensor-data-chart.js";

class SensorDataChartController {
  constructor() {
    this.chartView = new SensorDataChart();
    this.currentSensorType = "temperature";
    this.currentTimePeriod = "today";
    this.isLoading = false;
  }

  async init() {
    this.setupEventListeners();
    await this.loadChart();
  }

  setupEventListeners() {
    const sensorTypeSelector = document.getElementById("sensorTypeSelector");
    const timePeriodSelector = document.getElementById("timePeriod");

    if (sensorTypeSelector) {
      sensorTypeSelector.addEventListener("change", (e) => {
        this.currentSensorType = e.target.value;
        this.loadChart();
      });
    }

    if (timePeriodSelector) {
      timePeriodSelector.addEventListener("change", (e) => {
        this.currentTimePeriod = e.target.value;
        this.loadChart();
      });
    }
  }

  async loadChart() {
    if (this.isLoading) return;

    try {
      console.log(
        `Loading chart for sensor type: ${this.currentSensorType}, time period: ${this.currentTimePeriod}`
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
        `http://localhost:5001/api/v1/sensors/sensor-data/chart?timePeriod=${this.currentTimePeriod}`
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

  destroy() {
    this.chartView.destroy();
  }
}

export default SensorDataChartController;
