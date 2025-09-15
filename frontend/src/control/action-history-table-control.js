import SensorDataService from "../services/api.js";
import ActionHistoryTable from "../view/table/action-history-table.js";
import UpdateIndicator from "../components/update-indicator.js";

class ActionHistoryTableControl {
    constructor(container) {
        this.container = container;
        this.tableView = new ActionHistoryTable();
        this.updateIndicator = new UpdateIndicator();
        this.refreshInterval = null;
        this.searchTerm = "";
        this.searchCriteria = "time"; // 'time' | 'device' | 'all'
        this.latestItems = [];
        this.searchListenersAttached = false;
        this.controlListenersAttached = false;
        this.itemsPerPage = 10;
        this.currentPage = 1;
    }

    async load(limit = 50) {
        try {
            const result = await SensorDataService.getActionHistory(limit);
            let items = [];
            if (result && result.status === "success")
                items = result.data || [];
            else if (Array.isArray(result)) items = result;

            this.latestItems = items;
            const filtered = this._filterItemsByTime(
                this.latestItems,
                this.searchTerm
            );
            // sync search props to view for highlighting
            this.tableView.searchTerm = this.searchTerm;
            this.tableView.searchCriteria = this.searchCriteria;
            this.tableView.render(this.container, filtered);
            this._attachSearchListeners();
            this._attachControlListeners();
            // Ensure the default page size is applied immediately (e.g. 10 rows)
            this._renderCurrentPage();
        } catch (err) {
            console.error("Lỗi khi lấy lịch sử hành động:", err);
            this.container.innerHTML =
                '<div class="error">Lỗi khi tải dữ liệu.</div>';
        }
    }

    async refreshSilently(limit = 50) {
        try {
            const result = await SensorDataService.getActionHistory(limit);
            let items = [];
            if (result && result.status === "success")
                items = result.data || [];
            else if (Array.isArray(result)) items = result;

            this.latestItems = items;
            const filtered = this._filterItemsByTime(
                this.latestItems,
                this.searchTerm
            );

            // Respect current pagination settings when refreshing silently.
            const totalItems = filtered.length;
            const totalPages = Math.max(
                1,
                Math.ceil(totalItems / this.itemsPerPage)
            );
            if (this.currentPage < 1) this.currentPage = 1;
            if (this.currentPage > totalPages) this.currentPage = totalPages;

            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = Math.min(start + this.itemsPerPage, totalItems);
            const pageData = filtered.slice(start, end);

            // sync search props to view for highlighting
            this.tableView.searchTerm = this.searchTerm;
            this.tableView.searchCriteria = this.searchCriteria;
            const prev = this.tableView.currentItems || [];
            const changed = JSON.stringify(prev) !== JSON.stringify(pageData);
            if (changed) {
                this.tableView.updateData(pageData, this.container);
                this.updateIndicator.show();
                this.renderPagination();
            }
        } catch (err) {
            console.error("Lỗi khi refresh lịch sử hành động:", err);
        }
    }

    _filterItemsByTime(items, term) {
        // Generic filter that supports time-based or device-based filtering
        if (!term) return Array.isArray(items) ? items : [];
        const t = term.toLowerCase();
        const list = Array.isArray(items) ? items : [];
        if (this.searchCriteria === "device") {
            return list.filter((it) => {
                if (!it) return false;
                const device = (it.led || it.device || "").toString();
                return device.toLowerCase().includes(t);
            });
        }

        // default: time-based filtering
        return list.filter((it) => {
            if (!it || !it.timestamp) return false;
            try {
                const s = new Date(it.timestamp).toLocaleString("vi-VN");
                return s.toLowerCase().includes(t);
            } catch (e) {
                return String(it.timestamp).toLowerCase().includes(t);
            }
        });
    }

    _updateSearchPlaceholder(criteria) {
        const input = this.container.querySelector("#actionHistorySearchInput");
        if (!input) return;
        const map = {
            time: "Tìm kiếm theo thời gian (VD: 12/09 hoặc 14:30)",
            device: "Tìm kiếm theo thiết bị (VD: ESP32-1 hoặc led1)",
        };
        input.placeholder = map[criteria] || map.time;
    }

    _attachSearchListeners() {
        if (this.searchListenersAttached) return;
        const input = this.container.querySelector("#actionHistorySearchInput");
        const clearBtn = this.container.querySelector(
            "#actionHistoryClearSearch"
        );
        const criteria = this.container.querySelector("#actionSearchCriteria");
        if (!input) return;

        // initialize criteria if present
        if (criteria) {
            this.searchCriteria = criteria.value || "time";
            this._updateSearchPlaceholder(this.searchCriteria);
            criteria.addEventListener("change", (e) => {
                this.searchCriteria = e.target.value || "time";
                this.currentPage = 1;
                this._updateSearchPlaceholder(this.searchCriteria);
                this._renderCurrentPage();
            });
        }

        input.addEventListener("input", (e) => {
            const v = e.target.value.trim();
            this.searchTerm = v;
            if (clearBtn) clearBtn.style.display = v ? "block" : "none";
            // Reset to first page and re-render using controller pagination
            this.currentPage = 1;
            this._renderCurrentPage();
        });

        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (input) input.value = "";
                this.searchTerm = "";
                clearBtn.style.display = "none";
                this.currentPage = 1;
                this._renderCurrentPage();
                if (input) input.focus();
            });
        }

        this.searchListenersAttached = true;
    }

    _attachControlListeners() {
        if (this.controlListenersAttached) return;
        const pageSize = this.container.querySelector("#actionTablePageSize");
        const manualRefresh = this.container.querySelector(
            "#actionManualRefresh"
        );
        const exportBtn = this.container.querySelector("#actionExportCSV");
        const prevBtn = this.container.querySelector("#actionPrevPage");
        const nextBtn = this.container.querySelector("#actionNextPage");
        const pageNumbers = this.container.querySelector("#actionPageNumbers");
        const paginationInfo = this.container.querySelector(
            "#actionPaginationInfo"
        );

        if (pageSize) {
            pageSize.value = String(this.itemsPerPage);
            pageSize.addEventListener("change", (e) => {
                this.itemsPerPage = parseInt(e.target.value, 10) || 10;
                this.currentPage = 1;
                this._renderCurrentPage();
            });
        }

        if (manualRefresh) {
            manualRefresh.addEventListener("click", async () => {
                manualRefresh.classList.add("spinning");
                manualRefresh.disabled = true;
                try {
                    await this.load(this.itemsPerPage);
                    this.updateIndicator.show();
                } finally {
                    setTimeout(() => {
                        manualRefresh.classList.remove("spinning");
                        manualRefresh.disabled = false;
                    }, 800);
                }
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                this._exportCSV();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                this.goToPage(this.currentPage - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                this.goToPage(this.currentPage + 1);
            });
        }

        // render pagination initially
        this.renderPagination();

        this.controlListenersAttached = true;
    }

    _renderCurrentPage() {
        const all = Array.isArray(this.latestItems) ? this.latestItems : [];
        const filtered = this._filterItemsByTime(all, this.searchTerm);
        const totalItems = filtered.length;
        const totalPages = Math.max(
            1,
            Math.ceil(totalItems / this.itemsPerPage)
        );

        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, totalItems);
        const pageData = filtered.slice(start, end);

        this.tableView.searchTerm = this.searchTerm;
        this.tableView.searchCriteria = this.searchCriteria;
        this.tableView.updateData(pageData, this.container);
        this.renderPagination();
    }

    renderPagination() {
        const all = Array.isArray(this.latestItems) ? this.latestItems : [];
        const filtered = this._filterItemsByTime(all, this.searchTerm);
        const totalItems = filtered.length;
        const totalPages = Math.max(
            1,
            Math.ceil(totalItems / this.itemsPerPage)
        );

        const pageNumbers = this.container.querySelector("#actionPageNumbers");
        const prevBtn = this.container.querySelector("#actionPrevPage");
        const nextBtn = this.container.querySelector("#actionNextPage");
        const paginationInfo = this.container.querySelector(
            "#actionPaginationInfo"
        );

        if (!paginationInfo) return;
        const startIndex =
            totalItems === 0
                ? 0
                : (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(
            this.currentPage * this.itemsPerPage,
            totalItems
        );
        paginationInfo.textContent = `Hiển thị ${startIndex} - ${endIndex} của ${totalItems} bản ghi`;

        if (pageNumbers) {
            pageNumbers.innerHTML = "";
            if (totalPages > 1) {
                let startPage = Math.max(1, this.currentPage - 2);
                let endPage = Math.min(totalPages, this.currentPage + 2);

                if (startPage > 1) {
                    pageNumbers.appendChild(this.createPageButton(1, "1"));
                    if (startPage > 2)
                        pageNumbers.appendChild(
                            this.createPageButton(null, "...", true)
                        );
                }

                for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.appendChild(
                        this.createPageButton(
                            i,
                            i.toString(),
                            false,
                            i === this.currentPage
                        )
                    );
                }

                if (endPage < totalPages) {
                    if (endPage < totalPages - 1)
                        pageNumbers.appendChild(
                            this.createPageButton(null, "...", true)
                        );
                    pageNumbers.appendChild(
                        this.createPageButton(totalPages, totalPages.toString())
                    );
                }
            }
        }

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
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
        const all = Array.isArray(this.latestItems) ? this.latestItems : [];
        const filtered = this._filterItemsByTime(all, this.searchTerm);
        const totalPages = Math.max(
            1,
            Math.ceil(filtered.length / this.itemsPerPage)
        );
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this._renderCurrentPage();
    }

    _getPagedItems() {
        const all = Array.isArray(this.latestItems) ? this.latestItems : [];
        // apply current search filter first
        const filtered = this._filterItemsByTime(all, this.searchTerm);
        // paginate
        if (!this.itemsPerPage || this.itemsPerPage <= 0) return filtered;
        return filtered.slice(0, this.itemsPerPage);
    }

    _exportCSV() {
        const data = this._filterItemsByTime(this.latestItems, this.searchTerm);
        if (!data || data.length === 0) {
            alert("Không có dữ liệu để xuất");
            return;
        }

        const headers = ["Thiết bị", "Trạng thái", "Thời gian"];
        const rows = data.map((it) => {
            const ts = (() => {
                try {
                    return new Date(it.timestamp).toLocaleString("vi-VN");
                } catch (e) {
                    return it.timestamp || "";
                }
            })();
            return [`"${it.led || ""}"`, `"${it.state || ""}"`, `"${ts}"`].join(
                ","
            );
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
            `action-history-${new Date().toISOString().slice(0, 10)}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    startAutoRefresh(intervalMs = 30000, limit = 50) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.refreshSilently(limit);
        }, intervalMs);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
        if (this.updateIndicator) this.updateIndicator.destroy();
    }
}

export default ActionHistoryTableControl;
