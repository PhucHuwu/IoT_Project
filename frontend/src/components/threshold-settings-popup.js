import SensorDataService from "../services/api.js";

class ThresholdSettingsPopup {
    constructor(onSaveCallback = null) {
        this.popup = null;
        this.thresholds = null;
        this.isOpen = false;
        this.onSaveCallback = onSaveCallback;
    }

    async show() {
        if (this.isOpen) return;

        try {
            const result = await SensorDataService.getThresholds();
            if (result.status === "success") {
                this.thresholds = result.data;
                this.render();
                this.isOpen = true;
            }
        } catch (error) {
            console.error("Lỗi khi tải cấu hình ngưỡng:", error);
            alert("Không thể tải cấu hình ngưỡng");
        }
    }

    render() {
        const overlay = document.createElement("div");
        overlay.className = "threshold-popup-overlay";

        overlay.innerHTML = `
            <div class="threshold-popup">
                <div class="threshold-popup-header">
                    <h2>Cài đặt ngưỡng cảm biến</h2>
                    <button class="threshold-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="threshold-popup-content">
                    <div class="threshold-section">
                        <h3>
                            <i class="fas fa-thermometer-half"></i>
                            Nhiệt độ
                        </h3>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Ngưỡng cảnh báo</label>
                                <input type="number" step="0.1" id="temp-warning" 
                                    value="${this.thresholds.temperature.warning}" />
                                <span class="unit">°C</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>Ngưỡng nguy hiểm</label>
                                <input type="number" step="0.1" id="temp-danger" 
                                    value="${this.thresholds.temperature.danger}" />
                                <span class="unit">°C</span>
                            </div>
                        </div>
                        <div class="threshold-hint">
                            <i class="fas fa-info-circle"></i>
                            Nếu giá trị ≥ ngưỡng nguy hiểm thì nguy hiểm, ≥ ngưỡng cảnh báo thì cảnh báo
                        </div>
                    </div>

                    <div class="threshold-section">
                        <h3>
                            <i class="fas fa-tint"></i>
                            Độ ẩm
                        </h3>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Ngưỡng cảnh báo</label>
                                <input type="number" step="0.1" id="humidity-warning" 
                                    value="${this.thresholds.humidity.warning}" />
                                <span class="unit">%</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>Ngưỡng nguy hiểm</label>
                                <input type="number" step="0.1" id="humidity-danger" 
                                    value="${this.thresholds.humidity.danger}" />
                                <span class="unit">%</span>
                            </div>
                        </div>
                        <div class="threshold-hint">
                            <i class="fas fa-info-circle"></i>
                            Nếu giá trị ≥ ngưỡng nguy hiểm thì nguy hiểm, ≥ ngưỡng cảnh báo thì cảnh báo
                        </div>
                    </div>

                    <div class="threshold-section">
                        <h3>
                            <i class="fas fa-sun"></i>
                            Ánh sáng
                        </h3>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Ngưỡng cảnh báo</label>
                                <input type="number" step="0.1" id="light-warning" 
                                    value="${this.thresholds.light.warning}" />
                                <span class="unit">%</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>Ngưỡng nguy hiểm</label>
                                <input type="number" step="0.1" id="light-danger" 
                                    value="${this.thresholds.light.danger}" />
                                <span class="unit">%</span>
                            </div>
                        </div>
                        <div class="threshold-hint">
                            <i class="fas fa-info-circle"></i>
                            Nếu giá trị ≥ ngưỡng nguy hiểm thì nguy hiểm, ≥ ngưỡng cảnh báo thì cảnh báo
                        </div>
                    </div>
                </div>

                <div class="threshold-popup-footer">
                    <button class="threshold-reset-btn">
                        <i class="fas fa-undo"></i>
                        Đặt lại mặc định
                    </button>
                    <div class="threshold-action-btns">
                        <button class="threshold-cancel-btn">Hủy</button>
                        <button class="threshold-save-btn">
                            <i class="fas fa-save"></i>
                            Lưu
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.popup = overlay;

        setTimeout(() => {
            overlay.classList.add("active");
        }, 10);

        this.attachEventListeners();
    }

    attachEventListeners() {
        const closeBtn = this.popup.querySelector(".threshold-close-btn");
        const cancelBtn = this.popup.querySelector(".threshold-cancel-btn");
        const saveBtn = this.popup.querySelector(".threshold-save-btn");
        const resetBtn = this.popup.querySelector(".threshold-reset-btn");
        const overlay = this.popup;

        closeBtn.addEventListener("click", () => this.close());
        cancelBtn.addEventListener("click", () => this.close());
        saveBtn.addEventListener("click", () => this.save());
        resetBtn.addEventListener("click", () => this.reset());

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
    }

    async save() {
        const saveBtn = this.popup.querySelector(".threshold-save-btn");
        const originalContent = saveBtn.innerHTML;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

            const newThresholds = {
                temperature: {
                    warning: parseFloat(document.getElementById("temp-warning").value),
                    danger: parseFloat(document.getElementById("temp-danger").value),
                },
                humidity: {
                    warning: parseFloat(document.getElementById("humidity-warning").value),
                    danger: parseFloat(document.getElementById("humidity-danger").value),
                },
                light: {
                    warning: parseFloat(document.getElementById("light-warning").value),
                    danger: parseFloat(document.getElementById("light-danger").value),
                },
            };

            for (const sensor in newThresholds) {
                const { warning, danger } = newThresholds[sensor];
                if (warning >= danger) {
                    alert(`Ngưỡng cảnh báo phải nhỏ hơn ngưỡng nguy hiểm cho ${sensor === 'temperature' ? 'nhiệt độ' : sensor === 'humidity' ? 'độ ẩm' : 'ánh sáng'}`);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalContent;
                    return;
                }
                if (warning < 0 || danger < 0) {
                    alert(`Ngưỡng không được âm cho ${sensor === 'temperature' ? 'nhiệt độ' : sensor === 'humidity' ? 'độ ẩm' : 'ánh sáng'}`);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalContent;
                    return;
                }
            }

            const result = await SensorDataService.updateThresholds(
                newThresholds
            );

            if (result.status === "success") {
                alert("Cập nhật cấu hình ngưỡng thành công");
                if (this.onSaveCallback) {
                    this.onSaveCallback();
                }
                this.close();
            } else {
                alert(
                    `Lỗi: ${result.message || "Không thể cập nhật cấu hình"}`
                );
            }
        } catch (error) {
            console.error("Lỗi khi lưu cấu hình:", error);
            alert("Không thể lưu cấu hình ngưỡng");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalContent;
        }
    }

    async reset() {
        if (!confirm("Bạn có chắc muốn đặt lại ngưỡng về giá trị mặc định?")) {
            return;
        }

        const defaultThresholds = {
            temperature: {
                warning: 35.0,
                danger: 40.0,
            },
            humidity: {
                warning: 70.0,
                danger: 85.0,
            },
            light: {
                warning: 60.0,
                danger: 80.0,
            },
        };

        document.getElementById("temp-warning").value = defaultThresholds.temperature.warning;
        document.getElementById("temp-danger").value = defaultThresholds.temperature.danger;

        document.getElementById("humidity-warning").value = defaultThresholds.humidity.warning;
        document.getElementById("humidity-danger").value = defaultThresholds.humidity.danger;

        document.getElementById("light-warning").value = defaultThresholds.light.warning;
        document.getElementById("light-danger").value = defaultThresholds.light.danger;
    }

    close() {
        if (!this.popup) return;

        this.popup.classList.remove("active");

        setTimeout(() => {
            if (this.popup && this.popup.parentNode) {
                this.popup.parentNode.removeChild(this.popup);
            }
            this.popup = null;
            this.isOpen = false;
        }, 300);
    }
}

export default ThresholdSettingsPopup;
