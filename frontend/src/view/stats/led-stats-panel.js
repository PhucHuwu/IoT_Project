class LEDStatsPanel {
    constructor() {
        this.stats = null;
        this.selectedDate = null;
    }

    showLoading() {
        const loadingEl = document.getElementById("statsLoading");
        const contentEl = document.getElementById("statsContent");
        if (loadingEl) loadingEl.style.display = "flex";
        if (contentEl) contentEl.style.display = "none";
    }

    hideLoading() {
        const loadingEl = document.getElementById("statsLoading");
        const contentEl = document.getElementById("statsContent");
        if (loadingEl) loadingEl.style.display = "none";
        if (contentEl) contentEl.style.display = "block";
    }

    formatDateForDisplay(dateStr) {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    render(statsData, selectedDate = null) {
        this.stats = statsData;
        this.selectedDate = selectedDate;
        const contentEl = document.getElementById("statsContent");
        if (!contentEl) return;

        let totalCount = 0;
        const statsArray = [];

        const ledOrder = ["LED1", "LED2", "LED3", "LED4"];
        ledOrder.forEach((ledId) => {
            const count = statsData[ledId] || 0;
            totalCount += count;
            statsArray.push({ ledId, count });
        });

        statsArray.sort((a, b) => b.count - a.count);

        const statsItems = statsArray.map((item) =>
            this.createStatsItem(item.ledId, item.count)
        );

        contentEl.innerHTML = `
            ${statsItems.join("")}
            <div class="stats-total">
                <div class="stats-total-item">
                    <div class="stats-total-content">
                        <span class="stats-total-label">Tổng số lượt bật</span>
                        <span class="stats-total-count">${totalCount}</span>
                    </div>
                </div>
            </div>
        `;
    }

    createStatsItem(ledId, count) {
        const ledNumber = ledId.replace("LED", "");
        const ledClass = ledId.toLowerCase();
        const dateDisplay = this.selectedDate
            ? this.formatDateForDisplay(this.selectedDate)
            : "";
        const label = dateDisplay
            ? `Số lượt bật ngày ${dateDisplay}`
            : "Số lượt bật hôm nay";

        return `
            <div class="stats-item">
                <div class="stats-item-content">
                    <div class="stats-device-name">${ledId}</div>
                    <div class="stats-label">${label}</div>
                </div>
                <div class="stats-count-badge">${count}</div>
            </div>
        `;
    }

    updateStats(ledId, count) {
        if (!this.stats) return;
        this.stats[ledId] = count;
        this.render(this.stats);
    }

    clear() {
        const contentEl = document.getElementById("statsContent");
        if (contentEl) {
            contentEl.innerHTML =
                '<p style="text-align: center; color: #999;">Không có dữ liệu</p>';
        }
    }
}

export default LEDStatsPanel;
