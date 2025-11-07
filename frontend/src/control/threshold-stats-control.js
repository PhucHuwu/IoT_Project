import SensorDataService from "../services/api.js";

class ThresholdStatsControl {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.thresholds = null;
        this.refreshInterval = null;
    }

    async initialize() {
        try {
            await this.loadThresholds();
            await this.setupDatePicker();
            this.attachEventListeners();
            await this.loadStats();
            this.startAutoRefresh();
        } catch (error) {
            console.error("Lỗi khởi tạo threshold stats:", error);
        }
    }

    async loadThresholds() {
        try {
            const result = await SensorDataService.getThresholds();
            if (result.status === "success") {
                this.thresholds = result.data;
            }
        } catch (error) {
            console.error("Lỗi khi tải cấu hình ngưỡng:", error);
        }
    }

    async setupDatePicker() {
        const datePicker = document.getElementById("thresholdStatsDatePicker");
        if (!datePicker) return;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        let availableDates = [];
        try {
            const response = await SensorDataService.getAvailableDates();
            if (response.status === "success" && response.data) {
                availableDates = response.data;
                console.log("📅 Ngày có dữ liệu cảm biến:", availableDates);
            }
        } catch (error) {
            console.error("Lỗi khi lấy danh sách ngày có dữ liệu:", error);
        }

        flatpickr(datePicker, {
            dateFormat: "Y-m-d",
            maxDate: formattedDate,
            defaultDate: formattedDate,
            enable: availableDates,
            locale: {
                firstDayOfWeek: 1,
                weekdays: {
                    shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
                    longhand: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
                },
                months: {
                    shorthand: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
                    longhand: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
                }
            },
            onChange: async (selectedDates, dateStr) => {
                if (selectedDates.length > 0) {
                    console.log("📆 Đã chọn ngày:", dateStr);
                    await this.loadStats(dateStr);
                }
            },
        });
    }

    attachEventListeners() {
        const refreshBtn = document.getElementById("thresholdStatsRefresh");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", async () => {
                refreshBtn.classList.add("spinning");
                refreshBtn.disabled = true;
                try {
                    const selectedDate = this.selectedDate || this.getFormattedDate();
                    await this.loadStats(selectedDate);
                } finally {
                    setTimeout(() => {
                        refreshBtn.classList.remove("spinning");
                        refreshBtn.disabled = false;
                    }, 800);
                }
            });
        }

        const debugBtn = document.getElementById("thresholdDebugBtn");
        if (debugBtn) {
            debugBtn.addEventListener("click", () => {
                this.showDebugDetails();
            });
        }
    }

    async loadStats(date = null) {
        const loadingEl = document.getElementById("thresholdStatsLoading");
        
        try {
            if (loadingEl) loadingEl.style.display = "flex";

            const selectedDate = date || this.getFormattedDate();
            
            console.log(`🔍 Đang tải dữ liệu cho ngày: ${selectedDate}`);
            
            const result = await SensorDataService.getSensorDataByDate(selectedDate);

            if (result && result.status === "success") {
                this.debugData = result.data;
                this.selectedDate = selectedDate;
                
                console.log(`📊 Tổng số bản ghi trong ngày ${selectedDate}:`, this.debugData.length);
                console.log(`⏰ Khoảng thời gian:`, 
                    this.debugData.length > 0 ? 
                    `${new Date(this.debugData[this.debugData.length-1].timestamp).toLocaleString('vi-VN')} - ${new Date(this.debugData[0].timestamp).toLocaleString('vi-VN')}` 
                    : 'Không có dữ liệu');
                
                const stats = this.calculateStats(this.debugData);
                console.log("📈 Thống kê vượt ngưỡng (theo phút):", stats);
                console.log("├─ Nhiệt độ: ", stats.temperature.warning, "phút cảnh báo,", stats.temperature.danger, "phút nguy hiểm");
                console.log("├─ Độ ẩm: ", stats.humidity.warning, "phút cảnh báo,", stats.humidity.danger, "phút nguy hiểm");
                console.log("└─ Ánh sáng: ", stats.light.warning, "phút cảnh báo,", stats.light.danger, "phút nguy hiểm");
                
                this.renderStats(stats);
            }
        } catch (error) {
            console.error("❌ Lỗi khi tải thống kê vượt ngưỡng:", error);
        } finally {
            if (loadingEl) loadingEl.style.display = "none";
        }
    }

    getFormattedDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    calculateStats(data) {
        if (!this.thresholds || !data || data.length === 0) {
            return {
                temperature: { warning: 0, danger: 0 },
                humidity: { warning: 0, danger: 0 },
                light: { warning: 0, danger: 0 }
            };
        }

        console.log(`📊 Tổng số bản ghi thô: ${data.length}`);

        const groupedByMinute = this.groupDataByMinute(data);
        console.log(`⏱️ Số phút có dữ liệu: ${groupedByMinute.length}`);

        const stats = {
            temperature: { warning: 0, danger: 0 },
            humidity: { warning: 0, danger: 0 },
            light: { warning: 0, danger: 0 }
        };

        groupedByMinute.forEach(minuteData => {
            if (minuteData.temperature !== undefined && minuteData.temperature !== null) {
                const status = this.getTemperatureStatus(minuteData.temperature);
                if (status === "warning") stats.temperature.warning++;
                else if (status === "danger") stats.temperature.danger++;
            }

            if (minuteData.humidity !== undefined && minuteData.humidity !== null) {
                const status = this.getHumidityStatus(minuteData.humidity);
                if (status === "warning") stats.humidity.warning++;
                else if (status === "danger") stats.humidity.danger++;
            }

            if (minuteData.light !== undefined && minuteData.light !== null) {
                const status = this.getLightStatus(minuteData.light);
                if (status === "warning") stats.light.warning++;
                else if (status === "danger") stats.light.danger++;
            }
        });

        return stats;
    }

    groupDataByMinute(data) {
        const minuteMap = new Map();

        data.forEach(item => {
            if (!item.timestamp) return;

            try {
                const date = new Date(item.timestamp);
                const minuteKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

                if (!minuteMap.has(minuteKey)) {
                    minuteMap.set(minuteKey, {
                        timestamp: minuteKey,
                        temperatures: [],
                        humidities: [],
                        lights: [],
                        count: 0
                    });
                }

                const minuteData = minuteMap.get(minuteKey);
                minuteData.count++;

                if (item.temperature !== undefined && item.temperature !== null) {
                    minuteData.temperatures.push(item.temperature);
                }
                if (item.humidity !== undefined && item.humidity !== null) {
                    minuteData.humidities.push(item.humidity);
                }
                if (item.light !== undefined && item.light !== null) {
                    minuteData.lights.push(item.light);
                }
            } catch (error) {
                console.error("Lỗi khi group dữ liệu:", error);
            }
        });

        const groupedData = Array.from(minuteMap.values()).map(minuteData => {
            return {
                timestamp: minuteData.timestamp,
                temperature: minuteData.temperatures.length > 0 
                    ? minuteData.temperatures.reduce((a, b) => a + b, 0) / minuteData.temperatures.length 
                    : null,
                humidity: minuteData.humidities.length > 0 
                    ? minuteData.humidities.reduce((a, b) => a + b, 0) / minuteData.humidities.length 
                    : null,
                light: minuteData.lights.length > 0 
                    ? minuteData.lights.reduce((a, b) => a + b, 0) / minuteData.lights.length 
                    : null,
                recordCount: minuteData.count
            };
        });

        groupedData.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        console.log(`✅ Đã nhóm ${data.length} bản ghi thành ${groupedData.length} phút`);
        if (groupedData.length > 0) {
            console.log(`📝 Ví dụ phút đầu: ${groupedData[0].timestamp} - ${groupedData[0].recordCount} bản ghi`);
        }

        return groupedData;
    }

    getTemperatureStatus(value) {
        const t = this.thresholds.temperature;
        if (value >= t.normal_min && value <= t.normal_max) return "normal";
        if ((value >= t.warning_min && value < t.normal_min) || 
            (value > t.normal_max && value <= t.warning_max)) return "warning";
        return "danger";
    }

    getHumidityStatus(value) {
        const h = this.thresholds.humidity;
        if (value >= h.normal_min && value <= h.normal_max) return "normal";
        if ((value >= h.warning_min && value < h.normal_min) || 
            (value > h.normal_max && value <= h.warning_max)) return "warning";
        return "danger";
    }

    getLightStatus(value) {
        const l = this.thresholds.light;
        if (value >= l.normal_min && value <= l.normal_max) return "normal";
        if ((value >= l.warning_min && value < l.normal_min) || 
            (value > l.normal_max && value <= l.warning_max)) return "warning";
        return "danger";
    }

    renderStats(stats) {
        const sensorOrder = [
            { 
                type: 'temperature', 
                label: 'Nhiệt độ',
                icon: 'fas fa-thermometer-half',
                warningId: 'tempWarningCount',
                dangerId: 'tempDangerCount'
            },
            { 
                type: 'humidity', 
                label: 'Độ ẩm',
                icon: 'fas fa-tint',
                warningId: 'humidityWarningCount',
                dangerId: 'humidityDangerCount'
            },
            { 
                type: 'light', 
                label: 'Ánh sáng',
                icon: 'fas fa-sun',
                warningId: 'lightWarningCount',
                dangerId: 'lightDangerCount'
            }
        ];

        sensorOrder.forEach(sensor => {
            sensor.total = stats[sensor.type].warning + stats[sensor.type].danger;
        });

        sensorOrder.sort((a, b) => b.total - a.total);

        const contentEl = document.getElementById('thresholdStatsContent');
        if (contentEl) {
            contentEl.innerHTML = sensorOrder.map(sensor => `
                <div class="threshold-stat-item">
                    <div class="threshold-stat-icon ${sensor.type}">
                        <i class="${sensor.icon}"></i>
                    </div>
                    <div class="threshold-stat-info">
                        <h4>${sensor.label}</h4>
                        <div class="threshold-stat-values">
                            <div class="stat-value warning">
                                <span class="count" id="${sensor.warningId}">${stats[sensor.type].warning}</span>
                                <span class="label">Cảnh báo</span>
                            </div>
                            <div class="stat-value danger">
                                <span class="count" id="${sensor.dangerId}">${stats[sensor.type].danger}</span>
                                <span class="label">Nguy hiểm</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        this.currentStats = stats;
    }

    showDebugDetails() {
        if (!this.debugData) {
            alert("Vui lòng tải dữ liệu trước");
            return;
        }

        const selectedDate = this.selectedDate || this.getFormattedDate();
        const groupedData = this.groupDataByMinute(this.debugData);

        let debugHTML = `
            <div class="debug-modal-overlay" id="debugModalOverlay">
                <div class="debug-modal">
                    <div class="debug-modal-header">
                        <h3>Chi tiết thống kê vượt ngưỡng theo phút - ${selectedDate}</h3>
                        <button class="debug-close-btn" onclick="document.getElementById('debugModalOverlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="debug-modal-content">
                        <div class="debug-threshold-info">
                            <h4>Cấu hình ngưỡng hiện tại:</h4>
                            <div class="threshold-display">
                                <div class="threshold-item">
                                    <strong>Nhiệt độ:</strong>
                                    <span>Bình thường: ${this.thresholds.temperature.normal_min}°C - ${this.thresholds.temperature.normal_max}°C</span>
                                    <span>Cảnh báo: ${this.thresholds.temperature.warning_min}°C - ${this.thresholds.temperature.warning_max}°C</span>
                                </div>
                                <div class="threshold-item">
                                    <strong>Độ ẩm:</strong>
                                    <span>Bình thường: ${this.thresholds.humidity.normal_min}% - ${this.thresholds.humidity.normal_max}%</span>
                                    <span>Cảnh báo: ${this.thresholds.humidity.warning_min}% - ${this.thresholds.humidity.warning_max}%</span>
                                </div>
                                <div class="threshold-item">
                                    <strong>Ánh sáng:</strong>
                                    <span>Bình thường: ${this.thresholds.light.normal_min}% - ${this.thresholds.light.normal_max}%</span>
                                    <span>Cảnh báo: ${this.thresholds.light.warning_min}% - ${this.thresholds.light.warning_max}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="debug-summary">
                            <h4>Tổng kết:</h4>
                            <div class="summary-grid">
                                <div class="summary-item temp">
                                    <span class="label">Nhiệt độ:</span>
                                    <span class="value warning">${this.currentStats.temperature.warning} phút cảnh báo</span>
                                    <span class="value danger">${this.currentStats.temperature.danger} phút nguy hiểm</span>
                                </div>
                                <div class="summary-item hum">
                                    <span class="label">Độ ẩm:</span>
                                    <span class="value warning">${this.currentStats.humidity.warning} phút cảnh báo</span>
                                    <span class="value danger">${this.currentStats.humidity.danger} phút nguy hiểm</span>
                                </div>
                                <div class="summary-item light">
                                    <span class="label">Ánh sáng:</span>
                                    <span class="value warning">${this.currentStats.light.warning} phút cảnh báo</span>
                                    <span class="value danger">${this.currentStats.light.danger} phút nguy hiểm</span>
                                </div>
                            </div>
                            <div style="margin-top: 12px; padding: 12px; background: rgba(0, 122, 255, 0.1); border-radius: 8px;">
                                <p style="margin: 0; font-size: 13px; color: rgba(0, 0, 0, 0.7);">
                                    📊 <strong>Thống kê:</strong> ${this.debugData.length} bản ghi thô được nhóm thành ${groupedData.length} phút 
                                    (tỷ lệ nén: ${(this.debugData.length / groupedData.length).toFixed(1)}x)
                                </p>
                            </div>
                        </div>

                        <div class="debug-data-table">
                            <h4>Chi tiết theo phút (${groupedData.length} phút):</h4>
                            <div style="margin-bottom: 12px; padding: 12px; background: rgba(0, 122, 255, 0.1); border-radius: 8px;">
                                <p style="margin: 0; font-size: 13px; color: rgba(0, 0, 0, 0.7);">
                                    💡 <strong>Lưu ý:</strong> Dữ liệu đã được nhóm theo phút và tính trung bình. 
                                    Mỗi phút có vượt ngưỡng chỉ tính 1 lần, tránh đếm trùng khi dữ liệu gửi mỗi giây.
                                </p>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Thời gian (phút)</th>
                                        <th>Số bản ghi</th>
                                        <th>Nhiệt độ (TB)</th>
                                        <th>Trạng thái</th>
                                        <th>Độ ẩm (TB)</th>
                                        <th>Trạng thái</th>
                                        <th>Ánh sáng (TB)</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;

        let violationCount = 0;
        groupedData.forEach((item, index) => {
            const tempStatus = item.temperature ? this.getTemperatureStatus(item.temperature) : 'normal';
            const humStatus = item.humidity ? this.getHumidityStatus(item.humidity) : 'normal';
            const lightStatus = item.light ? this.getLightStatus(item.light) : 'normal';

            const hasViolation = tempStatus !== "normal" || humStatus !== "normal" || lightStatus !== "normal";
            if (hasViolation) violationCount++;

            const rowClass = hasViolation ? 'violation-row' : '';
            
            debugHTML += `
                <tr class="${rowClass}">
                    <td>${index + 1}</td>
                    <td>${item.timestamp}</td>
                    <td><span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${item.recordCount}</span></td>
                    <td>${item.temperature ? item.temperature.toFixed(1) + '°C' : '-'}</td>
                    <td class="status-${tempStatus}">${this.getStatusLabel(tempStatus)}</td>
                    <td>${item.humidity ? item.humidity.toFixed(1) + '%' : '-'}</td>
                    <td class="status-${humStatus}">${this.getStatusLabel(humStatus)}</td>
                    <td>${item.light ? item.light.toFixed(1) + '%' : '-'}</td>
                    <td class="status-${lightStatus}">${this.getStatusLabel(lightStatus)}</td>
                </tr>
            `;
        });

        if (groupedData.length === 0) {
            debugHTML += `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 20px; color: rgba(0, 0, 0, 0.6);">
                        <i class="fas fa-info-circle"></i> Không có dữ liệu trong ngày này
                    </td>
                </tr>
            `;
        }

        debugHTML += `
                                </tbody>
                            </table>
                            <div class="debug-footer">
                                <p><strong>Tổng số bản ghi thô:</strong> ${this.debugData.length}</p>
                                <p><strong>Số phút có dữ liệu:</strong> ${groupedData.length}</p>
                                <p><strong>Số phút vượt ngưỡng:</strong> ${violationCount}</p>
                                <p><strong>Số phút bình thường:</strong> ${groupedData.length - violationCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', debugHTML);
    }

    getStatusLabel(status) {
        switch(status) {
            case "normal": return "Bình thường";
            case "warning": return "Cảnh báo";
            case "danger": return "Nguy hiểm";
            default: return "Không xác định";
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            const selectedDate = this.selectedDate || this.getFormattedDate();
            this.loadStats(selectedDate);
        }, 30000);
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

export default ThresholdStatsControl;
