class SensorDataTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tableBody = document.getElementById("sensorTableBody");
        this.paginationInfo = document.getElementById("paginationInfo");
        this.pageNumbers = document.getElementById("pageNumbers");
        this.loadingElement = document.getElementById("tableLoading");

        this.currentData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = "";
        this.filters = {
            dateFrom: null,
            dateTo: null,
            tempMin: null,
            tempMax: null,
            lightMin: null,
            lightMax: null,
            humidityMin: null,
            humidityMax: null,
        };
    }

    renderTable(data = null) {
        if (data) {
            this.currentData = Array.isArray(data) ? data : [];
        }

        this.applyFiltersAndSearch();
        this.renderTableBody();
        this.renderPagination();
    }

    applyFiltersAndSearch() {
        let filtered = [...this.currentData];

        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter((item) => {
                const dateStr = this.formatDateTime(
                    item.timestamp
                ).toLowerCase();
                const tempStr = item.temperature?.toString() || "";
                const lightStr = item.light?.toString() || "";
                const humidityStr = item.humidity?.toString() || "";

                return (
                    dateStr.includes(searchLower) ||
                    tempStr.includes(searchLower) ||
                    lightStr.includes(searchLower) ||
                    humidityStr.includes(searchLower)
                );
            });
        }

        if (this.filters.dateFrom || this.filters.dateTo) {
            filtered = filtered.filter((item) => {
                const itemDate = new Date(item.timestamp);
                if (
                    this.filters.dateFrom &&
                    itemDate < new Date(this.filters.dateFrom)
                ) {
                    return false;
                }
                if (
                    this.filters.dateTo &&
                    itemDate > new Date(this.filters.dateTo + " 23:59:59")
                ) {
                    return false;
                }
                return true;
            });
        }

        if (this.filters.tempMin !== null || this.filters.tempMax !== null) {
            filtered = filtered.filter((item) => {
                const temp = item.temperature;
                if (temp == null) return false;
                if (
                    this.filters.tempMin !== null &&
                    temp < this.filters.tempMin
                )
                    return false;
                if (
                    this.filters.tempMax !== null &&
                    temp > this.filters.tempMax
                )
                    return false;
                return true;
            });
        }

        if (this.filters.lightMin !== null || this.filters.lightMax !== null) {
            filtered = filtered.filter((item) => {
                const light = item.light;
                if (light == null) return false;
                if (
                    this.filters.lightMin !== null &&
                    light < this.filters.lightMin
                )
                    return false;
                if (
                    this.filters.lightMax !== null &&
                    light > this.filters.lightMax
                )
                    return false;
                return true;
            });
        }

        if (
            this.filters.humidityMin !== null ||
            this.filters.humidityMax !== null
        ) {
            filtered = filtered.filter((item) => {
                const humidity = item.humidity;
                if (humidity == null) return false;
                if (
                    this.filters.humidityMin !== null &&
                    humidity < this.filters.humidityMin
                )
                    return false;
                if (
                    this.filters.humidityMax !== null &&
                    humidity > this.filters.humidityMax
                )
                    return false;
                return true;
            });
        }

        this.filteredData = filtered;
    }

    renderTableBody() {
        if (!this.tableBody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-data">
                        <div class="no-data-message">
                            <i class="fas fa-search"></i>
                            <p>Không tìm thấy dữ liệu phù hợp</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = pageData
            .map(
                (item) => `
            <tr>
                <td>${this.highlightText(this.formatDateTime(item.timestamp))}</td>
                <td class="sensor-value temp-value">
                    <span class="value">${this.highlightText(this.formatValue(
                        item.temperature,
                        1
                    ))}</span>
                    <span class="unit">°C</span>
                </td>
                <td class="sensor-value light-value">
                    <span class="value">${this.highlightText(this.formatValue(
                        item.light,
                        1
                    ))}</span>
                    <span class="unit">%</span>
                </td>
                <td class="sensor-value humidity-value">
                    <span class="value">${this.highlightText(this.formatValue(
                        item.humidity,
                        1
                    ))}</span>
                    <span class="unit">%</span>
                </td>
            </tr>
        `
            )
            .join("");
    }

    renderPagination() {
        if (!this.paginationInfo || !this.pageNumbers) return;

        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(
            startIndex + this.itemsPerPage - 1,
            totalItems
        );

        this.paginationInfo.textContent = `Hiển thị ${
            totalItems > 0 ? startIndex : 0
        } - ${totalItems > 0 ? endIndex : 0} của ${totalItems} bản ghi`;

        this.pageNumbers.innerHTML = "";

        if (totalPages <= 1) return;

        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            this.pageNumbers.appendChild(this.createPageButton(1, "1"));
            if (startPage > 2) {
                this.pageNumbers.appendChild(
                    this.createPageButton(null, "...", true)
                );
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            this.pageNumbers.appendChild(
                this.createPageButton(
                    i,
                    i.toString(),
                    false,
                    i === this.currentPage
                )
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                this.pageNumbers.appendChild(
                    this.createPageButton(null, "...", true)
                );
            }
            this.pageNumbers.appendChild(
                this.createPageButton(totalPages, totalPages.toString())
            );
        }

        const prevBtn = document.getElementById("prevPage");
        const nextBtn = document.getElementById("nextPage");

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    createPageButton(pageNum, text, isDisabled = false, isActive = false) {
        const button = document.createElement("button");
        button.className = `page-number-btn ${isActive ? "active" : ""} ${
            isDisabled ? "disabled" : ""
        }`;
        button.textContent = text;
        button.disabled = isDisabled;

        if (pageNum && !isDisabled) {
            button.addEventListener("click", () => {
                this.goToPage(pageNum);
            });
        }

        return button;
    }

    goToPage(page) {
        const totalPages = Math.ceil(
            this.filteredData.length / this.itemsPerPage
        );
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        this.renderTableBody();
        this.renderPagination();
    }

    setItemsPerPage(items) {
        this.itemsPerPage = parseInt(items);
        this.currentPage = 1;
        this.renderTable();
    }

    setSearchTerm(term) {
        this.searchTerm = term;
        this.currentPage = 1;
        this.renderTable();
    }

    setDateFilter(dateFrom, dateTo) {
        this.filters.dateFrom = dateFrom;
        this.filters.dateTo = dateTo;
        this.currentPage = 1;
        this.renderTable();
    }

    setRangeFilters(
        tempMin,
        tempMax,
        lightMin,
        lightMax,
        humidityMin,
        humidityMax
    ) {
        this.filters.tempMin = tempMin !== "" ? parseFloat(tempMin) : null;
        this.filters.tempMax = tempMax !== "" ? parseFloat(tempMax) : null;
        this.filters.lightMin = lightMin !== "" ? parseFloat(lightMin) : null;
        this.filters.lightMax = lightMax !== "" ? parseFloat(lightMax) : null;
        this.filters.humidityMin =
            humidityMin !== "" ? parseFloat(humidityMin) : null;
        this.filters.humidityMax =
            humidityMax !== "" ? parseFloat(humidityMax) : null;
        this.currentPage = 1;
        this.renderTable();
    }

    clearAllFilters() {
        this.filters = {
            dateFrom: null,
            dateTo: null,
            tempMin: null,
            tempMax: null,
            lightMin: null,
            lightMax: null,
            humidityMin: null,
            humidityMax: null,
        };
        this.searchTerm = "";
        this.currentPage = 1;
        this.renderTable();
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = "flex";
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = "none";
        }
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    formatValue(value, decimals = 1) {
        if (value == null) return "N/A";
        return Number(value).toFixed(decimals);
    }

    exportToCSV() {
        if (this.filteredData.length === 0) {
            alert("Không có dữ liệu để xuất");
            return;
        }

        const headers = [
            "Thời gian",
            "Nhiệt độ (°C)",
            "Ánh sáng (%)",
            "Độ ẩm (%)",
        ];
        const csvContent = [
            headers.join(","),
            ...this.filteredData.map((item) =>
                [
                    `"${this.formatDateTime(item.timestamp)}"`,
                    this.formatValue(item.temperature, 1),
                    this.formatValue(item.light, 1),
                    this.formatValue(item.humidity, 1),
                ].join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            `sensor-data-${new Date().toISOString().slice(0, 10)}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getActiveFiltersCount() {
        let count = 0;
        if (this.filters.dateFrom || this.filters.dateTo) count++;
        if (this.filters.tempMin !== null || this.filters.tempMax !== null)
            count++;
        if (this.filters.lightMin !== null || this.filters.lightMax !== null)
            count++;
        if (
            this.filters.humidityMin !== null ||
            this.filters.humidityMax !== null
        )
            count++;
        return count;
    }

    highlightText(text) {
        if (!this.searchTerm || !text) {
            return text;
        }

        const searchLower = this.searchTerm.toLowerCase();
        const textLower = text.toString().toLowerCase();
        
        if (!textLower.includes(searchLower)) {
            return text;
        }

        const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
        return text.toString().replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

export default SensorDataTable;
