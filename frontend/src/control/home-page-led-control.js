import SensorDataService from "../services/api.js";

class LEDController {
    constructor() {
        this.ledStates = {
            LED1: false,
            LED2: false,
            LED3: false,
        };
        this._initialized = false;
        this._listeners = [];
        this._processingLEDs = new Set();
        this._hasInitializedFromBackend = false;

        this.initializeLEDControls();
        this.loadLEDStatesFromBackend();
    }

    initializeLEDControls() {
        if (this._initialized) return;

        const ledCards = document.querySelectorAll(
            '.sensor-card[class*="led"]'
        );

        ledCards.forEach((card) => {
            const toggleSwitch = card.querySelector(".toggle-switch");
            const ledStatus = card.querySelector(".led-status");

            if (toggleSwitch) {
                const ledNumber = this.getLEDNumber(card.className);
                const ledId = `LED${ledNumber}`;

                const handler = (e) => {
                    if (
                        toggleSwitch.classList.contains("loading") ||
                        this._processingLEDs.has(ledId)
                    ) {
                        e.preventDefault();
                        return;
                    }
                    this.toggleLED(ledId, toggleSwitch, ledStatus);
                };

                toggleSwitch.addEventListener("click", handler);
                this._listeners.push({
                    element: toggleSwitch,
                    type: "click",
                    handler,
                });
            }
        });

        this._initialized = true;
    }

    getLEDNumber(className) {
        if (className.includes("led1")) return "1";
        if (className.includes("led2")) return "2";
        if (className.includes("led3")) return "3";
        return "1";
    }

    async toggleLED(ledId, toggleElement, statusElement) {
        if (this._processingLEDs.has(ledId)) {
            return;
        }

        const currentState = this.ledStates[ledId];
        const newState = !currentState;
        const newAction = newState ? "ON" : "OFF";

        this._processingLEDs.add(ledId);

        this.ledStates[ledId] = newState;
        this.updateLEDUI(toggleElement, statusElement, newState);
        toggleElement.classList.add("loading");

        try {
            const result = await SensorDataService.controlLED(ledId, newAction);

            if (result.status === "success") {
                console.log(
                    `${ledId} đã ${newAction === "ON" ? "bật" : "tắt"}`
                );
            } else {
                throw new Error(result.message || "Lỗi không xác định");
            }
        } catch (error) {
            this.ledStates[ledId] = currentState;
            this.updateLEDUI(toggleElement, statusElement, currentState);

            console.error(`Lỗi điều khiển ${ledId}:`, error);
            alert(`Không thể điều khiển ${ledId}: ${error.message}`);
        } finally {
            toggleElement.classList.remove("loading");
            this._processingLEDs.delete(ledId);
        }
    }

    async loadLEDStatesFromBackend() {
        if (this._hasInitializedFromBackend) {
            console.log(
                "Đã khởi tạo trạng thái LED từ backend, bỏ qua lần gọi này"
            );
            return;
        }

        try {
            console.log(
                "Đang khởi tạo trạng thái LED từ backend cho trang Home-page..."
            );
            const homeDataResult = await SensorDataService.getHomeData();

            if (
                !homeDataResult ||
                homeDataResult.status !== "success" ||
                !homeDataResult.data ||
                !homeDataResult.data.led_status
            ) {
                console.warn(
                    "Không thể lấy dữ liệu trang chủ từ backend:",
                    homeDataResult
                );
                return;
            }

            const ledStatuses = homeDataResult.data.led_status;
            console.log("Trạng thái LED cuối cùng từ backend:", ledStatuses);

            Object.keys(this.ledStates).forEach((ledId) => {
                const state = ledStatuses[ledId];
                let isOn = false;

                if (state !== undefined && state !== null) {
                    const s = String(state).toUpperCase();
                    isOn = s === "ON" || s === "1" || s === "TRUE";
                }

                console.log(
                    `Khởi tạo ${ledId}: trạng thái cuối cùng=${state}, toggle=${
                        isOn ? "ON" : "OFF"
                    }`
                );

                this.ledStates[ledId] = !!isOn;

                const normalizedLower = ledId.toLowerCase();
                const card =
                    document.querySelector(`.sensor-card.${normalizedLower}`) ||
                    document.querySelector(
                        `.sensor-card[class*="${normalizedLower}"]`
                    );
                if (card) {
                    const toggleSwitch = card.querySelector(".toggle-switch");
                    const statusElement = card.querySelector(".led-status");
                    if (toggleSwitch && statusElement) {
                        this.updateLEDUI(toggleSwitch, statusElement, isOn);
                        console.log(
                            `Toggle ${ledId} đã được khởi tạo: ${
                                isOn ? "BẬT" : "TẮT"
                            }`
                        );
                    }
                }
            });

            this._hasInitializedFromBackend = true;
            console.log(
                "Hoàn thành khởi tạo trạng thái LED cho trang Home-page:",
                this.ledStates
            );
        } catch (error) {
            console.error("Lỗi khi khởi tạo trạng thái LED từ backend:", error);
        }
    }

    updateLEDUI(toggleElement, statusElement, isOn) {
        if (isOn) {
            toggleElement.classList.add("active");
            statusElement.textContent = "BẬT 💡";
            statusElement.style.color = "#34C759";
            statusElement.classList.add("on");
        } else {
            toggleElement.classList.remove("active");
            statusElement.textContent = "TẮT";
            statusElement.style.color = "#999";
            statusElement.classList.remove("on");
        }
    }

    resetInitialization() {
        this._hasInitializedFromBackend = false;
        console.log("Đã reset trạng thái khởi tạo LED controller");
    }

    destroy() {
        if (Array.isArray(this._listeners)) {
            this._listeners.forEach((item) => {
                try {
                    item.element.removeEventListener(item.type, item.handler);
                } catch (e) {}
            });
        }

        this._listeners = [];
        this._initialized = false;
        this._hasInitializedFromBackend = false;
    }
}

export default LEDController;
