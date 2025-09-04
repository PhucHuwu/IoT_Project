function updateSensorCardsFromList(dataList) {
    if (!dataList || !dataList.length) {
        return;
    }

    const data = dataList[0];
    const tempEl = document.querySelector(
        ".sensor-card.temperature .sensor-value"
    );
    const humEl = document.querySelector(".sensor-card.humidity .sensor-value");
    const lightEl = document.querySelector(".sensor-card.light .sensor-value");

    if (data.temperature !== undefined && tempEl) {
        tempEl.textContent = data.temperature + "°C";
    }
    if (data.humidity !== undefined && humEl) {
        humEl.textContent = data.humidity + "%";
    }
    if (data.light !== undefined && lightEl) {
        lightEl.textContent = data.light + "%";
    }
}

export { updateSensorCardsFromList };
