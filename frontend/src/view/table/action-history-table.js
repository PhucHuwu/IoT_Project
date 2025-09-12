class ActionHistoryTable {
  constructor() {
    this.currentItems = [];
  }

  render(container, items) {
    this.currentItems = Array.isArray(items) ? items : [];
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

    this.currentItems.forEach((item) => {
      const tr = this._createRow(item);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);

    card.appendChild(tableHeader);

    // add search controls below header (like sensor-data layout)
    const searchControls = document.createElement("div");
    searchControls.className = "table-search-controls";
    searchControls.innerHTML = `
      <div class="table-search">
        <div class="search-section">
          <div class="search-input-group">
            <i class="fas fa-search"></i>
            <input type="text" id="actionHistorySearchInput" placeholder="Tìm theo thời gian (VD: 12/9/2025 hoặc 15:30)">
            <button id="actionHistoryClearSearch" class="clear-btn" style="display:none;"><i class="fas fa-times"></i></button>
          </div>
        </div>
      </div>
    `;

    card.appendChild(searchControls);
    card.appendChild(tableContainer);

    // pagination controls (matches sensor-data layout)
    const pagination = document.createElement("div");
    pagination.className = "table-pagination";
    pagination.id = "actionTablePagination";
    pagination.innerHTML = `
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

    card.appendChild(pagination);

    container.appendChild(card);
  }

  _createRow(item) {
    const tr = document.createElement("tr");

    const ledTd = document.createElement("td");
    ledTd.textContent = item.led || "";

    const stateTd = document.createElement("td");
    stateTd.textContent = item.state || "";

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

  updateData(newItems, container) {
    const normalized = Array.isArray(newItems) ? newItems : [];
    if (JSON.stringify(normalized) === JSON.stringify(this.currentItems)) {
      return; // nothing changed
    }

    this.currentItems = normalized;

    // preserve scroll
    const oldScroll = window.pageYOffset;

    const tbody = container.querySelector("#actionHistoryTableBody");
    if (!tbody) return this.render(container, this.currentItems);

    // clear and repopulate
    tbody.innerHTML = "";
    this.currentItems.forEach((item) => {
      tbody.appendChild(this._createRow(item));
    });

    window.scrollTo(0, oldScroll);
  }
}

export default ActionHistoryTable;
