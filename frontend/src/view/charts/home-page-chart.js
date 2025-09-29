class HomePageChart {
    constructor() {
        this.sensorChart = null;
        this.currentSensorType = null;
    }

    updateChart(data, sensorType) {
        console.log("HomePageChart.updateChart called with:", {
            data,
            sensorType,
        });

        const ctx = document.getElementById("sensorChart");
        if (!ctx) {
            console.error("Canvas element 'sensorChart' not found");
            return;
        }

        const chartData = this.prepareChartData(data, sensorType);
        console.log("Prepared chart data:", chartData);

        if (!this.sensorChart || this.currentSensorType !== sensorType) {
            if (this.sensorChart) {
                this.sensorChart.destroy();
            }
            this.currentSensorType = sensorType;

            if (sensorType === "all") {
                this.createCombinedChart(ctx, chartData);
            } else {
                this.createSingleChart(ctx, chartData, sensorType);
            }
        } else {
            this.updateChartData(chartData, sensorType);
        }
    }

    updateChartData(chartData, sensorType) {
        if (!this.sensorChart) return;

        this.sensorChart.data.labels = chartData.labels;

        if (sensorType === "all") {
            this.sensorChart.data.datasets[0].data = chartData.temperature;
            this.sensorChart.data.datasets[1].data = chartData.humidity;
            this.sensorChart.data.datasets[2].data = chartData.light;
        } else {
            this.sensorChart.data.datasets[0].data = chartData.values;
        }

        this.sensorChart.update("active");
    }

    prepareChartData(data, sensorType) {
        if (!data || !Array.isArray(data)) {
            return { labels: [], temperature: [], humidity: [], light: [] };
        }

        const sortedData = [...data].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
        });

        const labels = sortedData.map((item) => {
            const date = new Date(item.timestamp);
            return date.toLocaleString("vi-VN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        });

        if (sensorType === "all") {
            return {
                labels,
                temperature: sortedData.map((item) =>
                    parseFloat(item.temperature?.toFixed(1) || 0)
                ),
                humidity: sortedData.map((item) =>
                    parseFloat(item.humidity?.toFixed(1) || 0)
                ),
                light: sortedData.map((item) =>
                    parseFloat(item.light?.toFixed(1) || 0)
                ),
            };
        } else {
            const values = sortedData.map((item) => {
                const value = item[sensorType];
                return typeof value === "number"
                    ? parseFloat(value.toFixed(1))
                    : 0;
            });
            return { labels, values };
        }
    }

    createSingleChart(ctx, chartData, sensorType) {
        console.log("Creating single chart for:", sensorType, chartData);

        const config = this.getSingleChartConfig(sensorType);

        this.sensorChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: config.label,
                        data: chartData.values,
                        borderColor: config.borderColor,
                        backgroundColor: config.backgroundColor,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                    },
                ],
            },
            options: this.getSingleChartOptions(config.unit, sensorType),
        });

        this.updateChartUnit(config.unit);
        this.updateChartTitle(`Dữ liệu ${config.title} theo thời gian`);

        console.log("Single chart created successfully");
    }

    createCombinedChart(ctx, chartData) {
        console.log("Creating combined chart with data:", chartData);

        this.sensorChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: "Nhiệt độ (°C)",
                        data: chartData.temperature,
                        borderColor: "#FF383C",
                        backgroundColor: "rgba(255, 56, 60, 0.1)",
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        yAxisID: "y",
                    },
                    {
                        label: "Độ ẩm (%)",
                        data: chartData.humidity,
                        borderColor: "#34C759",
                        backgroundColor: "rgba(52, 199, 89, 0.1)",
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        yAxisID: "y1",
                    },
                    {
                        label: "Ánh sáng (%)",
                        data: chartData.light,
                        borderColor: "#FEBC2F",
                        backgroundColor: "rgba(254, 188, 47, 0.1)",
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        yAxisID: "y1",
                    },
                ],
            },
            options: this.getCombinedChartOptions(),
        });

        this.updateChartUnit("°C / %");
        this.updateChartTitle("Tất cả cảm biến theo thời gian");

        console.log("Combined chart created successfully");
    }

    getSingleChartConfig(sensorType) {
        const configs = {
            temperature: {
                label: "Nhiệt độ (°C)",
                title: "nhiệt độ",
                borderColor: "#FF383C",
                backgroundColor: "rgba(255, 56, 60, 0.1)",
                unit: "°C",
            },
            humidity: {
                label: "Độ ẩm (%)",
                title: "độ ẩm",
                borderColor: "#34C759",
                backgroundColor: "rgba(52, 199, 89, 0.1)",
                unit: "%",
            },
            light: {
                label: "Ánh sáng (%)",
                title: "ánh sáng",
                borderColor: "#FEBC2F",
                backgroundColor: "rgba(254, 188, 47, 0.1)",
                unit: "%",
            },
        };
        return configs[sensorType] || configs.temperature;
    }

    getSingleChartOptions(unit, sensorType) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index",
            },
            scales: {
                y: this.getYAxisConfig(sensorType, unit),
                x: {
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)",
                        lineWidth: 1,
                    },
                    ticks: {
                        color: "#666",
                        font: { size: 10 },
                        maxTicksLimit: 8,
                    },
                },
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function (context) {
                            return "Thời gian: " + context[0].label;
                        },
                        label: function (context) {
                            return (
                                context.dataset.label +
                                ": " +
                                context.parsed.y +
                                unit
                            );
                        },
                    },
                },
            },
            animation: {
                duration: 300,
                easing: "easeInOutQuart",
                animateRotate: false,
                animateScale: false,
            },
        };
    }

    getCombinedChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index",
            },
            scales: {
                y: {
                    type: "linear",
                    display: true,
                    position: "left",
                    title: {
                        display: true,
                        text: "Nhiệt độ (°C)",
                        color: "#666",
                        font: {
                            size: 12,
                            weight: "bold",
                        },
                    },
                    grid: {
                        color: "rgba(255, 107, 53, 0.1)",
                        lineWidth: 1,
                    },
                    ticks: {
                        color: "#666",
                        font: { size: 10 },
                        callback: function (value) {
                            return Math.round(value) + "°C";
                        },
                    },
                    min: 0,
                    max: 50,
                },
                y1: {
                    type: "linear",
                    display: true,
                    position: "right",
                    title: {
                        display: true,
                        text: "Độ ẩm & Ánh sáng (%)",
                        color: "#666",
                        font: {
                            size: 12,
                            weight: "bold",
                        },
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: "#666",
                        font: { size: 10 },
                        callback: function (value) {
                            return Math.round(value) + "%";
                        },
                    },
                    min: 0,
                    max: 100,
                },
                x: {
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)",
                        lineWidth: 1,
                    },
                    ticks: {
                        color: "#666",
                        font: { size: 10 },
                        maxTicksLimit: 8,
                    },
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "line",
                        font: {
                            size: 11,
                        },
                    },
                },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: function (context) {
                            return "Thời gian: " + context[0].label;
                        },
                    },
                },
            },
            animation: {
                duration: 300,
                easing: "easeInOutQuart",
                animateRotate: false,
                animateScale: false,
            },
        };
    }

    getYAxisConfig(sensorType, unit) {
        let config = {
            grid: {
                color: "rgba(0, 0, 0, 0.05)",
                lineWidth: 1,
            },
            ticks: {
                color: "#666",
                font: { size: 11 },
                callback: function (value) {
                    return Math.round(value) + unit;
                },
            },
        };

        if (sensorType === "temperature") {
            config.min = 0;
            config.max = 50;
            config.ticks.stepSize = 5;
        } else {
            config.min = 0;
            config.max = 100;
            config.ticks.stepSize = 10;
        }

        return config;
    }

    updateChartUnit(unit) {
        const unitElement = document.getElementById("chartUnit");
        if (unitElement) {
            unitElement.textContent = unit;
        }
    }

    updateChartTitle(title) {
        const titleElement = document.getElementById("chartTitle");
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    showNoDataMessage() {
        const ctx = document.getElementById("sensorChart");
        if (!ctx) return;

        if (this.sensorChart) {
            this.sensorChart.destroy();
            this.sensorChart = null;
        }

        const emptyChartData = {
            labels: [],
            temperature: [],
            humidity: [],
            light: [],
            values: [],
        };

        if (this.currentSensorType === "all") {
            this.createCombinedChart(ctx, emptyChartData);
        } else {
            this.createSingleChart(
                ctx,
                emptyChartData,
                this.currentSensorType || "temperature"
            );
        }
    }

    showError() {
        if (this.sensorChart) {
            this.sensorChart.destroy();
            this.sensorChart = null;
        }
        this.currentSensorType = null;
        console.error("Không thể load dữ liệu biểu đồ");
    }

    destroy() {
        if (this.sensorChart) {
            this.sensorChart.destroy();
            this.sensorChart = null;
        }
        this.currentSensorType = null;
    }
}

export default HomePageChart;
