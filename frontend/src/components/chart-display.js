const chartInstances = {};

function updateChart(type, data) {
    if (!data || !data.length) return;

    const reversedData = [...data].reverse();

    const labels = reversedData.map((item) =>
        new Date(item.timestamp).toLocaleTimeString()
    );
    const values = reversedData.map((item) => item[type]);
    const ctx = document.getElementById(type + "Chart");

    if (!ctx) return;

    const chartContext = ctx.getContext("2d");

    const chartConfigs = {
        temperature: {
            min: 10,
            max: 40,
            unit: "°C",
            color: "#ff6b35",
            backgroundColor: "rgba(255, 107, 53, 0.1)",
        },
        humidity: {
            min: 0,
            max: 100,
            unit: "%",
            color: "#00acc1",
            backgroundColor: "rgba(0, 172, 193, 0.1)",
        },
        light: {
            min: 0,
            max: 100,
            unit: "%",
            color: "#ffb300",
            backgroundColor: "rgba(255, 179, 0, 0.1)",
        },
    };

    const config = chartConfigs[type];

    if (chartInstances[type]) {
        const chart = chartInstances[type];

        const currentLabels = chart.data.labels;
        const currentValues = chart.data.datasets[0].data;

        const labelsChanged =
            JSON.stringify(currentLabels) !== JSON.stringify(labels);
        const valuesChanged =
            JSON.stringify(currentValues) !== JSON.stringify(values);

        if (labelsChanged || valuesChanged) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = values;
            chart.update("none");
        }
        return;
    }

    chartInstances[type] = new Chart(chartContext, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: type.charAt(0).toUpperCase() + type.slice(1),
                    data: values,
                    borderColor: config.color,
                    backgroundColor: config.backgroundColor,
                    fill: true,
                    tension: 0.2,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: config.color,
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 300,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: "index",
                    intersect: false,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: config.color,
                    borderWidth: 1,
                },
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: "rgba(0,0,0,0.1)",
                        drawTicks: true,
                    },
                    ticks: {
                        padding: 10,
                        stepSize: type === "temperature" ? 3 : 10,
                        callback: function (value) {
                            return value + config.unit;
                        },
                    },
                    min: config.min,
                    max: config.max,
                },
                x: {
                    grid: {
                        color: "rgba(0,0,0,0.1)",
                    },
                    ticks: {
                        padding: 10,
                        maxTicksLimit: 8,
                    },
                },
            },
            elements: {
                point: {
                    radius: 3,
                    hoverRadius: 6,
                },
            },
            interaction: {
                intersect: false,
                mode: "index",
            },
        },
    });
}

export { updateChart };
