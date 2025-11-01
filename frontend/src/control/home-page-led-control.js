import SensorDataService from "../services/api.js";
import LEDStatsBadge from "../components/led-stats-badge.js";

class LEDController {
    constructor() {
        this.ledStates = {
            LED1: false,
            LED2: false,
            LED3: false,
            LED4: false,
        };
        this._initialized = false;
        this._listeners = [];
        this._processingLEDs = new Set();
        this._hasInitializedFromBackend = false;
        this._pollingInterval = null;
        this._pollingEnabled = true;
        this._statsPollingInterval = null;
        this.statsBadge = new LEDStatsBadge();

        this.initializeLEDControls();
        this.loadLEDStatesFromBackend();
        this.startPeriodicStatusCheck();
        this.startStatsPolling();
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
        if (className.includes("led4")) return "4";
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
        toggleElement.classList.add("loading");

        this.updateLEDUI(toggleElement, statusElement, currentState, true);

        try {
            const result = await SensorDataService.controlLED(ledId, newAction);

            if (result.status === "success") {
                console.log(
                    `Lệnh ${ledId} ${
                        newAction === "ON" ? "bật" : "tắt"
                    } đã được gửi, đang chờ xác nhận từ hardware...`
                );

                this.startStatusPolling(
                    ledId,
                    toggleElement,
                    statusElement,
                    newState
                );
            } else {
                throw new Error(result.message || "Lỗi không xác định");
            }
        } catch (error) {
            console.error(`Lỗi điều khiển ${ledId}:`, error);

            this.ledStates[ledId] = currentState;

            if (currentState) {
                toggleElement.classList.add("active");
            } else {
                toggleElement.classList.remove("active");
            }

            statusElement.textContent = "Mất kết nối với phần cứng";
            statusElement.style.color = "#FF3B30";
            statusElement.classList.remove("on");
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
            const statusResult = await SensorDataService.getLEDStatus();

            if (
                !statusResult ||
                statusResult.status !== "success" ||
                !statusResult.data ||
                !statusResult.data.led_states
            ) {
                console.warn(
                    "Không thể lấy trạng thái LED từ backend:",
                    statusResult
                );
                return;
            }

            const ledStates = statusResult.data.led_states;
            const pendingCommands = statusResult.data.pending_commands || {};
            console.log("Trạng thái LED từ backend:", ledStates);
            console.log("Pending commands:", pendingCommands);

            Object.keys(this.ledStates).forEach((ledId) => {
                const state = ledStates[ledId];
                const isPending = pendingCommands[ledId] || false;
                let isOn = false;

                if (state !== undefined && state !== null) {
                    const s = String(state).toUpperCase();
                    isOn = s === "ON" || s === "1" || s === "TRUE";
                }

                console.log(
                    `Khởi tạo ${ledId}: trạng thái=${state}, pending=${isPending}, toggle=${
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
                        if (isPending) {
                            this.updateLEDUI(
                                toggleSwitch,
                                statusElement,
                                isOn,
                                true
                            );
                        } else {
                            this.updateLEDUI(toggleSwitch, statusElement, isOn);
                        }
                        console.log(
                            `Toggle ${ledId} đã được khởi tạo: ${
                                isPending ? "ĐANG XỬ LÝ" : isOn ? "BẬT" : "TẮT"
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

    updateLEDUI(toggleElement, statusElement, isOn, isProcessing = false) {
        if (isProcessing) {
            toggleElement.classList.remove("active");
            statusElement.textContent = "Đang xử lý...";
            statusElement.style.color = "#FF9500";
            statusElement.classList.remove("on");
        } else if (isOn) {
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

    startStatusPolling(ledId, toggleElement, statusElement, expectedState) {
        const maxAttempts = 6;
        let attempts = 0;

        const pollInterval = setInterval(async () => {
            attempts++;

            try {
                const statusResult = await SensorDataService.getLEDStatus();

                if (statusResult.status === "success" && statusResult.data) {
                    const ledStates = statusResult.data.led_states;
                    const pendingCommands = statusResult.data.pending_commands;

                    if (!pendingCommands[ledId]) {
                        const actualState = ledStates[ledId] === "ON";

                        if (actualState === expectedState) {
                            this.ledStates[ledId] = actualState;
                            this.updateLEDUI(
                                toggleElement,
                                statusElement,
                                actualState
                            );
                            console.log(
                                `${ledId} đã được xác nhận ${
                                    actualState ? "BẬT" : "TẮT"
                                }`
                            );
                            clearInterval(pollInterval);
                            return;
                        } else {
                            console.warn(
                                `${ledId} trạng thái không khớp: mong đợi ${expectedState}, thực tế ${actualState}`
                            );
                            this.ledStates[ledId] = actualState;
                            this.updateLEDUI(
                                toggleElement,
                                statusElement,
                                actualState
                            );
                            clearInterval(pollInterval);
                            return;
                        }
                    }
                }

                if (attempts >= maxAttempts) {
                    console.error(
                        `${ledId} timeout - không nhận được xác nhận từ hardware`
                    );
                    clearInterval(pollInterval);

                    this.ledStates[ledId] = !expectedState;

                    if (!expectedState) {
                        toggleElement.classList.add("active");
                    } else {
                        toggleElement.classList.remove("active");
                    }

                    statusElement.textContent = "Mất kết nối với phần cứng";
                    statusElement.style.color = "#FF3B30";
                    statusElement.classList.remove("on");
                }
            } catch (error) {
                console.error(`Lỗi khi polling trạng thái ${ledId}:`, error);

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);

                    this.ledStates[ledId] = !expectedState;

                    if (!expectedState) {
                        toggleElement.classList.add("active");
                    } else {
                        toggleElement.classList.remove("active");
                    }

                    statusElement.textContent = "Mất kết nối với phần cứng";
                    statusElement.style.color = "#FF3B30";
                    statusElement.classList.remove("on");
                }
            }
        }, 500);
    }

    startPeriodicStatusCheck() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }

        this._pollingInterval = setInterval(async () => {
            if (!this._pollingEnabled) return;

            try {
                await this.checkAndUpdateLEDStatus();
            } catch (error) {
                console.error("Lỗi trong periodic status check:", error);
            }
        }, 3000);
    }

    stopPeriodicStatusCheck() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    }

    startStatsPolling() {
        this.loadLEDStats();

        if (this._statsPollingInterval) {
            clearInterval(this._statsPollingInterval);
        }

        this._statsPollingInterval = setInterval(async () => {
            await this.loadLEDStats();
        }, 3000);
    }

    async loadLEDStats() {
        try {
            const result = await SensorDataService.getLEDStats(true);

            if (result.status === "success" && result.data) {
                this.statsBadge.updateAllBadges(result.data);
                console.log("LED stats updated:", result.data);
            }
        } catch (error) {
            console.error("Lỗi khi tải thống kê LED:", error);
        }
    }

    stopStatsPolling() {
        if (this._statsPollingInterval) {
            clearInterval(this._statsPollingInterval);
            this._statsPollingInterval = null;
        }
    }

    async checkAndUpdateLEDStatus() {
        try {
            const statusResult = await SensorDataService.getLEDStatus();

            if (statusResult.status === "success" && statusResult.data) {
                const ledStates = statusResult.data.led_states;
                const pendingCommands =
                    statusResult.data.pending_commands || {};

                this.resetErrorStates();

                Object.keys(this.ledStates).forEach((ledId) => {
                    const actualState = ledStates[ledId] === "ON";
                    const isPending = pendingCommands[ledId] || false;

                    if (!this._processingLEDs.has(ledId)) {
                        const normalizedLower = ledId.toLowerCase();
                        const card =
                            document.querySelector(
                                `.sensor-card.${normalizedLower}`
                            ) ||
                            document.querySelector(
                                `.sensor-card[class*="${normalizedLower}"]`
                            );

                        if (card) {
                            const toggleSwitch =
                                card.querySelector(".toggle-switch");
                            const statusElement =
                                card.querySelector(".led-status");

                            if (toggleSwitch && statusElement) {
                                this.ledStates[ledId] = actualState;

                                if (isPending) {
                                    this.updateLEDUI(
                                        toggleSwitch,
                                        statusElement,
                                        actualState,
                                        true
                                    );
                                } else {
                                    this.updateLEDUI(
                                        toggleSwitch,
                                        statusElement,
                                        actualState
                                    );
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Lỗi khi kiểm tra trạng thái LED:", error);

            Object.keys(this.ledStates).forEach((ledId) => {
                if (!this._processingLEDs.has(ledId)) {
                    const normalizedLower = ledId.toLowerCase();
                    const card =
                        document.querySelector(
                            `.sensor-card.${normalizedLower}`
                        ) ||
                        document.querySelector(
                            `.sensor-card[class*="${normalizedLower}"]`
                        );

                    if (card) {
                        const statusElement = card.querySelector(".led-status");
                        if (statusElement) {
                            statusElement.textContent =
                                "Mất kết nối với phần cứng";
                            statusElement.style.color = "#FF3B30";
                        }
                    }
                }
            });
        }
    }

    resetInitialization() {
        this._hasInitializedFromBackend = false;
        console.log("Đã reset trạng thái khởi tạo LED controller");
    }

    resetErrorStates() {
        Object.keys(this.ledStates).forEach((ledId) => {
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
                    if (
                        statusElement.textContent ===
                        "Mất kết nối với phần cứng"
                    ) {
                        this.updateLEDUI(
                            toggleSwitch,
                            statusElement,
                            this.ledStates[ledId]
                        );
                    }
                }
            }
        });
    }

    testErrorDisplay(ledId) {
        const normalizedLower = ledId.toLowerCase();
        const card =
            document.querySelector(`.sensor-card.${normalizedLower}`) ||
            document.querySelector(`.sensor-card[class*="${normalizedLower}"]`);

        if (card) {
            const toggleSwitch = card.querySelector(".toggle-switch");
            const statusElement = card.querySelector(".led-status");

            if (toggleSwitch && statusElement) {
                toggleSwitch.classList.remove("active");

                statusElement.textContent = "Mất kết nối với phần cứng";
                statusElement.style.color = "#FF3B30";
                statusElement.classList.remove("on");

                console.log(
                    `Test error display for ${ledId}:`,
                    statusElement.textContent
                );
            }
        }
    }

    destroy() {
        if (Array.isArray(this._listeners)) {
            this._listeners.forEach((item) => {
                try {
                    item.element.removeEventListener(item.type, item.handler);
                } catch (e) {}
            });
        }

        this.stopPeriodicStatusCheck();
        this.stopStatsPolling();
        this._listeners = [];
        this._initialized = false;
        this._hasInitializedFromBackend = false;
        this._pollingEnabled = false;
    }
}

export default LEDController;
