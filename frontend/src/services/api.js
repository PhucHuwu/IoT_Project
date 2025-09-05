const API_BASE_URL = "http://localhost:5001/api/v1/sensors";

class SensorDataService {
  static async getLatestSensorData() {
    try {
      const response = await fetch(`${API_BASE_URL}/sensor-data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu cảm biến mới nhất:", error);
      throw error;
    }
  }

  static async getSensorDataList(limit = 5, timePeriod = null) {
    try {
      let url = `${API_BASE_URL}/sensor-data-list?limit=${limit}`;
      if (timePeriod) {
        url += `&timePeriod=${timePeriod}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi khi lấy danh sách dữ liệu cảm biến:", error);
      throw error;
    }
  }

  static async getChartData(timePeriod = "latest5") {
    try {
      let limit = 5;
      if (timePeriod === "latest10") limit = 10;
      else if (timePeriod === "latest20") limit = 20;
      else if (timePeriod === "latest5") limit = 5;

      const response = await fetch(
        `${API_BASE_URL}/sensor-data-list?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu biểu đồ:", error);
      throw error;
    }
  }

  static async getSensorDataByTimePeriod(timePeriod = "today") {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sensor-data-list?timePeriod=${timePeriod}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu theo thời gian:", error);
      throw error;
    }
  }
}

export default SensorDataService;
