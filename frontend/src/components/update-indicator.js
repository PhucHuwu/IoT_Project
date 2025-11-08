class UpdateIndicator {
    constructor() {
        this.indicator = null;
        this.createIndicator();
    }

    createIndicator() {
        this.indicator = document.createElement("div");
        this.indicator.className = "data-update-indicator";
        this.indicator.innerHTML = `
      <div class="update-spinner"></div>
      <span>Đang cập nhật dữ liệu...</span>
    `;
        document.body.appendChild(this.indicator);
    }

    show() {
        if (this.indicator) {
            this.indicator.classList.add("show");
            setTimeout(() => this.hide(), 2000);
        }
    }

    hide() {
        if (this.indicator) {
            this.indicator.classList.remove("show");
        }
    }

    destroy() {
        if (this.indicator && this.indicator.parentNode) {
            this.indicator.parentNode.removeChild(this.indicator);
        }
    }
}

export default UpdateIndicator;
