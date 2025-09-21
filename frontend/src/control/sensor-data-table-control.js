import SensorDataTable from "../view/table/sensor-data-table.js";
import SensorDataService from "../services/api.js";
import UpdateIndicator from "../components/update-indicator.js";

class SensorDataTableController {
    constructor() {
        this.table = null;
        this.refreshInterval = null;
        this.updateIndicator = new UpdateIndicator();

        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = "";
        this.searchCriteria = "all";
        this.sortField = "timestamp";
        this.sortOrder = "desc";

        this.init();
    }

    init() {
        this.table = new SensorDataTable("sensorDataTable");
        this.setupEventListeners();
        this.loadData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        const pageSize = document.getElementById("tablePageSize");

        if (pageSize) {
            pageSize.value = this.itemsPerPage;

            pageSize.addEventListener("change", (e) => {
                const newPageSize = parseInt(e.target.value, 10);

                if (newPageSize && newPageSize > 0 && newPageSize <= 100) {
                    this.itemsPerPage = newPageSize;
                    this.currentPage = 1;
                    this.loadData();
                } else {
                    e.target.value = this.itemsPerPage;
                }
            });
        }

        const searchInput = document.getElementById("tableSearchInput");
        const clearSearch = document.getElementById("clearSearch");
        const searchCriteria = document.getElementById("searchCriteria");

        if (searchCriteria) {
            searchCriteria.addEventListener("change", (e) => {
                this.searchCriteria = e.target.value;
                this.updateSearchPlaceholder(e.target.value);
                this.currentPage = 1;
                this.loadData();
            });
        }

        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const newSearchTerm = e.target.value.trim();
                this.searchTerm = newSearchTerm;
                if (clearSearch) {
                    clearSearch.style.display = this.searchTerm
                        ? "block"
                        : "none";
                }
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadData();
                }, 500);
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener("click", () => {
                if (searchInput) {
                    searchInput.value = "";
                    this.searchTerm = "";
                    clearSearch.style.display = "none";
                    searchInput.focus();
                }
                if (searchCriteria) {
                    searchCriteria.value = "all";
                    this.searchCriteria = "all";
                    this.updateSearchPlaceholder("all");
                }
                this.currentPage = 1;
                this.loadData();
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
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadData();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener("click", () => {
                this.currentPage++;
                this.loadData();
            });
        }

        if (this.table.container) {
            const ths = this.table.container.querySelectorAll("thead th");
            const fieldMap = ["timestamp", "temperature", "light", "humidity"];

            ths.forEach((th, idx) => {
                const field = fieldMap[idx];
                if (!field) return;

                th.style.cursor = "pointer";
                th.addEventListener("click", () => {
                    this.handleSort(field);
                });
            });

            this.table.container.addEventListener("pageChange", (e) => {
                this.currentPage = e.detail.page;
                this.loadData();
            });
        }
    }

    updateSearchPlaceholder(criteria) {
        const searchInput = document.getElementById("tableSearchInput");
        if (!searchInput) return;

        const placeholders = {
            all: "Tìm kiếm dữ liệu (VD: 32.5, 00:17:07 21/09/2025)",
            temperature: "Tìm kiếm theo nhiệt độ (VD: 32.5 hoặc 32)",
            light: "Tìm kiếm theo ánh sáng (VD: 75.2 hoặc 75)",
            humidity: "Tìm kiếm theo độ ẩm (VD: 60.8 hoặc 60)",
            time: "Tìm kiếm theo thời gian (VD: 00:17:07 21/09/2025, 00:17 21/09/2025, 21/09/2025)",
        };

        searchInput.placeholder = placeholders[criteria] || placeholders.all;
    }

    handleSort(field) {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
        } else {
            this.sortField = field;
            this.sortOrder = "desc";
        }
        this.currentPage = 1;
        this.loadData();
    }

    async loadData(showLoading = true) {
        try {
            if (showLoading) {
                this.table.showLoading();
            }

            const crudParams = {
                page: this.currentPage,
                per_page: this.itemsPerPage,
                sort_field: this.sortField,
                sort_order: this.sortOrder,
                search: this.searchTerm,
                search_criteria: this.searchCriteria,
            };

            const response = await SensorDataService.getSensorDataList(
                "all",
                null,
                null,
                10,
                crudParams
            );

            if (response.status === "success" && response.data) {
                this.table.renderTable(
                    response.data,
                    response.pagination,
                    response.sort,
                    response.search
                );
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
            if (
                this.currentPage === 1 &&
                !this.searchTerm &&
                this.searchCriteria === "all"
            ) {
                const crudParams = {
                    page: 1,
                    per_page: 3,
                    sort_field: this.sortField,
                    sort_order: this.sortOrder,
                    search: "",
                    search_criteria: "all",
                };

                const response = await SensorDataService.getSensorDataList(
                    "all",
                    null,
                    null,
                    10,
                    crudParams
                );

                if (response.status === "success" && response.data) {
                    const currentData = this.table.getData();
                    if (
                        JSON.stringify(currentData.slice(0, 3)) !==
                        JSON.stringify(response.data)
                    ) {
                        this.updateIndicator.show();
                        if (!this.searchTerm && this.searchCriteria === "all") {
                            this.loadData(false);
                        }
                    }
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
        if (this.table) {
            this.table.destroy();
        }
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}

export default SensorDataTableController;
