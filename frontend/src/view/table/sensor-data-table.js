class SensorDataTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tableBody = document.getElementById("sensorTableBody");
        this.paginationInfo = document.getElementById("paginationInfo");
        this.pageNumbers = document.getElementById("pageNumbers");
        this.loadingElement = document.getElementById("tableLoading");

        this.currentData = [];
        this.paginationData = null;
        this.sortData = null;
        this.searchData = null;
    }

    renderTable(
        data = null,
        paginationInfo = null,
        sortInfo = null,
        searchInfo = null
    ) {
        console.log("renderTable called with:", {
            data,
            paginationInfo,
            sortInfo,
            searchInfo,
        });

        if (data) {
            this.currentData = Array.isArray(data) ? data : [];
            console.log("Set currentData to:", this.currentData);
        }
        if (paginationInfo) {
            this.paginationData = paginationInfo;
        }
        if (sortInfo) {
            this.sortData = sortInfo;
        }
        if (searchInfo) {
            this.searchData = searchInfo;
        }

        this.renderTableBody();
        this.renderPagination();
        this.updateSortHeaders();
    }

    renderTableBody() {
        if (!this.tableBody) {
            console.error("Table body element not found!");
            return;
        }

        console.log("Rendering table body with data:", this.currentData);
        console.log("Data length:", this.currentData.length);

        if (this.currentData.length === 0) {
            console.log("No data to display, showing 'no data' message");
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-data">Không có dữ liệu để hiển thị</td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = this.currentData
            .map((item, index) => {
                const timestamp = this.formatDateTime(item.timestamp);
                const temperature = item.temperature?.toFixed(1) || "N/A";
                const light = item.light?.toFixed(1) || "N/A";
                const humidity = item.humidity?.toFixed(1) || "N/A";

                return `
                    <tr>
                        <td>${timestamp}</td>
                        <td>${temperature}°C</td>
                        <td>${light}%</td>
                        <td>${humidity}%</td>
                    </tr>
                `;
            })
            .join("");
    }

    updateSortHeaders() {
        if (!this.container || !this.sortData) return;

        const ths = this.container.querySelectorAll("thead th");
        const fieldMap = ["timestamp", "temperature", "light", "humidity"];

        ths.forEach((th, idx) => {
            const field = fieldMap[idx];
            if (!field) return;

            // Reset all headers
            th.textContent = th.textContent.replace(/ ↑| ↓/, "");

            // Add sort indicator if this is the current sort field
            if (field === this.sortData.field) {
                const indicator = this.sortData.order === "asc" ? " ↑" : " ↓";
                th.textContent += indicator;
            }
        });
    }

    renderPagination() {
        if (!this.paginationInfo || !this.pageNumbers || !this.paginationData)
            return;

        const { page, per_page, total_count, total_pages, has_prev, has_next } =
            this.paginationData;

        const startIndex = total_count === 0 ? 0 : (page - 1) * per_page + 1;
        const endIndex = Math.min(page * per_page, total_count);

        this.paginationInfo.textContent = `Hiển thị ${startIndex} - ${endIndex} của ${total_count} bản ghi`;

        this.pageNumbers.innerHTML = "";

        if (total_pages <= 1) return;

        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(total_pages, page + 2);

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
                this.createPageButton(i, i.toString(), false, i === page)
            );
        }

        if (endPage < total_pages) {
            if (endPage < total_pages - 1) {
                this.pageNumbers.appendChild(
                    this.createPageButton(null, "...", true)
                );
            }
            this.pageNumbers.appendChild(
                this.createPageButton(total_pages, total_pages.toString())
            );
        }

        const prevBtn = document.getElementById("prevPage");
        const nextBtn = document.getElementById("nextPage");

        if (prevBtn) {
            prevBtn.disabled = !has_prev;
        }
        if (nextBtn) {
            nextBtn.disabled = !has_next;
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
                // Emit custom event for page change
                this.container.dispatchEvent(
                    new CustomEvent("pageChange", {
                        detail: { page: pageNum },
                    })
                );
            });
        }

        return button;
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = "block";
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = "none";
        }
    }

    updateData(
        newData,
        paginationInfo = null,
        sortInfo = null,
        searchInfo = null
    ) {
        this.renderTable(newData, paginationInfo, sortInfo, searchInfo);
    }

    getData() {
        return this.currentData;
    }

    formatDateTime(timestamp) {
        if (!timestamp) return "N/A";
        try {
            const date = new Date(timestamp);
            return date.toLocaleString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        } catch (e) {
            return timestamp.toString();
        }
    }

    exportToCSV() {
        if (!this.currentData || this.currentData.length === 0) {
            alert("Không có dữ liệu để xuất");
            return;
        }

        const headers = [
            "Thời gian",
            "Nhiệt độ (°C)",
            "Ánh sáng (%)",
            "Độ ẩm (%)",
        ];
        const rows = this.currentData.map((item) => {
            const timestamp = this.formatDateTime(item.timestamp);
            const temperature = item.temperature?.toFixed(1) || "N/A";
            const light = item.light?.toFixed(1) || "N/A";
            const humidity = item.humidity?.toFixed(1) || "N/A";

            return [
                `"${timestamp}"`,
                `"${temperature}"`,
                `"${light}"`,
                `"${humidity}"`,
            ].join(",");
        });

        const csvContent = [headers.join(",")].concat(rows).join("\n");
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

    destroy() {
        // Clean up event listeners if any
        if (this.container) {
            this.container.removeEventListener(
                "pageChange",
                this.handlePageChange
            );
        }
    }
}

export default SensorDataTable;
