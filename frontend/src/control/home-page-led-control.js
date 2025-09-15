import SensorDataService from "../services/api.js";

class LEDController {
    constructor() {
        this.ledStates = {
            LED1: false,
            LED2: false,
            LED3: false,
        };
        this.initializeLEDControls();
        this.loadLEDStatesFromBackend();
    }

    initializeLEDControls() {
        const ledCards = document.querySelectorAll(
            '.sensor-card[class*="led"]'
        );

        ledCards.forEach((card) => {
            const toggleSwitch = card.querySelector(".toggle-switch");
            const ledStatus = card.querySelector(".led-status");

            if (toggleSwitch) {
                const ledNumber = this.getLEDNumber(card.className);
                const ledId = `LED${ledNumber}`;

                toggleSwitch.addEventListener("click", (e) => {
                    if (toggleSwitch.classList.contains("loading")) {
                        e.preventDefault();
                        return;
                    }
                    this.toggleLED(ledId, toggleSwitch, ledStatus);
                });
            }
        });
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
            const historyResult = await SensorDataService.getActionHistory(100);

            if (
                !historyResult ||
                historyResult.status !== "success" ||
                !Array.isArray(historyResult.data)
            ) {
                console.warn(
                    "Không có lịch sử hành động hợp lệ để xác định trạng thái LED"
                );
                return;
            }

            const actions = historyResult.data;

            // Determine latest action per LED. Backend stores action history with fields: { led: 'LED1', state: 'ON' }
            const latestByLed = {};
            for (const act of actions) {
                const ledId =
                    act.led || act.led_id || act.device_id || act.deviceId;
                const state = act.state || act.action || act.cmd || act.command;
                if (!ledId || state === undefined || state === null) continue;

                if (!latestByLed[ledId])
                    latestByLed[ledId] = { state: state, raw: act };
            }

            // Update internal states and UI
            Object.keys(this.ledStates).forEach((ledId) => {
                const latest = latestByLed[ledId];
                let isOn = false;
                if (
                    latest &&
                    latest.state !== undefined &&
                    latest.state !== null
                ) {
                    const s = String(latest.state).toUpperCase();
                    isOn =
                        s === "ON" ||
                        s === "1" ||
                        s === "TRUE" ||
                        s === "ON_LINE" ||
                        s === "ONLINE";
                }
                this.ledStates[ledId] = !!isOn;

                // Update UI elements if present
                const card =
                    document.querySelector(
                        `.sensor-card.${ledId.toLowerCase()}`
                    ) ||
                    document.querySelector(
                        `.sensor-card[class*="${ledId.toLowerCase()}"]`
                    );
                if (card) {
                    const toggleSwitch = card.querySelector(".toggle-switch");
                    const statusElement = card.querySelector(".led-status");
                    if (toggleSwitch && statusElement) {
                        this.updateLEDUI(toggleSwitch, statusElement, isOn);
                    }
                }
            });
        } catch (error) {
            console.error("Lỗi khi tải trạng thái LED từ backend:", error);
        }
    }

    updateLEDUI(toggleElement, statusElement, isOn) {
        if (isOn) {
            toggleElement.classList.add("active");
            statusElement.textContent = "BẬT";
            statusElement.style.color = "#34C759";
        } else {
            toggleElement.classList.remove("active");
            statusElement.textContent = "TẮT";
            statusElement.style.color = "#999";
        }
    }
}

export default LEDController;
