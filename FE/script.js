let temperatureChart, lightChart, humidityChart;
let lastDataTimestamp = null;
let connectionStatus = "disconnected";
let offlineStartTime = null;
let maxDataPoints = 50;
let lastChartUpdate = {
    temperature: null,
    light: null,
    humidity: null,
};

document.addEventListener("DOMContentLoaded", () => {
    const toggleSwitches = document.querySelectorAll(".toggle-switch");

    toggleSwitches.forEach((toggle, index) => {
        toggle.addEventListener("click", async function () {
            this.classList.toggle("active");

            const sensorCard = this.closest(".sensor-card");
            if (sensorCard) {
                sensorCard.classList.toggle("active");

                const sensorName =
                    sensorCard.querySelector(".sensor-name").textContent;
                let ledStatus = sensorCard.querySelector(".led-status");

                if (sensorName.includes("LED")) {
                    const ledNumber = sensorName.replace("LED ", "");
                    const isActive = this.classList.contains("active");

                    if (isActive) {
                        if (ledStatus) {
                            ledStatus.textContent = "BẬT";
                            ledStatus.className = "led-status on";
                        }
                    } else {
                        if (ledStatus) {
                            ledStatus.textContent = "TẮT";
                            ledStatus.className = "led-status off";
                        }
                    }

                    try {
                        const response = await window.iotAPI.controlLED(
                            ledNumber,
                            isActive ? "on" : "off"
                        );
                    } catch (error) {
                        this.classList.toggle("active");
                        sensorCard.classList.toggle("active");
                        if (ledStatus) {
                            ledStatus.textContent = isActive ? "TẮT" : "BẬT";
                            ledStatus.className = `led-status ${
                                isActive ? "off" : "on"
                            }`;
                        }
                    }
                }
            }
        });
    });

    initializeRealTimeUpdates();
    initializeChartsWithRealData();
    setupTimePeriodDropdowns();

    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
        item.addEventListener("click", function () {
            navItems.forEach((nav) => nav.classList.remove("active"));
            this.classList.add("active");
        });
    });
});

async function initializeRealTimeUpdates() {
    updateSystemStatus("checking");
    await updateSensorData();
    setInterval(updateSensorData, 5000);
}

async function updateSensorData() {
    try {
        const data = await window.iotAPI.getLatestSensorData();
        const currentTime = new Date();

        if (!data || data.message === "No data available") {
            handleOfflineStatus(currentTime);
            const sensorCards = document.querySelectorAll(
                ".sensor-card:not([class*='led']) .sensor-value"
            );
            return;
        }

        const dataTimestamp = new Date(data.timestamp);
        const timeDiff = currentTime - dataTimestamp;
        const isDataFresh = timeDiff < 30000;

        if (isDataFresh) {
            handleOnlineStatus(data, dataTimestamp);
        } else {
            handleOfflineStatus(currentTime, dataTimestamp);
        }

        updateSensorCards(data, isDataFresh);

        if (isDataFresh) {
            const currentTime = Date.now();
            const tempPeriod = document.getElementById(
                "temperatureTimePeriod"
            )?.value;
            const lightPeriod =
                document.getElementById("lightTimePeriod")?.value;
            const humidityPeriod =
                document.getElementById("humidityTimePeriod")?.value;

            const updateInterval = 8000;

            if (
                tempPeriod &&
                tempPeriod.startsWith("latest") &&
                (!lastChartUpdate.temperature ||
                    currentTime - lastChartUpdate.temperature > updateInterval)
            ) {
                lastChartUpdate.temperature = currentTime;
                setTimeout(
                    () => updateChartByPeriod("temperature", tempPeriod),
                    100
                );
            }
            if (
                lightPeriod &&
                lightPeriod.startsWith("latest") &&
                (!lastChartUpdate.light ||
                    currentTime - lastChartUpdate.light > updateInterval)
            ) {
                lastChartUpdate.light = currentTime;
                setTimeout(
                    () => updateChartByPeriod("light", lightPeriod),
                    200
                );
            }
            if (
                humidityPeriod &&
                humidityPeriod.startsWith("latest") &&
                (!lastChartUpdate.humidity ||
                    currentTime - lastChartUpdate.humidity > updateInterval)
            ) {
                lastChartUpdate.humidity = currentTime;
                setTimeout(
                    () => updateChartByPeriod("humidity", humidityPeriod),
                    300
                );
            }
        }
    } catch (error) {
        handleOfflineStatus(new Date());
        const sensorCards = document.querySelectorAll(
            ".sensor-card:not([class*='led']) .sensor-value"
        );
        sensorCards.forEach((card) => {
            if (card.textContent !== "--°C" && card.textContent !== "--%") {
                card.style.color = "#FF383C";
            }
        });
    }
}

function handleOnlineStatus(data, timestamp) {
    connectionStatus = "connected";
    lastDataTimestamp = timestamp;
    offlineStartTime = null;
    updateConnectionIndicator(true, timestamp);
    updateSystemStatus("online", data);
}

function handleOfflineStatus(currentTime, lastDataTime = null) {
    if (connectionStatus === "connected") {
        connectionStatus = "disconnected";
        offlineStartTime = currentTime;
    }
    updateConnectionIndicator(
        false,
        lastDataTime || lastDataTimestamp,
        currentTime
    );
    updateSystemStatus("offline", null, currentTime);
}

function updateSystemStatus(status, data = null, currentTime = new Date()) {
    const statusElement = document.getElementById("systemStatus");
    if (!statusElement) return;

    statusElement.classList.remove("online", "offline", "checking");

    if (status === "online") {
        statusElement.classList.add("online");
        statusElement.innerHTML = `
            <i class="fas fa-circle"></i>
            <span>Hệ thống hoạt động bình thường</span>
        `;
    } else if (status === "offline") {
        statusElement.classList.add("offline");
        const offlineTime = offlineStartTime
            ? Math.floor((currentTime - offlineStartTime) / 1000)
            : 0;
        statusElement.innerHTML = `
            <i class="fas fa-circle"></i>
            <span>Mất kết nối cảm biến ${
                offlineTime > 0 ? `(${offlineTime}s)` : ""
            }</span>
        `;
    } else {
        statusElement.classList.add("checking");
        statusElement.innerHTML = `
            <i class="fas fa-circle"></i>
            <span>Đang kiểm tra kết nối...</span>
        `;
    }
}

function updateConnectionIndicator(
    isOnline,
    lastDataTime,
    currentTime = new Date()
) {
    let statusElement = document.querySelector(".connection-status");

    if (!statusElement) {
        statusElement = document.createElement("div");
        statusElement.className = "connection-status";

        const headerRight = document.querySelector(".header-right");
        if (headerRight) {
            headerRight.insertBefore(statusElement, headerRight.firstChild);
        }
    }

    if (isOnline) {
        statusElement.innerHTML = `
            <i class="fas fa-wifi" style="color: #34C759;"></i>
            <span style="color: #34C759;">Online</span>
        `;
    } else {
        const offlineTime = offlineStartTime
            ? Math.floor((currentTime - offlineStartTime) / 1000)
            : 0;

        statusElement.innerHTML = `
            <i class="fas fa-wifi" style="color: #FF383C;"></i>
            <span style="color: #FF383C;">Offline</span>
        `;
    }
}

function updateSensorCards(data, isDataFresh) {
    const tempCard = document.querySelector(".sensor-card.temperature");
    const tempValueElement = tempCard?.querySelector(".sensor-value");
    // Nhiệt độ
    if (
        tempValueElement &&
        data.temperature !== null &&
        data.temperature !== undefined
    ) {
        tempValueElement.textContent = `${data.temperature}°C`;
        let tempColor = "#34C759"; // xanh lá
        if (data.temperature > 37 || data.temperature < 15) {
            tempColor = "#FF383C"; // đỏ
        } else if (
            (data.temperature >= 33 && data.temperature <= 37) ||
            (data.temperature >= 15 && data.temperature <= 19)
        ) {
            tempColor = "#FEBC2F"; // vàng
        }
        tempValueElement.style.color = tempColor;
    }

    // Độ sáng
    const lightCard = document.querySelector(".sensor-card.light");
    const lightValueElement = lightCard?.querySelector(".sensor-value");
    if (lightValueElement && data.light !== null && data.light !== undefined) {
        lightValueElement.textContent = `${data.light}%`;
        let lightColor = "#34C759";
        if (data.light < 25 || data.light > 75) {
            lightColor = "#FF383C";
        } else if (
            (data.light >= 25 && data.light < 40) ||
            (data.light > 60 && data.light <= 75)
        ) {
            lightColor = "#FEBC2F";
        }
        lightValueElement.style.color = lightColor;
    }

    // Độ ẩm
    const humidityCard = document.querySelector(".sensor-card.humidity");
    const humidityValueElement = humidityCard?.querySelector(".sensor-value");
    if (
        humidityValueElement &&
        data.humidity !== null &&
        data.humidity !== undefined
    ) {
        humidityValueElement.textContent = `${data.humidity}%`;
        let humidityColor = "#34C759";
        if (data.humidity < 25 || data.humidity > 75) {
            humidityColor = "#FF383C";
        } else if (
            (data.humidity >= 25 && data.humidity < 40) ||
            (data.humidity > 60 && data.humidity <= 75)
        ) {
            humidityColor = "#FEBC2F";
        }
        humidityValueElement.style.color = humidityColor;
    }
}

function updateSensorCardStatus(cardElement, isDataFresh, status) {
    if (!cardElement) return;

    cardElement.classList.remove("data-fresh", "data-stale", "data-error");

    if (status === "error") {
        cardElement.classList.add("data-error");
    } else if (isDataFresh && status === "online") {
        cardElement.classList.add("data-fresh");
    } else if (status === "offline") {
        cardElement.classList.add("data-stale");
    } else {
        cardElement.classList.add("data-stale");
    }
}

function updateRealTimeCharts(data, timestamp) {
    const timeLabel = timestamp.toLocaleTimeString("vi-VN");

    if (
        temperatureChart &&
        data.temperature !== null &&
        data.temperature !== undefined
    ) {
        addDataPointToChart(temperatureChart, timeLabel, data.temperature);
    }

    if (lightChart && data.light !== null && data.light !== undefined) {
        addDataPointToChart(lightChart, timeLabel, data.light);
    }

    if (
        humidityChart &&
        data.humidity !== null &&
        data.humidity !== undefined
    ) {
        addDataPointToChart(humidityChart, timeLabel, data.humidity);
    }
}

function addDataPointToChart(chart, label, value) {
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > maxDataPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update("none");
}

async function initializeChartsWithRealData() {
    try {
        const historyData = await window.iotAPI.getLatestNSensorData(5);

        if (
            historyData &&
            historyData.labels &&
            historyData.labels.length > 0
        ) {
            initializeCharts(historyData);
        } else {
            initializeEmptyCharts();
        }

        setInterval(async () => {
            try {
                const currentTime = Date.now();
                const tempPeriod = document.getElementById(
                    "temperatureTimePeriod"
                )?.value;
                const lightPeriod =
                    document.getElementById("lightTimePeriod")?.value;
                const humidityPeriod =
                    document.getElementById("humidityTimePeriod")?.value;

                const minUpdateInterval = 8000;

                if (
                    tempPeriod &&
                    tempPeriod.startsWith("latest") &&
                    (!lastChartUpdate.temperature ||
                        currentTime - lastChartUpdate.temperature >
                            minUpdateInterval)
                ) {
                    lastChartUpdate.temperature = currentTime;
                    await updateChartByPeriod("temperature", tempPeriod);
                }

                if (
                    lightPeriod &&
                    lightPeriod.startsWith("latest") &&
                    (!lastChartUpdate.light ||
                        currentTime - lastChartUpdate.light > minUpdateInterval)
                ) {
                    lastChartUpdate.light = currentTime;
                    await updateChartByPeriod("light", lightPeriod);
                }

                if (
                    humidityPeriod &&
                    humidityPeriod.startsWith("latest") &&
                    (!lastChartUpdate.humidity ||
                        currentTime - lastChartUpdate.humidity >
                            minUpdateInterval)
                ) {
                    lastChartUpdate.humidity = currentTime;
                    await updateChartByPeriod("humidity", humidityPeriod);
                }
            } catch (error) {}
        }, 10000);
    } catch (error) {
        initializeEmptyCharts();
    }
}

function setupTimePeriodDropdowns() {
    const tempDropdown = document.getElementById("temperatureTimePeriod");
    const lightDropdown = document.getElementById("lightTimePeriod");
    const humidityDropdown = document.getElementById("humidityTimePeriod");

    if (tempDropdown) {
        tempDropdown.addEventListener("change", async function () {
            await updateChartByPeriod("temperature", this.value);
        });
    }

    if (lightDropdown) {
        lightDropdown.addEventListener("change", async function () {
            await updateChartByPeriod("light", this.value);
        });
    }

    if (humidityDropdown) {
        humidityDropdown.addEventListener("change", async function () {
            await updateChartByPeriod("humidity", this.value);
        });
    }
}

async function updateChartByPeriod(chartType, period) {
    try {
        let data;
        if (period === "latest5") {
            data = await window.iotAPI.getLatestNSensorData(5);
        } else if (period === "latest10") {
            data = await window.iotAPI.getLatestNSensorData(10);
        } else if (period === "latest20") {
            data = await window.iotAPI.getLatestNSensorData(20);
        } else if (period === "latest50") {
            data = await window.iotAPI.getLatestNSensorData(50);
        } else if (period === "all") {
            data = await window.iotAPI.getAllSensorData(1, 1000);
        } else {
            data = await window.iotAPI.getSensorHistory(period);
        }

        if (!data || !data.labels || data.labels.length === 0) {
            return;
        }

        if (chartType === "temperature" && temperatureChart) {
            temperatureChart.data.labels = [...data.labels];
            temperatureChart.data.datasets[0].data = [
                ...(data.temperature || []),
            ];

            if (data.temperature && data.temperature.length > 0) {
                const validTemps = data.temperature.filter(
                    (v) => v !== null && v !== undefined
                );
                if (validTemps.length > 0) {
                    const minTemp = Math.min(...validTemps);
                    const maxTemp = Math.max(...validTemps);
                    const padding = Math.max((maxTemp - minTemp) * 0.1, 2);

                    temperatureChart.options.scales.y.min = Math.max(
                        0,
                        Math.floor(minTemp - padding)
                    );
                    temperatureChart.options.scales.y.max = Math.ceil(
                        maxTemp + padding
                    );
                }
            }

            temperatureChart.update("none");
        } else if (chartType === "light" && lightChart) {
            lightChart.data.labels = [...data.labels];
            lightChart.data.datasets[0].data = [...(data.light || [])];
            lightChart.update("none");
        } else if (chartType === "humidity" && humidityChart) {
            humidityChart.data.labels = [...data.labels];
            humidityChart.data.datasets[0].data = [...(data.humidity || [])];
            humidityChart.update("none");
        }

        if (period.startsWith("latest") && data.newest_entry) {
            const count = period.replace("latest", "");
        }

        if (period === "all" && data.pagination) {
        }
    } catch (error) {}
}

function initializeCharts(data) {
    if (!data || !data.labels || data.labels.length === 0) {
        return initializeEmptyCharts();
    }

    const labels = data.labels;
    const tempData = data.temperature || [];
    const lightData = data.light || [];
    const humidityData = data.humidity || [];

    const tempCtx = document.getElementById("temperatureChart");
    if (tempCtx) {
        temperatureChart = new Chart(tempCtx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Nhiệt độ",
                        data: tempData,
                        borderColor: "#007AFF",
                        backgroundColor: "rgba(0, 122, 255, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: "#007AFF",
                        pointHoverRadius: 5,
                        spanGaps: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "index",
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y}°C`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#666",
                            font: { size: 10 },
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        grid: { color: "#f0f0f0" },
                        ticks: { color: "#666", font: { size: 10 } },
                        min:
                            tempData.length > 0
                                ? Math.min(
                                      ...tempData.filter((v) => v !== null)
                                  ) - 5
                                : 0,
                        max:
                            tempData.length > 0
                                ? Math.max(
                                      ...tempData.filter((v) => v !== null)
                                  ) + 5
                                : 50,
                    },
                },
                elements: {
                    point: {
                        backgroundColor: function (context) {
                            const value = context.parsed.y;
                            if (value === null || value === undefined) {
                                return "#ccc";
                            }
                            return "#007AFF";
                        },
                    },
                },
            },
        });
    }

    const lightCtx = document.getElementById("lightChart");
    if (lightCtx) {
        lightChart = new Chart(lightCtx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Ánh sáng",
                        data: lightData,
                        borderColor: "#FF9500",
                        backgroundColor: "rgba(255, 149, 0, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: "#FF9500",
                        pointHoverRadius: 5,
                        spanGaps: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "index",
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#666",
                            font: { size: 10 },
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        grid: { color: "#f0f0f0" },
                        ticks: { color: "#666", font: { size: 10 } },
                        min: 0,
                        max: 100,
                    },
                },
            },
        });
    }

    const humidityCtx = document.getElementById("humidityChart");
    if (humidityCtx) {
        humidityChart = new Chart(humidityCtx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Độ ẩm",
                        data: humidityData,
                        borderColor: "#34C759",
                        backgroundColor: "rgba(52, 199, 89, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: "#34C759",
                        pointHoverRadius: 5,
                        spanGaps: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "index",
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#666",
                            font: { size: 10 },
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        grid: { color: "#f0f0f0" },
                        ticks: { color: "#666", font: { size: 10 } },
                        min: 0,
                        max: 100,
                    },
                },
            },
        });
    }
}

function initializeEmptyCharts() {
    const emptyLabels = [];
    const emptyData = [];

    const tempCtx = document.getElementById("temperatureChart");
    if (tempCtx) {
        temperatureChart = new Chart(tempCtx, {
            type: "line",
            data: {
                labels: emptyLabels,
                datasets: [
                    {
                        label: "Nhiệt độ",
                        data: emptyData,
                        borderColor: "#007AFF",
                        backgroundColor: "rgba(0, 122, 255, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: "#007AFF",
                        pointHoverRadius: 5,
                        spanGaps: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "index",
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y}°C`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#666",
                            font: { size: 10 },
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        grid: { color: "#f0f0f0" },
                        ticks: { color: "#666", font: { size: 10 } },
                        min: 0,
                        max: 50,
                    },
                },
            },
        });
    }

    const lightCtx = document.getElementById("lightChart");
    if (lightCtx) {
        lightChart = new Chart(lightCtx, {
            type: "line",
            data: {
                labels: emptyLabels,
                datasets: [
                    {
                        label: "Ánh sáng",
                        data: emptyData,
                        borderColor: "#FF9500",
                        backgroundColor: "rgba(255, 149, 0, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: "#FF9500",
                        pointHoverRadius: 5,
                        spanGaps: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "index",
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#666",
                            font: { size: 10 },
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        grid: { color: "#f0f0f0" },
                        ticks: { color: "#666", font: { size: 10 } },
                        min: 0,
                        max: 100,
                    },
                },
            },
        });
    }

    const humidityCtx = document.getElementById("humidityChart");
    if (humidityCtx) {
        humidityChart = new Chart(humidityCtx, {
            type: "line",
            data: {
                labels: emptyLabels,
                datasets: [
                    {
                        label: "Độ ẩm",
                        data: emptyData,
                        borderColor: "#34C759",
                        backgroundColor: "rgba(52, 199, 89, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: "#34C759",
                        pointHoverRadius: 5,
                        spanGaps: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "index",
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#666",
                            font: { size: 10 },
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        grid: { color: "#f0f0f0" },
                        ticks: { color: "#666", font: { size: 10 } },
                        min: 0,
                        max: 100,
                    },
                },
            },
        });
    }
}

function updateCharts(data) {
    if (temperatureChart && data.labels && data.temperature) {
        temperatureChart.data.labels = data.labels;
        temperatureChart.data.datasets[0].data = data.temperature;
        temperatureChart.update();
    }

    if (lightChart && data.labels && data.light) {
        lightChart.data.labels = data.labels;
        lightChart.data.datasets[0].data = data.light;
        lightChart.update();
    }

    if (humidityChart && data.labels && data.humidity) {
        humidityChart.data.labels = data.labels;
        humidityChart.data.datasets[0].data = data.humidity;
        humidityChart.update();
    }
}
