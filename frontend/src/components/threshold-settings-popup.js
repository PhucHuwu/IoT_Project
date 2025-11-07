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
                                <label>Bình thường từ</label>
                                <input type="number" step="0.1" id="temp-normal-min" 
                                    value="${this.thresholds.temperature.normal_min}" />
                                <span class="unit">°C</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>đến</label>
                                <input type="number" step="0.1" id="temp-normal-max" 
                                    value="${this.thresholds.temperature.normal_max}" />
                                <span class="unit">°C</span>
                            </div>
                        </div>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Cảnh báo từ</label>
                                <input type="number" step="0.1" id="temp-warning-min" 
                                    value="${this.thresholds.temperature.warning_min}" />
                                <span class="unit">°C</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>đến</label>
                                <input type="number" step="0.1" id="temp-warning-max" 
                                    value="${this.thresholds.temperature.warning_max}" />
                                <span class="unit">°C</span>
                            </div>
                        </div>
                    </div>

                    <div class="threshold-section">
                        <h3>
                            <i class="fas fa-tint"></i>
                            Độ ẩm
                        </h3>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Bình thường từ</label>
                                <input type="number" step="0.1" id="humidity-normal-min" 
                                    value="${this.thresholds.humidity.normal_min}" />
                                <span class="unit">%</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>đến</label>
                                <input type="number" step="0.1" id="humidity-normal-max" 
                                    value="${this.thresholds.humidity.normal_max}" />
                                <span class="unit">%</span>
                            </div>
                        </div>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Cảnh báo từ</label>
                                <input type="number" step="0.1" id="humidity-warning-min" 
                                    value="${this.thresholds.humidity.warning_min}" />
                                <span class="unit">%</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>đến</label>
                                <input type="number" step="0.1" id="humidity-warning-max" 
                                    value="${this.thresholds.humidity.warning_max}" />
                                <span class="unit">%</span>
                            </div>
                        </div>
                    </div>

                    <div class="threshold-section">
                        <h3>
                            <i class="fas fa-sun"></i>
                            Ánh sáng
                        </h3>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Bình thường từ</label>
                                <input type="number" step="0.1" id="light-normal-min" 
                                    value="${this.thresholds.light.normal_min}" />
                                <span class="unit">%</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>đến</label>
                                <input type="number" step="0.1" id="light-normal-max" 
                                    value="${this.thresholds.light.normal_max}" />
                                <span class="unit">%</span>
                            </div>
                        </div>
                        <div class="threshold-inputs">
                            <div class="threshold-input-group">
                                <label>Cảnh báo từ</label>
                                <input type="number" step="0.1" id="light-warning-min" 
                                    value="${this.thresholds.light.warning_min}" />
                                <span class="unit">%</span>
                            </div>
                            <div class="threshold-input-group">
                                <label>đến</label>
                                <input type="number" step="0.1" id="light-warning-max" 
                                    value="${this.thresholds.light.warning_max}" />
                                <span class="unit">%</span>
                            </div>
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
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

            const newThresholds = {
                temperature: {
                    normal_min: parseFloat(document.getElementById("temp-normal-min").value),
                    normal_max: parseFloat(document.getElementById("temp-normal-max").value),
                    warning_min: parseFloat(document.getElementById("temp-warning-min").value),
                    warning_max: parseFloat(document.getElementById("temp-warning-max").value),
                },
                humidity: {
                    normal_min: parseFloat(document.getElementById("humidity-normal-min").value),
                    normal_max: parseFloat(document.getElementById("humidity-normal-max").value),
                    warning_min: parseFloat(document.getElementById("humidity-warning-min").value),
                    warning_max: parseFloat(document.getElementById("humidity-warning-max").value),
                },
                light: {
                    normal_min: parseFloat(document.getElementById("light-normal-min").value),
                    normal_max: parseFloat(document.getElementById("light-normal-max").value),
                    warning_min: parseFloat(document.getElementById("light-warning-min").value),
                    warning_max: parseFloat(document.getElementById("light-warning-max").value),
                },
            };

            const result = await SensorDataService.updateThresholds(newThresholds);

            if (result.status === "success") {
                alert("Cập nhật cấu hình ngưỡng thành công");
                if (this.onSaveCallback) {
                    this.onSaveCallback();
                }
                this.close();
            } else {
                alert(`Lỗi: ${result.message || "Không thể cập nhật cấu hình"}`);
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
                normal_min: 25.0,
                normal_max: 35.0,
                warning_min: 15.0,
                warning_max: 40.0,
            },
            humidity: {
                normal_min: 40.0,
                normal_max: 60.0,
                warning_min: 30.0,
                warning_max: 70.0,
            },
            light: {
                normal_min: 40.0,
                normal_max: 60.0,
                warning_min: 20.0,
                warning_max: 80.0,
            },
        };

        document.getElementById("temp-normal-min").value = defaultThresholds.temperature.normal_min;
        document.getElementById("temp-normal-max").value = defaultThresholds.temperature.normal_max;
        document.getElementById("temp-warning-min").value = defaultThresholds.temperature.warning_min;
        document.getElementById("temp-warning-max").value = defaultThresholds.temperature.warning_max;

        document.getElementById("humidity-normal-min").value = defaultThresholds.humidity.normal_min;
        document.getElementById("humidity-normal-max").value = defaultThresholds.humidity.normal_max;
        document.getElementById("humidity-warning-min").value = defaultThresholds.humidity.warning_min;
        document.getElementById("humidity-warning-max").value = defaultThresholds.humidity.warning_max;

        document.getElementById("light-normal-min").value = defaultThresholds.light.normal_min;
        document.getElementById("light-normal-max").value = defaultThresholds.light.normal_max;
        document.getElementById("light-warning-min").value = defaultThresholds.light.warning_min;
        document.getElementById("light-warning-max").value = defaultThresholds.light.warning_max;
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
