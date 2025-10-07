import ActionHistoryTableControl from "../control/action-history-table-control.js";

class ActionHistoryLoader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tableControl = new ActionHistoryTableControl(this.container);
    }

    async load(limit = 50) {
        await this.tableControl.load(limit);
        this.tableControl.startAutoRefresh(30000, limit);
        window.addEventListener("beforeunload", () =>
            this.tableControl.destroy()
        );
    }
}

export default ActionHistoryLoader;
