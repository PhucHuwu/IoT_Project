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

  static async getSensorDataList(limit = 5) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sensor-data-list?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi khi lấy danh sách dữ liệu cảm biến:", error);
      throw error;
    }
  }

  static async getChartData(timePeriod = "today") {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sensor-data/chart?timePeriod=${timePeriod}`
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
}

export default SensorDataService;
