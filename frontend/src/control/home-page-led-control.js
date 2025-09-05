import SensorDataService from "../services/api.js";

class LEDController {
    constructor() {
        this.ledStates = {
            LED1: false,
            LED2: false,
            LED3: false,
        };
        this.initializeLEDControls();
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

                toggleSwitch.addEventListener("click", () => {
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
        const newAction = currentState ? "OFF" : "ON";

        try {
            toggleElement.classList.add("loading");

            const result = await SensorDataService.controlLED(ledId, newAction);

            if (result.status === "success") {
                this.ledStates[ledId] = !currentState;
                this.updateLEDUI(toggleElement, statusElement, !currentState);
                console.log(
                    `${ledId} đã ${newAction === "ON" ? "bật" : "tắt"}`
                );
            } else {
                throw new Error(result.message || "Lỗi không xác định");
            }
        } catch (error) {
            console.error(`Lỗi điều khiển ${ledId}:`, error);
            alert(`Không thể điều khiển ${ledId}: ${error.message}`);
        } finally {
            toggleElement.classList.remove("loading");
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
