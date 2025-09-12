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

  static async getSensorDataList(limit = 5, timePeriod = null, filters = null) {
    try {
      let url = `${API_BASE_URL}/sensor-data-list?limit=${limit}`;
      if (timePeriod) {
        url += `&timePeriod=${timePeriod}`;
      }

      if (filters) {
        if (filters.dateFrom) url += `&dateFrom=${filters.dateFrom}`;
        if (filters.dateTo) url += `&dateTo=${filters.dateTo}`;
        if (filters.tempMin !== null) url += `&tempMin=${filters.tempMin}`;
        if (filters.tempMax !== null) url += `&tempMax=${filters.tempMax}`;
        if (filters.lightMin !== null) url += `&lightMin=${filters.lightMin}`;
        if (filters.lightMax !== null) url += `&lightMax=${filters.lightMax}`;
        if (filters.humidityMin !== null)
          url += `&humidityMin=${filters.humidityMin}`;
        if (filters.humidityMax !== null)
          url += `&humidityMax=${filters.humidityMax}`;
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
      console.log("Getting chart data for period:", timePeriod);
      let limit = 5;
      if (timePeriod === "latest10") limit = 10;
      else if (timePeriod === "latest20") limit = 20;
      else if (timePeriod === "latest5") limit = 5;

      const url = `${API_BASE_URL}/sensor-data-list?limit=${limit}`;
      console.log("API URL:", url);

      const response = await fetch(url);
      console.log("API Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response data:", result);

      return result;
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

  static async controlLED(ledId, action) {
    try {
      const response = await fetch(`${API_BASE_URL}/led-control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          led_id: ledId,
          action: action,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Lỗi khi điều khiển LED:", error);
      throw error;
    }
  }

  static async getActionHistory(limit = 50) {
    try {
      const url = `${API_BASE_URL}/action-history?limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử hành động:", error);
      throw error;
    }
  }
}

export default SensorDataService;
