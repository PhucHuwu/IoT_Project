let sensorChart;
let realTimeIntervals = {
    chart: null,
    table: null,
};

let currentSensorType = "temperature";
let dataLimit = 100;
let fullData = {};

let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let tableData = [];
let filteredData = [];
let searchQuery = "";
let dateFilters = { from: "", to: "" };
let rangeFilters = {
    temperature: { min: "", max: "" },
    light: { min: "", max: "" },
    humidity: { min: "", max: "" },
};

document.addEventListener("DOMContentLoaded", () => {
    initializeSensorDataPage();
    setupSensorDropdown();
    setupTimePeriodDropdown();
    setupDataLimitControls();
    initializeDataTable();

    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
        item.addEventListener("click", function () {
            navItems.forEach((nav) => nav.classList.remove("active"));
            this.classList.add("active");
        });
    });
});

async function initializeSensorDataPage() {
    await updateChartByPeriod(currentSensorType, "today");

    startRealTimeUpdates("chart");
    startRealTimeUpdates("table");
}

function setupSensorDropdown() {
    const sensorDropdown = document.getElementById("sensorTypeSelector");

    if (sensorDropdown) {
        setupCustomDropdown(sensorDropdown, async (value) => {
            currentSensorType = value;

            updateChartTitleAndUnit(value);

            const timePeriod = document.getElementById("timePeriod").value;
            await updateChartByPeriod(value, timePeriod);

            if (timePeriod === "today") {
                startRealTimeUpdates("chart");
            } else {
                stopRealTimeUpdates("chart");
            }
        });
    }
}

function setupTimePeriodDropdown() {
    const timePeriodDropdown = document.getElementById("timePeriod");

    if (timePeriodDropdown) {
        timePeriodDropdown.addEventListener("change", async function () {
            await updateChartByPeriod(currentSensorType, this.value);

            if (this.value === "today") {
                startRealTimeUpdates("chart");
            } else {
                stopRealTimeUpdates("chart");
            }
        });
    }
}

function setupDataLimitControls() {
    const dataLimitContainer = document.querySelector(".chart-limit-control");
    if (dataLimitContainer) {
        dataLimitContainer.style.display = "none";
    }
}

function updateChartTitleAndUnit(sensorType) {
    const chartTitle = document.getElementById("chartTitle");
    const chartUnit = document.getElementById("chartUnit");

    if (chartTitle && chartUnit) {
        switch (sensorType) {
            case "temperature":
                chartTitle.textContent = "Nhiệt độ theo thời gian";
                chartUnit.textContent = "°C";
                break;
            case "light":
                chartTitle.textContent = "Ánh sáng theo thời gian";
                chartUnit.textContent = "%";
                break;
            case "humidity":
                chartTitle.textContent = "Độ ẩm theo thời gian";
                chartUnit.textContent = "%";
                break;
            case "all":
                chartTitle.textContent = "Tất cả cảm biến theo thời gian";
                chartUnit.textContent = "°C / %";
                break;
        }
    }
}

async function updateChartByPeriod(sensorType, period) {
    try {
        let data;

        if (period === "today") {
            data = await window.iotAPI.getSensorHistory("today");
        } else if (period === "1day") {
            data = await window.iotAPI.getSensorHistory("1day");
        } else if (period === "2days") {
            data = await window.iotAPI.getSensorHistory("2days");
        }

        if (!data || !data.labels || data.labels.length === 0) {
            console.warn(`No data available for ${sensorType} - ${period}`);
            createEmptyChart();
            return;
        }

        fullData = data;

        updateSensorChart(data, sensorType);
    } catch (error) {
        console.error(
            `Error updating ${sensorType} chart for period ${period}:`,
            error
        );
        createEmptyChart();
    }
}

function createEmptyChart() {
    const emptyData = {
        labels: [],
        temperature: [],
        light: [],
        humidity: [],
    };

    updateSensorChart(emptyData, currentSensorType);
}

function updateSensorChart(data, sensorType) {
    const ctx = document.getElementById("sensorChart");
    if (!ctx) return;

    if (sensorChart) {
        sensorChart.destroy();
    }

    const chartContainer = document.querySelector(".chart-container");
    if (chartContainer) {
        chartContainer.style.minWidth = "100%";
        chartContainer.style.width = "100%";
    }

    const scrollIndicator = document.getElementById("chartScrollIndicator");
    if (scrollIndicator) {
        scrollIndicator.style.display = "none";
    }

    if (sensorType === "all") {
        sensorChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: data.labels || [],
                datasets: [
                    {
                        label: "Nhiệt độ",
                        data: data.temperature || [],
                        borderColor: "#007AFF",
                        backgroundColor: "#007AFF20",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: "#007AFF",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 1,
                        pointHoverBackgroundColor: "#007AFF",
                        pointHoverBorderColor: "#fff",
                        pointHoverBorderWidth: 2,
                        spanGaps: false,
                        yAxisID: "y",
                    },
                    {
                        label: "Ánh sáng",
                        data: data.light || [],
                        borderColor: "#FF9500",
                        backgroundColor: "#FF950020",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: "#FF9500",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 1,
                        pointHoverBackgroundColor: "#FF9500",
                        pointHoverBorderColor: "#fff",
                        pointHoverBorderWidth: 2,
                        spanGaps: false,
                        yAxisID: "y1",
                    },
                    {
                        label: "Độ ẩm",
                        data: data.humidity || [],
                        borderColor: "#34C759",
                        backgroundColor: "#34C75920",
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: "#34C759",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 1,
                        pointHoverBackgroundColor: "#34C759",
                        pointHoverBorderColor: "#fff",
                        pointHoverBorderWidth: 2,
                        spanGaps: false,
                        yAxisID: "y1",
                    },
                ],
            },
            options: getCombinedChartOptions(),
        });
    } else {
        let chartData, chartColor, chartLabel, unit;

        switch (sensorType) {
            case "temperature":
                chartData = data.temperature || [];
                chartColor = "#007AFF";
                chartLabel = "Nhiệt độ";
                unit = "°C";
                break;
            case "light":
                chartData = data.light || [];
                chartColor = "#FF9500";
                chartLabel = "Ánh sáng";
                unit = "%";
                break;
            case "humidity":
                chartData = data.humidity || [];
                chartColor = "#34C759";
                chartLabel = "Độ ẩm";
                unit = "%";
                break;
            default:
                chartData = data.temperature || [];
                chartColor = "#007AFF";
                chartLabel = "Nhiệt độ";
                unit = "°C";
        }

        sensorChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: data.labels || [],
                datasets: [
                    {
                        label: chartLabel,
                        data: chartData,
                        borderColor: chartColor,
                        backgroundColor: `${chartColor}20`,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        pointBackgroundColor: chartColor,
                        pointBorderColor: "#fff",
                        pointBorderWidth: 1,
                        pointHoverBackgroundColor: chartColor,
                        pointHoverBorderColor: "#fff",
                        pointHoverBorderWidth: 2,
                        spanGaps: false,
                    },
                ],
            },
            options: getSensorChartOptions(unit, chartData, sensorType),
        });
    }
}

function getCombinedChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: "index",
        },
        animation: {
            duration: 300,
        },
        plugins: {
            legend: {
                display: true,
                position: "top",
                labels: {
                    usePointStyle: true,
                    pointStyle: "line",
                    padding: 20,
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "rgba(255, 255, 255, 0.2)",
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    label: function (context) {
                        const unit = context.datasetIndex === 0 ? "°C" : "%";
                        return `${context.dataset.label}: ${context.parsed.y}${unit}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: true,
                    color: "rgba(240, 240, 240, 0.5)",
                    lineWidth: 1,
                },
                ticks: {
                    color: "#666",
                    font: { size: 11 },
                    maxRotation: 45,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 20,
                },
            },
            y: {
                type: "linear",
                display: true,
                position: "left",
                grid: {
                    color: "rgba(240, 240, 240, 0.7)",
                    lineWidth: 1,
                },
                ticks: {
                    color: "#666",
                    font: { size: 11 },
                    callback: function (value) {
                        return value + "°C";
                    },
                },
                title: {
                    display: true,
                    text: "Nhiệt độ (°C)",
                    color: "#666",
                    font: {
                        size: 12,
                        weight: "bold",
                    },
                },
            },
            y1: {
                type: "linear",
                display: true,
                position: "right",
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    color: "#666",
                    font: { size: 11 },
                    callback: function (value) {
                        return value + "%";
                    },
                },
                title: {
                    display: true,
                    text: "Ánh sáng / Độ ẩm (%)",
                    color: "#666",
                    font: {
                        size: 12,
                        weight: "bold",
                    },
                },
                min: 0,
                max: 100,
            },
        },
    };
}

function getSensorChartOptions(unit, data, sensorType) {
    let minValue, maxValue;

    if (sensorType === "all") {
        minValue = 0;
        maxValue = 100;
    } else if (sensorType === "temperature") {
        if (data.length > 0) {
            const validData = data.filter((v) => v !== null && v !== undefined);
            if (validData.length > 0) {
                const min = Math.min(...validData);
                const max = Math.max(...validData);
                const padding = Math.max((max - min) * 0.1, 2);
                minValue = Math.max(0, Math.floor(min - padding));
                maxValue = Math.ceil(max + padding);
            } else {
                minValue = 0;
                maxValue = 50;
            }
        } else {
            minValue = 0;
            maxValue = 50;
        }
    } else {
        minValue = 0;
        maxValue = 100;
    }

    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: "index",
        },
        animation: {
            duration: 300,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "rgba(255, 255, 255, 0.2)",
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ${context.parsed.y}${unit}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: true,
                    color: "rgba(240, 240, 240, 0.5)",
                    lineWidth: 1,
                },
                ticks: {
                    color: "#666",
                    font: { size: 11 },
                    maxRotation: 45,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 20,
                },
            },
            y: {
                type: "linear",
                display: true,
                position: "left",
                grid: {
                    color: "rgba(240, 240, 240, 0.7)",
                    lineWidth: 1,
                },
                ticks: {
                    color: "#666",
                    font: { size: 11 },
                    callback: function (value) {
                        return value + unit;
                    },
                },
                min: minValue,
                max: maxValue,
            },
            y1: {
                type: "linear",
                display: true,
                position: "right",
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    color: "#666",
                    font: { size: 11 },
                    callback: function (value) {
                        return value + unit;
                    },
                },
                min: minValue,
                max: maxValue,
            },
        },
    };
}

function startRealTimeUpdates(chartType) {
    stopRealTimeUpdates(chartType);

    if (chartType === "chart") {
        const currentSelection = getCurrentPeriodSelection();
        if (currentSelection !== "today") return;
    }

    realTimeIntervals[chartType] = setInterval(async () => {
        try {
            if (chartType === "table") {
                await loadTableData();
            } else if (chartType === "chart") {
                const currentPeriod = getCurrentPeriodSelection();
                if (currentPeriod === "today") {
                    const latestData = await window.iotAPI.getSensorHistory(
                        "today"
                    );
                    if (
                        latestData &&
                        latestData.labels &&
                        latestData.labels.length > 0
                    ) {
                        fullData = latestData;
                        updateSensorChart(latestData, currentSensorType);
                    }
                } else {
                    stopRealTimeUpdates(chartType);
                }
            }
        } catch (error) {
            console.error(`Error in real-time update for ${chartType}:`, error);
        }
    }, 15000);
}

function stopRealTimeUpdates(chartType) {
    if (realTimeIntervals[chartType]) {
        clearInterval(realTimeIntervals[chartType]);
        realTimeIntervals[chartType] = null;
    }
}

function getCurrentPeriodSelection() {
    const dropdown = document.getElementById("timePeriod");
    return dropdown ? dropdown.value : "today";
}

window.addEventListener("beforeunload", () => {
    stopRealTimeUpdates("chart");
    stopRealTimeUpdates("table");
});

function initializeDataTable() {
    setupTableControls();
    setupFilterControls();
    loadTableData().then(() => {
        const hasActiveFilters =
            searchQuery ||
            dateFilters.from ||
            dateFilters.to ||
            Object.values(rangeFilters).some(
                (filter) => filter.min !== "" || filter.max !== ""
            );

        if (hasActiveFilters) {
            applyFiltersAndSearch();
        }
    });
}

function setupTableControls() {
    const pageSizeDropdown = document.getElementById("tablePageSize");
    const exportBtn = document.getElementById("exportCSV");

    if (pageSizeDropdown) {
        setupCustomDropdown(pageSizeDropdown, (value) => {
            pageSize = parseInt(value);
            currentPage = 1;
            loadTableData();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", function () {
            const originalText = this.innerHTML;
            this.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Đang xuất...';
            this.disabled = true;

            exportTableDataToCSV().finally(() => {
                this.innerHTML = originalText;
                this.disabled = false;
            });
        });
    }

    setupPaginationControls();
}

function setupFilterControls() {
    setupFilterToggle();

    const searchInput = document.getElementById("tableSearchInput");
    const clearSearchBtn = document.getElementById("clearSearch");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            searchQuery = this.value.toLowerCase();
            currentPage = 1;

            if (searchQuery) {
                clearSearchBtn.style.display = "block";
            } else {
                clearSearchBtn.style.display = "none";
            }

            applyFiltersAndSearch();
            updateActiveFiltersCount();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", function () {
            searchInput.value = "";
            searchQuery = "";
            clearSearchBtn.style.display = "none";
            currentPage = 1;
            applyFiltersAndSearch();
            updateActiveFiltersCount();
        });
    }

    const dateFromInput = document.getElementById("dateFrom");
    const dateToInput = document.getElementById("dateTo");
    const applyDateFilterBtn = document.getElementById("applyDateFilter");
    const clearDateFilterBtn = document.getElementById("clearDateFilter");

    if (applyDateFilterBtn) {
        applyDateFilterBtn.addEventListener("click", function () {
            dateFilters.from = dateFromInput.value;
            dateFilters.to = dateToInput.value;

            if (dateFilters.from || dateFilters.to) {
                clearDateFilterBtn.style.display = "inline-flex";
                applyDateFilterBtn.classList.add("filter-active");
            }

            currentPage = 1;
            applyFiltersAndSearch();
            updateActiveFiltersCount();
        });
    }

    if (clearDateFilterBtn) {
        clearDateFilterBtn.addEventListener("click", function () {
            dateFromInput.value = "";
            dateToInput.value = "";
            dateFilters.from = "";
            dateFilters.to = "";
            clearDateFilterBtn.style.display = "none";
            applyDateFilterBtn.classList.remove("filter-active");
            currentPage = 1;
            applyFiltersAndSearch();
            updateActiveFiltersCount();
        });
    }

    const tempMinInput = document.getElementById("tempMin");
    const tempMaxInput = document.getElementById("tempMax");
    const lightMinInput = document.getElementById("lightMin");
    const lightMaxInput = document.getElementById("lightMax");
    const humidityMinInput = document.getElementById("humidityMin");
    const humidityMaxInput = document.getElementById("humidityMax");
    const applyRangeFilterBtn = document.getElementById("applyRangeFilter");
    const clearAllFiltersBtn = document.getElementById("clearAllFilters");

    if (applyRangeFilterBtn) {
        applyRangeFilterBtn.addEventListener("click", function () {
            rangeFilters.temperature.min = tempMinInput.value;
            rangeFilters.temperature.max = tempMaxInput.value;
            rangeFilters.light.min = lightMinInput.value;
            rangeFilters.light.max = lightMaxInput.value;
            rangeFilters.humidity.min = humidityMinInput.value;
            rangeFilters.humidity.max = humidityMaxInput.value;

            const hasRangeFilters = Object.values(rangeFilters).some(
                (filter) => filter.min !== "" || filter.max !== ""
            );

            if (hasRangeFilters) {
                applyRangeFilterBtn.classList.add("filter-active");
            }

            currentPage = 1;
            applyFiltersAndSearch();
            updateActiveFiltersCount();
        });
    }

    if (clearAllFiltersBtn) {
        clearAllFiltersBtn.addEventListener("click", function () {
            if (searchInput) {
                searchInput.value = "";
                clearSearchBtn.style.display = "none";
            }
            if (dateFromInput) dateFromInput.value = "";
            if (dateToInput) dateToInput.value = "";
            if (tempMinInput) tempMinInput.value = "";
            if (tempMaxInput) tempMaxInput.value = "";
            if (lightMinInput) lightMinInput.value = "";
            if (lightMaxInput) lightMaxInput.value = "";
            if (humidityMinInput) humidityMinInput.value = "";
            if (humidityMaxInput) humidityMaxInput.value = "";

            searchQuery = "";
            dateFilters = { from: "", to: "" };
            rangeFilters = {
                temperature: { min: "", max: "" },
                light: { min: "", max: "" },
                humidity: { min: "", max: "" },
            };

            clearDateFilterBtn.style.display = "none";
            applyDateFilterBtn.classList.remove("filter-active");
            applyRangeFilterBtn.classList.remove("filter-active");

            currentPage = 1;
            loadTableData();
            updateActiveFiltersCount();
        });
    }
}

function setupPaginationControls() {
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                refreshTableDisplay();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            const isFiltered =
                filteredData && filteredData.length !== tableData.length;
            const totalPages = isFiltered
                ? Math.ceil(filteredData.length / pageSize)
                : Math.ceil(totalRecords / pageSize);

            if (currentPage < totalPages) {
                currentPage++;
                refreshTableDisplay();
            }
        });
    }
}

async function loadTableData() {
    try {
        console.log("Loading table data...", { currentPage, pageSize });
        showTableLoading(true);

        const response = await window.iotAPI.getAllSensorData(
            currentPage,
            pageSize
        );
        console.log("API Response:", response);

        if (response && response.data) {
            tableData = response.data;
            totalRecords = response.pagination
                ? response.pagination.total_records
                : response.data.length;

            console.log("Table data loaded:", {
                recordCount: tableData.length,
                totalRecords,
                currentPage,
                pageSize,
            });

            filteredData = [...tableData];

            renderTable();
            updatePagination();
        } else {
            console.warn("No data in API response");
            showEmptyState();
        }
    } catch (error) {
        console.error("Error loading table data:", error);
        showEmptyState("Lỗi khi tải dữ liệu");
    } finally {
        showTableLoading(false);
    }
}

function renderTable() {
    const tbody = document.getElementById("sensorTableBody");
    if (!tbody) return;

    if (!tableData || tableData.length === 0) {
        showEmptyState();
        return;
    }

    tbody.innerHTML = tableData
        .map((record) => {
            const timestamp = formatDateTime(
                record.timestamp || record.created_at
            );
            const temperature =
                record.temperature !== undefined && record.temperature !== null
                    ? record.temperature.toFixed(2)
                    : "-";
            const light =
                record.light !== undefined && record.light !== null
                    ? record.light.toFixed(2)
                    : "-";
            const humidity =
                record.humidity !== undefined && record.humidity !== null
                    ? record.humidity.toFixed(1)
                    : "-";

            return `
            <tr>
                <td class="time-value">${timestamp}</td>
                <td class="temp-value">${temperature}</td>
                <td class="light-value">${light}</td>
                <td class="humidity-value">${humidity}</td>
            </tr>
        `;
        })
        .join("");
}

function formatDateTime(timestamp) {
    try {
        let date;

        if (timestamp && timestamp.$date) {
            date = new Date(timestamp.$date);
        } else if (typeof timestamp === "string") {
            let cleanTimestamp = timestamp.replace(/ GMT$/, "");
            date = new Date(cleanTimestamp);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            return "N/A";
        }

        if (isNaN(date.getTime())) {
            return "Invalid Date";
        }

        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return "N/A";
    }
}

function showTableLoading(show) {
    const loading = document.getElementById("tableLoading");
    const table = document.getElementById("sensorDataTable");

    if (loading && table) {
        if (show) {
            loading.style.display = "flex";
            table.style.display = "none";
        } else {
            loading.style.display = "none";
            table.style.display = "table";
        }
    }
}

function showEmptyState(message = "Không có dữ liệu") {
    const tbody = document.getElementById("sensorTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="table-empty">
                <i class="fas fa-database"></i>
                <h4>Không có dữ liệu</h4>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function updatePagination() {
    const isFiltered = filteredData && filteredData.length !== tableData.length;

    if (isFiltered) {
        updateFilteredPagination();
    } else {
        const totalPages = Math.ceil(totalRecords / pageSize);
        const startRecord =
            totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
        const endRecord = Math.min(currentPage * pageSize, totalRecords);

        const paginationInfo = document.getElementById("paginationInfo");
        if (paginationInfo) {
            paginationInfo.textContent = `Hiển thị ${startRecord} - ${endRecord} của ${totalRecords} bản ghi`;
        }

        const prevBtn = document.getElementById("prevPage");
        const nextBtn = document.getElementById("nextPage");

        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages;
        }

        renderPageNumbers(totalPages);
    }
}

function renderPageNumbers(totalPages) {
    const pageNumbers = document.getElementById("pageNumbers");
    if (!pageNumbers) return;

    let pages = [];

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        if (currentPage <= 4) {
            pages = [1, 2, 3, 4, 5, "...", totalPages];
        } else if (currentPage >= totalPages - 3) {
            pages = [
                1,
                "...",
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];
        } else {
            pages = [
                1,
                "...",
                currentPage - 1,
                currentPage,
                currentPage + 1,
                "...",
                totalPages,
            ];
        }
    }

    pageNumbers.innerHTML = pages
        .map((page) => {
            if (page === "...") {
                return '<span class="page-ellipsis">...</span>';
            } else {
                const isActive = page === currentPage ? "active" : "";
                return `<button class="page-number ${isActive}" onclick="goToPage(${page})">${page}</button>`;
            }
        })
        .join("");
}

function goToPage(page) {
    const isFiltered = filteredData && filteredData.length !== tableData.length;
    const totalPages = isFiltered
        ? Math.ceil(filteredData.length / pageSize)
        : Math.ceil(totalRecords / pageSize);

    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        refreshTableDisplay();
    }
}

function refreshTableDisplay() {
    const isFiltered = filteredData && filteredData.length !== tableData.length;

    if (isFiltered) {
        renderFilteredTable();
        updateFilteredPagination();
    } else {
        loadTableData();
    }
}

function setupCustomDropdown(trigger, onSelect) {
    const dropdown = trigger.closest(".custom-dropdown");
    const menu = dropdown.querySelector(".dropdown-menu");
    const options = menu.querySelectorAll(".dropdown-option");
    const triggerText = trigger.querySelector("span");

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isActive = trigger.classList.contains("active");

        document.querySelectorAll(".dropdown-trigger.active").forEach((t) => {
            t.classList.remove("active");
            t.closest(".custom-dropdown")
                .querySelector(".dropdown-menu")
                .classList.remove("active");
        });

        if (!isActive) {
            trigger.classList.add("active");
            menu.classList.add("active");
        }
    });

    options.forEach((option) => {
        option.addEventListener("click", () => {
            const value = option.getAttribute("data-value");
            const text = option.textContent;

            options.forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");
            triggerText.textContent = text;

            trigger.classList.remove("active");
            menu.classList.remove("active");

            if (onSelect) {
                onSelect(value);
            }
        });
    });

    document.addEventListener("click", () => {
        trigger.classList.remove("active");
        menu.classList.remove("active");
    });
}

async function exportTableDataToCSV() {
    try {
        console.log("Starting CSV export...");

        const response = await window.iotAPI.getAllSensorData(1, 10000);
        console.log("Export API response:", response);

        if (!response || !response.data || response.data.length === 0) {
            alert("Không có dữ liệu để xuất!");
            return;
        }

        const data = response.data;
        console.log(`Exporting ${data.length} records`);

        const headers = [
            "Thời gian",
            "Cảm biến nhiệt độ (°C)",
            "Cảm biến ánh sáng (%)",
            "Cảm biến độ ẩm (%)",
        ];

        let csvContent = "\uFEFF" + headers.join(",") + "\n";

        data.forEach((row, index) => {
            try {
                const timeValue = formatDateTime(
                    row.timestamp || row.created_at
                );
                const tempValue =
                    row.temperature !== undefined && row.temperature !== null
                        ? parseFloat(row.temperature).toFixed(2)
                        : "N/A";
                const lightValue =
                    row.light !== undefined && row.light !== null
                        ? parseFloat(row.light).toFixed(2)
                        : "N/A";
                const humidityValue =
                    row.humidity !== undefined && row.humidity !== null
                        ? parseFloat(row.humidity).toFixed(1)
                        : "N/A";

                const csvRow = [
                    `"${timeValue}"`,
                    tempValue,
                    lightValue,
                    humidityValue,
                ].join(",");

                csvContent += csvRow + "\n";
            } catch (rowError) {
                console.error(`Error processing row ${index}:`, rowError, row);
            }
        });

        console.log("CSV content length:", csvContent.length);

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);

            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];
            const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
            const filename = `sensor-data-${dateStr}-${timeStr}.csv`;
            link.setAttribute("download", filename);

            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(
                `Successfully exported ${data.length} records to ${filename}`
            );
            alert(`Đã xuất ${data.length} bản ghi vào file ${filename}`);
        } else {
            throw new Error("Trình duyệt không hỗ trợ tải xuống tệp!");
        }
    } catch (error) {
        console.error("Error exporting CSV:", error);
        alert(`Có lỗi xảy ra khi xuất CSV: ${error.message}`);
    }
}

function applyFiltersAndSearch() {
    console.log("Applying filters and search...", {
        searchQuery,
        dateFilters,
        rangeFilters,
    });

    const hasActiveFilters =
        searchQuery ||
        dateFilters.from ||
        dateFilters.to ||
        Object.values(rangeFilters).some(
            (filter) => filter.min !== "" || filter.max !== ""
        );

    if (!hasActiveFilters) {
        filteredData = [...tableData];
        currentPage = 1;
        loadTableData();
        return;
    }

    loadAllDataForFiltering().then(() => {
        filteredData = [...tableData];

        if (searchQuery) {
            filteredData = filteredData.filter((record) => {
                const timestamp = formatDateTime(
                    record.timestamp || record.created_at
                ).toLowerCase();
                const temperature = (record.temperature || "")
                    .toString()
                    .toLowerCase();
                const light = (record.light || "").toString().toLowerCase();
                const humidity = (record.humidity || "")
                    .toString()
                    .toLowerCase();

                return (
                    timestamp.includes(searchQuery) ||
                    temperature.includes(searchQuery) ||
                    light.includes(searchQuery) ||
                    humidity.includes(searchQuery)
                );
            });
        }

        if (dateFilters.from || dateFilters.to) {
            filteredData = filteredData.filter((record) => {
                const recordDate = getRecordDate(
                    record.timestamp || record.created_at
                );
                if (!recordDate) return false;

                const recordDateStr = recordDate.toISOString().split("T")[0];

                if (dateFilters.from && recordDateStr < dateFilters.from) {
                    return false;
                }
                if (dateFilters.to && recordDateStr > dateFilters.to) {
                    return false;
                }

                return true;
            });
        }

        filteredData = filteredData.filter((record) => {
            if (
                rangeFilters.temperature.min !== "" ||
                rangeFilters.temperature.max !== ""
            ) {
                const temp = parseFloat(record.temperature);
                if (isNaN(temp)) return false;

                if (
                    rangeFilters.temperature.min !== "" &&
                    temp < parseFloat(rangeFilters.temperature.min)
                ) {
                    return false;
                }
                if (
                    rangeFilters.temperature.max !== "" &&
                    temp > parseFloat(rangeFilters.temperature.max)
                ) {
                    return false;
                }
            }

            if (
                rangeFilters.light.min !== "" ||
                rangeFilters.light.max !== ""
            ) {
                const light = parseFloat(record.light);
                if (isNaN(light)) return false;

                if (
                    rangeFilters.light.min !== "" &&
                    light < parseFloat(rangeFilters.light.min)
                ) {
                    return false;
                }
                if (
                    rangeFilters.light.max !== "" &&
                    light > parseFloat(rangeFilters.light.max)
                ) {
                    return false;
                }
            }

            if (
                rangeFilters.humidity.min !== "" ||
                rangeFilters.humidity.max !== ""
            ) {
                const humidity = parseFloat(record.humidity);
                if (isNaN(humidity)) return false;

                if (
                    rangeFilters.humidity.min !== "" &&
                    humidity < parseFloat(rangeFilters.humidity.min)
                ) {
                    return false;
                }
                if (
                    rangeFilters.humidity.max !== "" &&
                    humidity > parseFloat(rangeFilters.humidity.max)
                ) {
                    return false;
                }
            }

            return true;
        });

        console.log(
            `Filtered data: ${filteredData.length} records from ${tableData.length} total`
        );

        currentPage = 1;
        renderFilteredTable();
        updateFilteredPagination();
    });
}

async function loadAllDataForFiltering() {
    if (tableData.length >= totalRecords) {
        return;
    }

    try {
        console.log("Loading all data for filtering...");
        showTableLoading(true);

        const response = await window.iotAPI.getAllSensorData(
            1,
            Math.max(totalRecords, 10000)
        );

        if (response && response.data) {
            tableData = response.data;
            console.log(`Loaded ${tableData.length} records for filtering`);
        }
    } catch (error) {
        console.error("Error loading all data for filtering:", error);
    } finally {
        showTableLoading(false);
    }
}

function getRecordDate(timestamp) {
    try {
        let date;

        if (timestamp && timestamp.$date) {
            date = new Date(timestamp.$date);
        } else if (typeof timestamp === "string") {
            let cleanTimestamp = timestamp.replace(/ GMT$/, "");
            date = new Date(cleanTimestamp);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            return null;
        }

        return isNaN(date.getTime()) ? null : date;
    } catch (error) {
        console.error("Error parsing date:", error);
        return null;
    }
}

function renderFilteredTable() {
    const tbody = document.getElementById("sensorTableBody");
    if (!tbody) return;

    if (!filteredData || filteredData.length === 0) {
        const hasActiveFilters =
            searchQuery ||
            dateFilters.from ||
            dateFilters.to ||
            Object.values(rangeFilters).some(
                (filter) => filter.min !== "" || filter.max !== ""
            );

        if (hasActiveFilters) {
            showEmptyState("Không tìm thấy dữ liệu phù hợp với bộ lọc");
        } else {
            showEmptyState("Không có dữ liệu");
        }
        return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedData
        .map((record) => {
            const timestamp = formatDateTime(
                record.timestamp || record.created_at
            );
            const temperature =
                record.temperature !== undefined && record.temperature !== null
                    ? record.temperature.toFixed(2)
                    : "-";
            const light =
                record.light !== undefined && record.light !== null
                    ? record.light.toFixed(2)
                    : "-";
            const humidity =
                record.humidity !== undefined && record.humidity !== null
                    ? record.humidity.toFixed(1)
                    : "-";

            let highlightedTimestamp = timestamp;
            let highlightedTemp = temperature;
            let highlightedLight = light;
            let highlightedHumidity = humidity;

            if (searchQuery) {
                const regex = new RegExp(
                    `(${escapeRegExp(searchQuery)})`,
                    "gi"
                );
                highlightedTimestamp = timestamp.replace(
                    regex,
                    "<mark>$1</mark>"
                );
                highlightedTemp = temperature.replace(regex, "<mark>$1</mark>");
                highlightedLight = light.replace(regex, "<mark>$1</mark>");
                highlightedHumidity = humidity.replace(
                    regex,
                    "<mark>$1</mark>"
                );
            }

            return `
            <tr>
                <td class="time-value">${highlightedTimestamp}</td>
                <td class="temp-value">${highlightedTemp}</td>
                <td class="light-value">${highlightedLight}</td>
                <td class="humidity-value">${highlightedHumidity}</td>
            </tr>
        `;
        })
        .join("");
}

function updateFilteredPagination() {
    const totalFilteredRecords = filteredData.length;
    const totalPages = Math.ceil(totalFilteredRecords / pageSize);
    const startRecord =
        totalFilteredRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endRecord = Math.min(currentPage * pageSize, totalFilteredRecords);

    const paginationInfo = document.getElementById("paginationInfo");
    if (paginationInfo) {
        const filterInfo =
            totalFilteredRecords !== tableData.length
                ? ` (đã lọc từ ${tableData.length} bản ghi)`
                : "";
        paginationInfo.textContent = `Hiển thị ${startRecord} - ${endRecord} của ${totalFilteredRecords} bản ghi${filterInfo}`;
    }

    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }

    renderFilteredPageNumbers(totalPages);
}

function renderFilteredPageNumbers(totalPages) {
    const pageNumbers = document.getElementById("pageNumbers");
    if (!pageNumbers) return;

    let pages = [];

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        if (currentPage <= 4) {
            pages = [1, 2, 3, 4, 5, "...", totalPages];
        } else if (currentPage >= totalPages - 3) {
            pages = [
                1,
                "...",
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];
        } else {
            pages = [
                1,
                "...",
                currentPage - 1,
                currentPage,
                currentPage + 1,
                "...",
                totalPages,
            ];
        }
    }

    pageNumbers.innerHTML = pages
        .map((page) => {
            if (page === "...") {
                return '<span class="page-ellipsis">...</span>';
            } else {
                const isActive = page === currentPage ? "active" : "";
                return `<button class="page-number ${isActive}" onclick="goToPage(${page})">${page}</button>`;
            }
        })
        .join("");
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setupFilterToggle() {
    const toggleBtn = document.getElementById("toggleFilterPanel");
    const filterPanel = document.getElementById("filterPanel");

    if (toggleBtn && filterPanel) {
        toggleBtn.addEventListener("click", function () {
            const isActive = this.classList.contains("active");

            if (isActive) {
                filterPanel.classList.add("hide");
                filterPanel.classList.remove("show");
                setTimeout(() => {
                    filterPanel.style.display = "none";
                    filterPanel.classList.remove("hide");
                }, 300);
                this.classList.remove("active");
            } else {
                filterPanel.style.display = "block";
                setTimeout(() => {
                    filterPanel.classList.add("show");
                }, 10);
                this.classList.add("active");
            }
        });
    }
}

function updateActiveFiltersCount() {
    const badge = document.getElementById("activeFiltersCount");
    if (!badge) return;

    let count = 0;

    if (searchQuery) count++;
    if (dateFilters.from || dateFilters.to) count++;
    if (
        Object.values(rangeFilters).some(
            (filter) => filter.min !== "" || filter.max !== ""
        )
    )
        count++;

    if (count > 0) {
        badge.textContent = count;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }
}
