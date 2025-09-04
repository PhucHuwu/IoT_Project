function updateChart(type, data) {
  const labels = data.map((item) =>
    new Date(item.timestamp).toLocaleTimeString()
  );
  const values = data.map((item) => item[type]);
  const ctx = document.getElementById(type + "Chart").getContext("2d");

  const chartConfigs = {
    temperature: {
      min: 10,
      max: 40,
      unit: "°C",
    },
    humidity: {
      min: 0,
      max: 100,
      unit: "%",
    },
    light: {
      min: 0,
      max: 100,
      unit: "%",
    },
  };

  const config = chartConfigs[type];

  if (window[type + "ChartObj"]) window[type + "ChartObj"].destroy();
  window[type + "ChartObj"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: type,
          data: values,
          borderColor: "#007bff",
          backgroundColor: "rgba(0,123,255,0.1)",
          fill: true,
          tension: 0.2,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
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
          suggestedMin: config.suggestedMin,
          suggestedMax: config.suggestedMax,
        },
        x: {
          grid: {
            color: "rgba(0,0,0,0.1)",
          },
          ticks: {
            padding: 10,
          },
        },
      },
      elements: {
        point: {
          radius: 3,
          hoverRadius: 6,
        },
      },
    },
  });
}

export { updateChart };
