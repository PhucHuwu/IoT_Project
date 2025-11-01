import SensorDataService from "../services/api.js";
import LEDStatsPanel from "../view/stats/led-stats-panel.js";

class LEDStatsPanelControl {
    constructor() {
        this.panel = new LEDStatsPanel();
        this.refreshInterval = null;
        this.attachListeners();
    }

    attachListeners() {
        const refreshBtn = document.getElementById('statsRefresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.classList.add('spinning');
                refreshBtn.disabled = true;
                try {
                    await this.load(false);
                } finally {
                    setTimeout(() => {
                        refreshBtn.classList.remove('spinning');
                        refreshBtn.disabled = false;
                    }, 800);
                }
            });
        }
    }

    async load(useCache = true) {
        try {
            this.panel.showLoading();
            const result = await SensorDataService.getLEDStats(useCache);
            this.panel.hideLoading();

            if (result && result.status === 'success' && result.data) {
                this.panel.render(result.data);
            } else {
                console.error('Lỗi khi lấy thống kê LED:', result?.message);
                this.panel.clear();
            }
        } catch (err) {
            console.error('Lỗi khi lấy thống kê LED:', err);
            this.panel.hideLoading();
            this.panel.clear();
        }
    }

    async refreshSilently() {
        try {
            const result = await SensorDataService.getLEDStats(true);
            if (result && result.status === 'success' && result.data) {
                this.panel.render(result.data);
            }
        } catch (err) {
            console.error('Lỗi khi refresh thống kê LED:', err);
        }
    }

    startAutoRefresh(intervalMs = 30000) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.refreshSilently();
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
    }
}

export default LEDStatsPanelControl;
