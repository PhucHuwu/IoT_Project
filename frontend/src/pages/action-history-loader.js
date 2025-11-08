import ActionHistoryTableControl from "../control/action-history-table-control.js";
import LEDStatsPanelControl from "../control/led-stats-panel-control.js";

class ActionHistoryLoader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tableControl = new ActionHistoryTableControl(this.container);
        this.statsControl = new LEDStatsPanelControl();
    }

    async load(limit = 50) {
        await Promise.all([
            this.tableControl.load(limit),
            this.statsControl.load(true),
        ]);

        this.tableControl.startAutoRefresh(30000, limit);
        this.statsControl.startAutoRefresh(30000);

        window.addEventListener("beforeunload", () => {
            this.tableControl.destroy();
            this.statsControl.destroy();
        });
    }
}

export default ActionHistoryLoader;
