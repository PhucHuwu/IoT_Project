function updateSensorCardsFromList(dataList) {
  if (!dataList || !dataList.length) return;
  const data = dataList[dataList.length - 1];
  const tempEl = document.querySelector(
    ".sensor-card.temperature .sensor-value"
  );
  const humEl = document.querySelector(".sensor-card.humidity .sensor-value");
  const lightEl = document.querySelector(".sensor-card.light .sensor-value");
  if (tempEl) tempEl.textContent = data.temperature + "°C";
  if (humEl) humEl.textContent = data.humidity + "%";
  if (lightEl) lightEl.textContent = data.light + "%";
}

export { updateSensorCardsFromList };
