import SensorDataTable from "../view/table/sensor-data-table.js";
import SensorDataService from "../services/api.js";

class SensorDataTableController {
    constructor() {
        this.table = null;
        this.refreshInterval = null;
        this.isFilterPanelOpen = false;
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
            pageSize.addEventListener("change", (e) => {
                this.table.setItemsPerPage(e.target.value);
            });
        }

        const searchInput = document.getElementById("tableSearchInput");
        const clearSearch = document.getElementById("clearSearch");

        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const searchTerm = e.target.value.trim();
                this.table.setSearchTerm(searchTerm);

                if (clearSearch) {
                    clearSearch.style.display = searchTerm ? "block" : "none";
                }
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener("click", () => {
                if (searchInput) {
                    searchInput.value = "";
                    this.table.setSearchTerm("");
                    clearSearch.style.display = "none";
                    searchInput.focus();
                }
            });
        }

        const toggleFilter = document.getElementById("toggleFilterPanel");
        if (toggleFilter) {
            toggleFilter.addEventListener("click", () => {
                this.toggleFilterPanel();
            });
        }

        const applyDateFilter = document.getElementById("applyDateFilter");
        if (applyDateFilter) {
            applyDateFilter.addEventListener("click", () => {
                this.applyDateFilter();
            });
        }

        const clearDateFilter = document.getElementById("clearDateFilter");
        if (clearDateFilter) {
            clearDateFilter.addEventListener("click", () => {
                this.clearDateFilter();
            });
        }

        const applyRangeFilter = document.getElementById("applyRangeFilter");
        if (applyRangeFilter) {
            applyRangeFilter.addEventListener("click", () => {
                this.applyRangeFilter();
            });
        }

        const clearAllFilters = document.getElementById("clearAllFilters");
        if (clearAllFilters) {
            clearAllFilters.addEventListener("click", () => {
                this.clearAllFilters();
            });
        }

        const exportCSV = document.getElementById("exportCSV");
        if (exportCSV) {
            exportCSV.addEventListener("click", () => {
                this.table.exportToCSV();
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

    async loadData() {
        try {
            this.table.showLoading();
            const response = await SensorDataService.getSensorDataList(1000);

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
            this.table.hideLoading();
        }
    }

    toggleFilterPanel() {
        const filterPanel = document.getElementById("filterPanel");
        const toggleBtn = document.getElementById("toggleFilterPanel");
        const arrow = toggleBtn?.querySelector(".toggle-arrow svg");

        if (filterPanel && toggleBtn) {
            this.isFilterPanelOpen = !this.isFilterPanelOpen;

            if (this.isFilterPanelOpen) {
                filterPanel.style.display = "block";
                toggleBtn.classList.add("active");
                if (arrow) arrow.style.transform = "rotate(180deg)";
            } else {
                filterPanel.style.display = "none";
                toggleBtn.classList.remove("active");
                if (arrow) arrow.style.transform = "rotate(0deg)";
            }
        }

        this.updateFilterBadge();
    }

    applyDateFilter() {
        const dateFrom = document.getElementById("dateFrom")?.value;
        const dateTo = document.getElementById("dateTo")?.value;

        if (!dateFrom && !dateTo) {
            alert("Vui lòng chọn ít nhất một ngày");
            return;
        }

        this.table.setDateFilter(dateFrom, dateTo);
        this.updateFilterBadge();

        const clearBtn = document.getElementById("clearDateFilter");
        if (clearBtn) {
            clearBtn.style.display = dateFrom || dateTo ? "block" : "none";
        }
    }

    clearDateFilter() {
        const dateFrom = document.getElementById("dateFrom");
        const dateTo = document.getElementById("dateTo");
        const clearBtn = document.getElementById("clearDateFilter");

        if (dateFrom) dateFrom.value = "";
        if (dateTo) dateTo.value = "";
        if (clearBtn) clearBtn.style.display = "none";

        this.table.setDateFilter(null, null);
        this.updateFilterBadge();
    }

    applyRangeFilter() {
        const tempMin = document.getElementById("tempMin")?.value;
        const tempMax = document.getElementById("tempMax")?.value;
        const lightMin = document.getElementById("lightMin")?.value;
        const lightMax = document.getElementById("lightMax")?.value;
        const humidityMin = document.getElementById("humidityMin")?.value;
        const humidityMax = document.getElementById("humidityMax")?.value;

        this.table.setRangeFilters(
            tempMin,
            tempMax,
            lightMin,
            lightMax,
            humidityMin,
            humidityMax
        );
        this.updateFilterBadge();
    }

    clearAllFilters() {
        const dateFrom = document.getElementById("dateFrom");
        const dateTo = document.getElementById("dateTo");
        const tempMin = document.getElementById("tempMin");
        const tempMax = document.getElementById("tempMax");
        const lightMin = document.getElementById("lightMin");
        const lightMax = document.getElementById("lightMax");
        const humidityMin = document.getElementById("humidityMin");
        const humidityMax = document.getElementById("humidityMax");
        const searchInput = document.getElementById("tableSearchInput");
        const clearSearch = document.getElementById("clearSearch");
        const clearDateFilter = document.getElementById("clearDateFilter");

        if (dateFrom) dateFrom.value = "";
        if (dateTo) dateTo.value = "";
        if (tempMin) tempMin.value = "";
        if (tempMax) tempMax.value = "";
        if (lightMin) lightMin.value = "";
        if (lightMax) lightMax.value = "";
        if (humidityMin) humidityMin.value = "";
        if (humidityMax) humidityMax.value = "";
        if (searchInput) searchInput.value = "";

        if (clearSearch) clearSearch.style.display = "none";
        if (clearDateFilter) clearDateFilter.style.display = "none";

        this.table.clearAllFilters();
        this.updateFilterBadge();
    }

    updateFilterBadge() {
        const badge = document.getElementById("activeFiltersCount");
        const count = this.table.getActiveFiltersCount();

        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = "block";
            } else {
                badge.style.display = "none";
            }
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
    }
}

export default SensorDataTableController;
