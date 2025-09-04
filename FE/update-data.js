import { updateSensorCardsFromList } from "./sensor-card.js";
import { updateChart } from "./chart-display.js";

function updateChartsAndCards() {
  const chartTypes = [
    { type: "temperature", dropdownId: "temperatureTimePeriod" },
    { type: "light", dropdownId: "lightTimePeriod" },
    { type: "humidity", dropdownId: "humidityTimePeriod" },
  ];

  chartTypes.forEach(({ type, dropdownId }) => {
    const dropdown = document.getElementById(dropdownId);
    const limit = parseInt(dropdown.value.replace("latest", ""));
    fetch(
      `http://localhost:5001/api/sensor-data-list?type=${type}&limit=${limit}`
    )
      .then((res) => res.json())
      .then((data) => {
        updateChart(type, data);
        if (type === "temperature") updateSensorCardsFromList(data);
      });
  });
}

function setupSyncUpdate() {
  function updateAll() {
    updateChartsAndCards();
  }
  updateAll();
  setInterval(updateAll, 1000);

  ["temperatureTimePeriod", "lightTimePeriod", "humidityTimePeriod"].forEach(
    (id) => {
      const dropdown = document.getElementById(id);
      dropdown.addEventListener("change", updateAll);
    }
  );
}

window.addEventListener("DOMContentLoaded", setupSyncUpdate);
