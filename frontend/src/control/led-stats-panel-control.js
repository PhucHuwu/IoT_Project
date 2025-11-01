import SensorDataService from "../services/api.js";
import LEDStatsPanel from "../view/stats/led-stats-panel.js";

class LEDStatsPanelControl {
    constructor() {
        this.panel = new LEDStatsPanel();
        this.refreshInterval = null;
        this.selectedDate = this.getLocalDateString();
        this.datePicker = document.getElementById('statsDatePicker');
        this.attachListeners();
        this.initializeDatePicker();
    }

    getLocalDateString(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    async initializeDatePicker() {
        const today = new Date();
        const formattedDate = this.getLocalDateString(today);
        this.selectedDate = formattedDate;

        let availableDates = [];
        try {
            const response = await SensorDataService.getAvailableLEDDates();
            if (response.status === 'success' && response.data) {
                availableDates = response.data;
                console.log('Available LED dates:', availableDates);
            }
        } catch (error) {
            console.error('Lỗi khi lấy danh sách ngày có dữ liệu LED:', error);
        }

        if (this.datePicker) {
            flatpickr(this.datePicker, {
                dateFormat: 'Y-m-d',
                maxDate: formattedDate,
                defaultDate: formattedDate,
                enable: availableDates,
                onChange: (selectedDates, dateStr) => {
                    if (selectedDates.length > 0) {
                        this.selectedDate = dateStr;
                        console.log('Selected date changed to:', this.selectedDate);
                        this.load(false);
                    }
                }
            });
        }

        console.log('Date picker initialized with:', this.selectedDate);
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
            const result = await SensorDataService.getLEDStats(useCache, this.selectedDate);
            this.panel.hideLoading();

            if (result && result.status === 'success' && result.data) {
                this.panel.render(result.data, this.selectedDate);
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
            const result = await SensorDataService.getLEDStats(true, this.selectedDate);
            if (result && result.status === 'success' && result.data) {
                this.panel.render(result.data, this.selectedDate);
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
