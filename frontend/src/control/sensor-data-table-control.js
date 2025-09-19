import SensorDataTable from "../view/table/sensor-data-table.js";
import SensorDataService from "../services/api.js";
import UpdateIndicator from "../components/update-indicator.js";

class SensorDataTableController {
    constructor() {
        this.table = null;
        this.refreshInterval = null;
        this.updateIndicator = new UpdateIndicator();
        this.init();
    }

    init() {
        this.table = new SensorDataTable("sensorDataTable");
        // Default: show most recent entries first
        if (this.table && typeof this.table.setSort === "function") {
            this.table.setSort("timestamp", "desc");
        }
        this.setupEventListeners();
        this.initializeSearchCriteria();
        this.loadData();
        this.startAutoRefresh();
    }

    initializeSearchCriteria() {
        const searchCriteria = document.getElementById("searchCriteria");
        if (searchCriteria) {
            // Sync dropdown value với table
            this.table.setSearchCriteria(searchCriteria.value);
            this.updateSearchPlaceholder(searchCriteria.value);
        }
    }

    setupEventListeners() {
        const pageSize = document.getElementById("tablePageSize");
        if (pageSize) {
            pageSize.addEventListener("change", (e) => {
                this.table.setItemsPerPage(e.target.value);
            });
        }

        const searchInput = document.getElementById("tableSearchInput");
        const clearSearch = document.getElementById("clearSearch");
        const searchCriteria = document.getElementById("searchCriteria");

        if (searchCriteria) {
            searchCriteria.addEventListener("change", (e) => {
                this.table.setSearchCriteria(e.target.value);
                this.updateSearchPlaceholder(e.target.value);
            });
        }

        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const searchTerm = e.target.value.trim();
                // Ensure search criteria is current before setting search term
                const currentCriteria =
                    document.getElementById("searchCriteria");
                if (currentCriteria) {
                    this.table.setSearchCriteria(currentCriteria.value);
                }
                this.table.setSearchTerm(searchTerm);

                if (clearSearch) {
                    clearSearch.style.display = searchTerm ? "block" : "none";
                }
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener("click", () => {
                const searchCriteria =
                    document.getElementById("searchCriteria");
                if (searchInput) {
                    searchInput.value = "";
                    this.table.setSearchTerm("");
                    clearSearch.style.display = "none";
                    searchInput.focus();
                }
                if (searchCriteria) {
                    searchCriteria.value = "all";
                    this.table.setSearchCriteria("all");
                    this.updateSearchPlaceholder("all");
                }
            });
        }

        const exportCSV = document.getElementById("exportCSV");
        if (exportCSV) {
            exportCSV.addEventListener("click", () => {
                this.table.exportToCSV();
            });
        }

        const manualRefresh = document.getElementById("manualRefresh");
        if (manualRefresh) {
            manualRefresh.addEventListener("click", () => {
                this.manualRefreshData(manualRefresh);
            });
        }

        const prevPage = document.getElementById("prevPage");
        const nextPage = document.getElementById("nextPage");

        if (prevPage) {
            prevPage.addEventListener("click", () => {
                this.table.goToPage(this.table.currentPage - 1);
            });
        }

        if (nextPage) {
            nextPage.addEventListener("click", () => {
                this.table.goToPage(this.table.currentPage + 1);
            });
        }
    }

    updateSearchPlaceholder(criteria) {
        const searchInput = document.getElementById("tableSearchInput");
        if (!searchInput) return;

        const placeholders = {
            all: "Tìm kiếm dữ liệu",
            temperature: "Tìm kiếm theo nhiệt độ (VD: 25.5)",
            light: "Tìm kiếm theo ánh sáng (VD: 75.2)",
            humidity: "Tìm kiếm theo độ ẩm (VD: 60.8)",
            time: "Tìm kiếm theo thời gian (VD: 12/09 hoặc 14:30)",
        };

        searchInput.placeholder = placeholders[criteria] || placeholders.all;
    }

    async loadData(showLoading = true) {
        try {
            if (showLoading) {
                this.table.showLoading();
            }
            const response = await SensorDataService.getSensorDataList(
                "all",
                null,
                null,
                10
            );

            if (response.status === "success" && response.data) {
                this.table.renderTable(response.data);
            } else {
                console.error("Lỗi khi tải dữ liệu bảng:", response.message);
                this.table.renderTable([]);
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu bảng:", error);
            this.table.renderTable([]);
        } finally {
            if (showLoading) {
                this.table.hideLoading();
            }
        }
    }

    async manualRefreshData(button) {
        if (button) {
            button.classList.add("spinning");
            button.disabled = true;
        }

        try {
            await this.loadData(false);
            this.updateIndicator.show();
            console.log("Dữ liệu đã được làm mới thủ công");
        } finally {
            if (button) {
                setTimeout(() => {
                    button.classList.remove("spinning");
                    button.disabled = false;
                }, 1000);
            }
        }
    }

    async refreshDataSilently() {
        try {
            const response = await SensorDataService.getSensorDataList(
                "all",
                null,
                null,
                3
            );

            if (response.status === "success" && response.data) {
                const currentData = this.table.getData();

                if (
                    JSON.stringify(currentData) !==
                    JSON.stringify(response.data)
                ) {
                    this.updateIndicator.show();
                    this.table.updateData(response.data);
                    console.log("Dữ liệu đã được cập nhật");
                }
            }
        } catch (error) {
            console.error("Lỗi khi refresh dữ liệu:", error);
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refreshDataSilently();
        }, 30000);

        console.log(
            "Auto refresh enabled - Dữ liệu sẽ được cập nhật mỗi 30 giây"
        );
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
        if (this.updateIndicator) {
            this.updateIndicator.destroy();
        }
    }
}

export default SensorDataTableController;
