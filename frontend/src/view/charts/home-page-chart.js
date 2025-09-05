class HomePageChart {
    constructor() {
        this.temperatureChart = null;
        this.lightChart = null;
        this.humidityChart = null;
    }

    // Method để force recreate chart khi thay đổi TimePeriod
    forceRecreateTemperatureChart(data) {
        if (this.temperatureChart) {
            this.temperatureChart.destroy();
            this.temperatureChart = null;
        }
        this.updateTemperatureChart(data);
    }

    forceRecreateLightChart(data) {
        if (this.lightChart) {
            this.lightChart.destroy();
            this.lightChart = null;
        }
        this.updateLightChart(data);
    }

    forceRecreateHumidityChart(data) {
        if (this.humidityChart) {
            this.humidityChart.destroy();
            this.humidityChart = null;
        }
        this.updateHumidityChart(data);
    }

    updateTemperatureChart(data) {
        const ctx = document.getElementById("temperatureChart");
        if (!ctx) return;

        // Chuẩn bị dữ liệu cho chart
        const chartData = this.prepareChartData(data, "temperature");

        // Nếu chart chưa tồn tại, tạo mới
        if (!this.temperatureChart) {
            this.temperatureChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: "Nhiệt độ (°C)",
                            data: chartData.values,
                            borderColor: "#FF383C",
                            backgroundColor: "rgba(255, 56, 60, 0.1)",
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 0,
                        },
                    ],
                },
                options: this.getChartOptions(
                    "°C",
                    "temperature",
                    chartData.values
                ),
            });
        } else {
            // Cập nhật dữ liệu thay vì tạo lại chart
            this.temperatureChart.data.labels = chartData.labels;
            this.temperatureChart.data.datasets[0].data = chartData.values;
            this.temperatureChart.update("none"); // Update không animation để tránh chớp giật
        }
    }

    updateLightChart(data) {
        const ctx = document.getElementById("lightChart");
        if (!ctx) return;

        const chartData = this.prepareChartData(data, "light");

        // Nếu chart chưa tồn tại, tạo mới
        if (!this.lightChart) {
            this.lightChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: "Ánh sáng (%)",
                            data: chartData.values,
                            borderColor: "#FEBC2F",
                            backgroundColor: "rgba(254, 188, 47, 0.1)",
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 0,
                        },
                    ],
                },
                options: this.getChartOptions("%", "light", chartData.values),
            });
        } else {
            // Cập nhật dữ liệu thay vì tạo lại chart
            this.lightChart.data.labels = chartData.labels;
            this.lightChart.data.datasets[0].data = chartData.values;
            this.lightChart.update("none");
        }
    }

    updateHumidityChart(data) {
        const ctx = document.getElementById("humidityChart");
        if (!ctx) return;

        const chartData = this.prepareChartData(data, "humidity");

        // Nếu chart chưa tồn tại, tạo mới
        if (!this.humidityChart) {
            this.humidityChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: "Độ ẩm (%)",
                            data: chartData.values,
                            borderColor: "#34C759",
                            backgroundColor: "rgba(52, 199, 89, 0.1)",
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 0,
                        },
                    ],
                },
                options: this.getChartOptions(
                    "%",
                    "humidity",
                    chartData.values
                ),
            });
        } else {
            // Cập nhật dữ liệu thay vì tạo lại chart
            this.humidityChart.data.labels = chartData.labels;
            this.humidityChart.data.datasets[0].data = chartData.values;
            this.humidityChart.update("none");
        }
    }

    prepareChartData(data, sensorType) {
        if (!data || !Array.isArray(data)) {
            return { labels: [], values: [] };
        }

        // Sắp xếp dữ liệu theo thời gian tăng dần
        const sortedData = data.sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        const labels = sortedData.map((item) => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            });
        });

        const values = sortedData.map((item) => {
            const value = item[sensorType];
            return typeof value === "number" ? parseFloat(value.toFixed(1)) : 0;
        });

        return { labels, values };
    }

    getYAxisConfig(sensorType, unit, dataValues = []) {
        let config = {
            grid: {
                color: "rgba(0, 0, 0, 0.05)",
                lineWidth: 1,
            },
            ticks: {
                color: "#666",
                font: {
                    size: 11,
                },
                callback: function (value) {
                    return Math.round(value) + unit;
                },
            },
        };

        if (sensorType === "temperature") {
            // Nhiệt độ: Hiển thị từ 0°C đến 50°C với 11 giá trị (0, 5, 10, 15, ..., 50)
            config.min = 0;
            config.max = 50;
            config.ticks.stepSize = 5;
            config.beginAtZero = true;
        } else if (sensorType === "light" || sensorType === "humidity") {
            // Ánh sáng và độ ẩm: 0-100% với 11 giá trị (0, 10, 20, ..., 100)
            config.min = 0;
            config.max = 100;
            config.ticks.stepSize = 10;
            config.beginAtZero = true;
        }

        return config;
    }

    getChartOptions(unit, sensorType, dataValues = []) {
        const yAxisConfig = this.getYAxisConfig(sensorType, unit, dataValues);

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index",
            },
            scales: {
                y: yAxisConfig,
                x: {
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)",
                        lineWidth: 1,
                    },
                    ticks: {
                        color: "#666",
                        font: {
                            size: 10,
                        },
                        maxTicksLimit: 6,
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
                duration: 500,
                easing: "easeInOutQuart",
            },
            elements: {
                point: {
                    radius: 0,
                    hoverRadius: 0,
                },
            },
        };
    }

    showTemperatureError() {
        const ctx = document.getElementById("temperatureChart");
        if (ctx && this.temperatureChart) {
            this.temperatureChart.destroy();
        }
        console.error("Không thể load dữ liệu biểu đồ nhiệt độ");
    }

    showLightError() {
        const ctx = document.getElementById("lightChart");
        if (ctx && this.lightChart) {
            this.lightChart.destroy();
        }
        console.error("Không thể load dữ liệu biểu đồ ánh sáng");
    }

    showHumidityError() {
        const ctx = document.getElementById("humidityChart");
        if (ctx && this.humidityChart) {
            this.humidityChart.destroy();
        }
        console.error("Không thể load dữ liệu biểu đồ độ ẩm");
    }

    destroyCharts() {
        if (this.temperatureChart) {
            this.temperatureChart.destroy();
            this.temperatureChart = null;
        }
        if (this.lightChart) {
            this.lightChart.destroy();
            this.lightChart = null;
        }
        if (this.humidityChart) {
            this.humidityChart.destroy();
            this.humidityChart = null;
        }
    }
}

export default HomePageChart;
