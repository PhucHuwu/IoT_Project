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

        this._onVisibilityChangeBound = () => {
            if (document.visibilityState === "visible") {
                this.loadLEDStatesFromBackend();
            }
        };
        this._onWindowFocusBound = () => this.loadLEDStatesFromBackend();

        this.initializeLEDControls();
        this.loadLEDStatesFromBackend();

        document.addEventListener(
            "visibilitychange",
            this._onVisibilityChangeBound
        );
        window.addEventListener("focus", this._onWindowFocusBound);
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
                    if (toggleSwitch.classList.contains("loading")) {
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
        const currentState = this.ledStates[ledId];
        const newState = !currentState;
        const newAction = newState ? "ON" : "OFF";

        this.ledStates[ledId] = newState;
        this.updateLEDUI(toggleElement, statusElement, newState);
        toggleElement.classList.add("loading");

        try {
            const result = await SensorDataService.controlLED(ledId, newAction);

            if (result.status === "success") {
                console.log(
                    `${ledId} đã ${newAction === "ON" ? "bật" : "tắt"}`
                );

                setTimeout(() => {
                    this.loadLEDStatesFromBackend();
                }, 2000);
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
        }
    }

    async loadLEDStatesFromBackend() {
        try {
            const statusResult = await SensorDataService.getLEDStatus();

            if (
                !statusResult ||
                statusResult.status !== "success" ||
                !statusResult.data
            ) {
                console.warn("Không thể lấy trạng thái LED từ backend");
                return;
            }

            const ledStatuses = statusResult.data;

            Object.keys(this.ledStates).forEach((ledId) => {
                const state = ledStatuses[ledId];
                let isOn = false;

                if (state !== undefined && state !== null) {
                    const s = String(state).toUpperCase();
                    isOn = s === "ON" || s === "1" || s === "TRUE";
                }

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
                    }
                }
            });

            console.log("Trạng thái LED đã được cập nhật:", this.ledStates);
        } catch (error) {
            console.error("Lỗi khi tải trạng thái LED từ backend:", error);
        }
    }

    updateLEDUI(toggleElement, statusElement, isOn) {
        if (isOn) {
            toggleElement.classList.add("active");
            statusElement.textContent = "BẬT 💡";
            statusElement.style.color = "#34C759";
        } else {
            toggleElement.classList.remove("active");
            statusElement.textContent = "TẮT";
            statusElement.style.color = "#999";
        }
    }

    destroy() {
        if (Array.isArray(this._listeners)) {
            this._listeners.forEach((item) => {
                try {
                    item.element.removeEventListener(item.type, item.handler);
                } catch (e) {
                }
            });
        }

        document.removeEventListener(
            "visibilitychange",
            this._onVisibilityChangeBound
        );
        window.removeEventListener("focus", this._onWindowFocusBound);

        this._listeners = [];
        this._initialized = false;
    }
}

export default LEDController;
