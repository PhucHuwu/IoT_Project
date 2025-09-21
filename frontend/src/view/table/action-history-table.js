class ActionHistoryTable {
    constructor() {
        this.currentItems = [];
        this.pagination = {};
        this.filters = {};
        this.sort = {};
    }

    render(container, items, paginationData = {}, filters = {}, sort = {}) {
        this.currentItems = Array.isArray(items) ? items : [];
        this.pagination = paginationData;
        this.filters = filters;
        this.sort = sort;
        container.innerHTML = "";

        const card = document.createElement("div");
        card.className = "table-card";

        const tableHeader = document.createElement("div");
        tableHeader.className = "table-header";
        tableHeader.innerHTML = `
      <h3>Bảng lịch sử hành động</h3>
      <div class="table-controls">
        <select id="actionTablePageSize">
          <option value="10">10 dòng</option>
          <option value="25">25 dòng</option>
          <option value="50">50 dòng</option>
          <option value="100">100 dòng</option>
        </select>
        <button id="actionManualRefresh" class="refresh-btn">
          <i class="fas fa-sync-alt"></i>
          Làm mới
        </button>
        <button id="actionExportCSV" class="export-btn">
          <i class="fas fa-download"></i>
          Xuất CSV
        </button>
      </div>
    `;

        const tableContainer = document.createElement("div");
        tableContainer.className = "table-container";

        const loadingElement = document.createElement("div");
        loadingElement.className = "table-loading";
        loadingElement.id = "actionTableLoading";
        loadingElement.style.display = "none";
        loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
        `;

        const table = document.createElement("table");
        table.className = "action-history-table";

        const thead = document.createElement("thead");
        thead.innerHTML = `
      <tr>
        <th>Thiết bị</th>
        <th>Trạng thái</th>
        <th>Thời gian</th>
      </tr>
    `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        tbody.id = "actionHistoryTableBody";

        if (this.currentItems.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td colspan="3" class="no-data">Không có dữ liệu để hiển thị</td>
            `;
            tbody.appendChild(tr);
        } else {
            this.currentItems.forEach((item) => {
                const tr = this._createRow(item);
                tbody.appendChild(tr);
            });
        }

        table.appendChild(tbody);
        tableContainer.appendChild(loadingElement);
        tableContainer.appendChild(table);

        card.appendChild(tableHeader);

        const searchControls = document.createElement("div");
        searchControls.className = "table-search-controls";
        searchControls.innerHTML = `
        <div class="search-section">
          <label class="filter-label">Thiết bị</label>
          <select id="actionFilterDevice" class="filter-select">
            <option value="all">Tất cả</option>
            <option value="LED1">LED1</option>
            <option value="LED2">LED2</option>
            <option value="LED3">LED3</option>
          </select>
          <label class="filter-label">Trạng thái</label>
          <select id="actionFilterState" class="filter-select">
            <option value="all">Tất cả</option>
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
          <div class="search-input-group">
            <i class="fas fa-search"></i>
            <input type="text" id="actionHistorySearchInput" placeholder="Tìm kiếm theo thời gian (VD: 00:17:07 21/09/2025, 00:17 21/09/2025, 21/09/2025)">
            <button id="actionHistoryClearSearch" class="clear-btn" style="display:none;"><i class="fas fa-times"></i></button>
          </div>
        </div>
    `;

        card.appendChild(searchControls);
        card.appendChild(tableContainer);

        const paginationElement = document.createElement("div");
        paginationElement.className = "table-pagination";
        paginationElement.id = "actionTablePagination";
        paginationElement.innerHTML = `
      <div class="pagination-info">
        <span id="actionPaginationInfo">Hiển thị 0 - 0 của 0 bản ghi</span>
      </div>
      <div class="pagination-controls">
        <button id="actionPrevPage" class="page-btn" disabled>
          <i class="fas fa-chevron-left"></i>
          Trước
        </button>
        <div class="page-numbers" id="actionPageNumbers"></div>
        <button id="actionNextPage" class="page-btn" disabled>
          Sau
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;

        card.appendChild(paginationElement);

        container.appendChild(card);
    }

    _createRow(item) {
        const tr = document.createElement("tr");

        const ledTd = document.createElement("td");
        ledTd.textContent = item.led || "";

        const stateTd = document.createElement("td");
        const stateValue = (item.state || "").toString().toLowerCase();
        const badge = document.createElement("span");
        badge.className = "status-badge";
        if (
            stateValue === "on" ||
            stateValue === "1" ||
            stateValue === "true"
        ) {
            badge.classList.add("status-on");
            badge.textContent = "ON";
        } else if (
            stateValue === "off" ||
            stateValue === "0" ||
            stateValue === "false"
        ) {
            badge.classList.add("status-off");
            badge.textContent = "OFF";
        } else {
            badge.classList.add("status-unknown");
            badge.textContent = item.state || "-";
        }
        stateTd.appendChild(badge);

        const tsTd = document.createElement("td");
        let ts = "";
        if (item.timestamp) {
            try {
                ts = new Date(item.timestamp).toLocaleString("vi-VN");
            } catch (e) {
                ts = item.timestamp;
            }
        }
        tsTd.textContent = ts;

        tr.appendChild(ledTd);
        tr.appendChild(stateTd);
        tr.appendChild(tsTd);

        return tr;
    }

    updateData(
        newItems,
        paginationData = {},
        filters = {},
        sort = {},
        container
    ) {
        const normalized = Array.isArray(newItems) ? newItems : [];
        if (JSON.stringify(normalized) === JSON.stringify(this.currentItems)) {
            return;
        }

        this.currentItems = normalized;
        this.pagination = paginationData;
        this.filters = filters;
        this.sort = sort;

        const oldScroll = window.pageYOffset;

        const tbody = container.querySelector("#actionHistoryTableBody");
        if (!tbody)
            return this.render(
                container,
                this.currentItems,
                paginationData,
                filters,
                sort
            );

        tbody.innerHTML = "";
        this.currentItems.forEach((item) => {
            tbody.appendChild(this._createRow(item));
        });

        window.scrollTo(0, oldScroll);
    }

    showLoading() {
        const loadingElement = document.getElementById("actionTableLoading");
        if (loadingElement) {
            loadingElement.style.display = "flex";
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById("actionTableLoading");
        if (loadingElement) {
            loadingElement.style.display = "none";
        }
    }
}

export default ActionHistoryTable;
