const API_BASE_URL = "http://localhost:5000/api/v1/sensors";

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

    static async getSensorDataList(limit = 5, sample = 1, crudParams = {}) {
        try {
            const limitParam =
                typeof limit === "string" && limit.toLowerCase() === "all"
                    ? "all"
                    : Number(limit);

            let url = `${API_BASE_URL}/sensor-data-list?limit=${limitParam}&sample=${sample}`;

            if (crudParams.page) url += `&page=${crudParams.page}`;
            if (crudParams.per_page) url += `&per_page=${crudParams.per_page}`;
            if (crudParams.sort_field)
                url += `&sort_field=${crudParams.sort_field}`;
            if (crudParams.sort_order)
                url += `&sort_order=${crudParams.sort_order}`;
            if (crudParams.search)
                url += `&search=${encodeURIComponent(crudParams.search)}`;
            if (crudParams.search_criteria)
                url += `&search_criteria=${crudParams.search_criteria}`;

            console.log("Final API URL:", url);
            console.log("Search params:", {
                search: crudParams.search,
                search_criteria: crudParams.search_criteria,
            });

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

    static async getChartData(limit = "50") {
        try {
            console.log("Getting chart data with limit:", limit);

            let limitParam = limit;
            if (typeof limit === "string" && limit !== "all") {
                limitParam = parseInt(limit);
            }

            const url = `${API_BASE_URL}/sensor-data/chart?limit=${limitParam}`;
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

    static async getSensorDataByDate(date, limit = "50") {
        try {
            let url = `${API_BASE_URL}/sensor-data/chart?date=${date}`;
            if (limit) {
                url += `&limit=${limit}`;
            }

            console.log("API URL for getSensorDataByDate:", url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu theo ngày:", error);
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

    static async getLEDStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/led-status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Lỗi khi lấy trạng thái LED:", error);
            throw error;
        }
    }

    static async getActionHistory(limit = 50, crudParams = {}) {
        try {
            let url = `${API_BASE_URL}/action-history?limit=${limit}`;

            if (crudParams.page) url += `&page=${crudParams.page}`;
            if (crudParams.per_page) url += `&per_page=${crudParams.per_page}`;
            if (crudParams.sort_field)
                url += `&sort_field=${crudParams.sort_field}`;
            if (crudParams.sort_order)
                url += `&sort_order=${crudParams.sort_order}`;
            if (crudParams.search)
                url += `&search=${encodeURIComponent(crudParams.search)}`;
            if (crudParams.device_filter)
                url += `&device_filter=${crudParams.device_filter}`;
            if (crudParams.state_filter)
                url += `&state_filter=${crudParams.state_filter}`;

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
