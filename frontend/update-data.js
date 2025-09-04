import { updateSensorCardsFromList } from "./src/components/sensor-card.js";
import { updateChart } from "./src/components/chart-display.js";
import { apiService } from "./src/services/api.js";

let lastUpdateTime = 0;
let isUpdating = false;

function updateChartsAndCards() {
    if (isUpdating) return;
    isUpdating = true;

    const chartTypes = [
        { type: "temperature", dropdownId: "temperatureTimePeriod" },
        { type: "light", dropdownId: "lightTimePeriod" },
        { type: "humidity", dropdownId: "humidityTimePeriod" },
    ];

    const promises = chartTypes.map(({ type, dropdownId }) => {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return Promise.resolve();

        const limit = parseInt(dropdown.value.replace("latest", ""));
        return apiService
            .getSensorDataList(type, limit)
            .then((data) => {
                updateChart(type, data);
                if (type === "temperature") {
                    updateSensorCardsFromList(data);
                }
                return { type, data };
            })
            .catch((error) => {
                console.error(`Error fetching ${type} data:`, error);
            });
    });

    Promise.all(promises)
        .then(() => {
            lastUpdateTime = Date.now();
        })
        .catch((error) => {})
        .finally(() => {
            isUpdating = false;
        });
}

function setupSyncUpdate() {
    let updateInterval;

    function updateAll() {
        updateChartsAndCards();
    }

    updateAll();

    updateInterval = setInterval(updateAll, 3000);

    ["temperatureTimePeriod", "lightTimePeriod", "humidityTimePeriod"].forEach(
        (id) => {
            const dropdown = document.getElementById(id);
            if (dropdown) {
                dropdown.addEventListener("change", () => {
                    clearInterval(updateInterval);
                    updateAll();
                    updateInterval = setInterval(updateAll, 3000);
                });
            }
        }
    );

    window.addEventListener("beforeunload", () => {
        clearInterval(updateInterval);
    });
}

window.addEventListener("DOMContentLoaded", setupSyncUpdate);
