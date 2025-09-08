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
    this.searchCriteria = "all";
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
        if (this.searchCriteria === "all") {
          const dateStr = this.formatDateTime(item.timestamp).toLowerCase();
          const tempStr = item.temperature?.toString() || "";
          const lightStr = item.light?.toString() || "";
          const humidityStr = item.humidity?.toString() || "";

          return (
            dateStr.includes(searchLower) ||
            tempStr.includes(searchLower) ||
            lightStr.includes(searchLower) ||
            humidityStr.includes(searchLower)
          );
        } else if (this.searchCriteria === "temperature") {
          const tempStr = item.temperature?.toString() || "";
          return tempStr.includes(searchLower);
        } else if (this.searchCriteria === "light") {
          const lightStr = item.light?.toString() || "";
          return lightStr.includes(searchLower);
        } else if (this.searchCriteria === "humidity") {
          const humidityStr = item.humidity?.toString() || "";
          return humidityStr.includes(searchLower);
        } else if (this.searchCriteria === "time") {
          const dateStr = this.formatDateTime(item.timestamp).toLowerCase();
          return dateStr.includes(searchLower);
        }

        return false;
      });
    }

    this.filteredData = filtered;
  }

  hasSearchMatch(item) {
    if (!this.searchTerm) return false;

    const searchLower = this.searchTerm.toLowerCase();

    if (this.searchCriteria === "all") {
      const dateStr = this.formatDateTime(item.timestamp).toLowerCase();
      const tempStr = item.temperature?.toString() || "";
      const lightStr = item.light?.toString() || "";
      const humidityStr = item.humidity?.toString() || "";

      return (
        dateStr.includes(searchLower) ||
        tempStr.includes(searchLower) ||
        lightStr.includes(searchLower) ||
        humidityStr.includes(searchLower)
      );
    } else if (this.searchCriteria === "temperature") {
      const tempStr = item.temperature?.toString() || "";
      return tempStr.includes(searchLower);
    } else if (this.searchCriteria === "light") {
      const lightStr = item.light?.toString() || "";
      return lightStr.includes(searchLower);
    } else if (this.searchCriteria === "humidity") {
      const humidityStr = item.humidity?.toString() || "";
      return humidityStr.includes(searchLower);
    } else if (this.searchCriteria === "time") {
      const dateStr = this.formatDateTime(item.timestamp).toLowerCase();
      return dateStr.includes(searchLower);
    }

    return false;
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
      .map((item) => {
        const hasMatch = this.hasSearchMatch(item);
        return `
            <tr${hasMatch ? ' class="search-match"' : ""}>
                <td>${this.highlightText(
                  this.formatDateTime(item.timestamp),
                  "time"
                )}</td>
                <td class="sensor-value temp-value">
                    <span class="value">${this.highlightText(
                      this.formatValue(item.temperature, 1),
                      "temperature"
                    )}</span>
                    <span class="unit">°C</span>
                </td>
                <td class="sensor-value light-value">
                    <span class="value">${this.highlightText(
                      this.formatValue(item.light, 1),
                      "light"
                    )}</span>
                    <span class="unit">%</span>
                </td>
                <td class="sensor-value humidity-value">
                    <span class="value">${this.highlightText(
                      this.formatValue(item.humidity, 1),
                      "humidity"
                    )}</span>
                    <span class="unit">%</span>
                </td>
            </tr>
        `;
      })
      .join("");
  }

  renderPagination() {
    if (!this.paginationInfo || !this.pageNumbers) return;

    const totalItems = this.filteredData.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endIndex = Math.min(startIndex + this.itemsPerPage - 1, totalItems);

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
        this.pageNumbers.appendChild(this.createPageButton(null, "...", true));
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      this.pageNumbers.appendChild(
        this.createPageButton(i, i.toString(), false, i === this.currentPage)
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        this.pageNumbers.appendChild(this.createPageButton(null, "...", true));
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
    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
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

  setSearchCriteria(criteria) {
    this.searchCriteria = criteria;
    this.currentPage = 1;
    this.renderTable();
  }

  clearAllFilters() {
    this.searchTerm = "";
    this.searchCriteria = "all";
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

    const headers = ["Thời gian", "Nhiệt độ (°C)", "Ánh sáng (%)", "Độ ẩm (%)"];
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

  highlightText(text, columnType) {
    if (!this.searchTerm || !text) {
      return text;
    }

    // Chỉ highlight nếu search criteria là "all" hoặc match với column hiện tại
    const shouldHighlight =
      this.searchCriteria === "all" || this.searchCriteria === columnType;

    if (!shouldHighlight) {
      return text;
    }

    const searchLower = this.searchTerm.toLowerCase();
    const textLower = text.toString().toLowerCase();

    if (!textLower.includes(searchLower)) {
      return text;
    }

    const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, "gi");
    return text
      .toString()
      .replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export default SensorDataTable;
