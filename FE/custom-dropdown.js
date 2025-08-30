class CustomDropdown {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            placeholder: "Chọn một tùy chọn...",
            searchable: false,
            maxHeight: "200px",
            ...options,
        };

        this.isOpen = false;
        this.selectedOption = null;
        this.selectedIndex = -1;

        this.init();
    }

    init() {
        this.createDropdown();
        this.bindEvents();
        this.setInitialValue();
    }

    createDropdown() {
        this.element.style.display = "none";

        this.container = document.createElement("div");
        this.container.className = "custom-dropdown";

        this.trigger = document.createElement("div");
        this.trigger.className = "dropdown-trigger";
        this.trigger.innerHTML = `
            <span class="dropdown-text">${this.options.placeholder}</span>
            <div class="dropdown-arrow">
                <svg viewBox="0 0 24 24">
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            </div>
        `;

        this.menu = document.createElement("div");
        this.menu.className = "dropdown-menu";

        this.populateOptions();

        this.container.appendChild(this.trigger);
        this.container.appendChild(this.menu);

        this.element.parentNode.insertBefore(
            this.container,
            this.element.nextSibling
        );
    }

    populateOptions() {
        const options = this.element.querySelectorAll("option");
        this.menu.innerHTML = "";

        options.forEach((option, index) => {
            if (option.value === "" && option.textContent.trim() === "") return;

            const dropdownOption = document.createElement("div");
            dropdownOption.className = "dropdown-option";
            dropdownOption.textContent = option.textContent;
            dropdownOption.setAttribute("data-value", option.value);
            dropdownOption.setAttribute("data-index", index);

            if (option.selected) {
                dropdownOption.classList.add("selected");
                this.selectedOption = dropdownOption;
                this.selectedIndex = index;
                this.trigger.querySelector(".dropdown-text").textContent =
                    option.textContent;
            }

            this.menu.appendChild(dropdownOption);
        });
    }

    bindEvents() {
        this.trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this.menu.addEventListener("click", (e) => {
            if (e.target.classList.contains("dropdown-option")) {
                this.selectOption(e.target);
            }
        });

        document.addEventListener("click", (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });

        this.container.addEventListener("keydown", (e) => {
            this.handleKeydown(e);
        });

        this.trigger.setAttribute("tabindex", "0");
    }

    handleKeydown(e) {
        const options = Array.from(
            this.menu.querySelectorAll(".dropdown-option")
        );

        switch (e.key) {
            case "Enter":
            case " ":
                e.preventDefault();
                if (this.isOpen) {
                    if (this.selectedIndex >= 0) {
                        this.selectOption(options[this.selectedIndex]);
                    }
                } else {
                    this.open();
                }
                break;

            case "Escape":
                this.close();
                break;

            case "ArrowDown":
                e.preventDefault();
                if (!this.isOpen) {
                    this.open();
                } else {
                    this.navigateOptions(1);
                }
                break;

            case "ArrowUp":
                e.preventDefault();
                if (this.isOpen) {
                    this.navigateOptions(-1);
                }
                break;
        }
    }

    navigateOptions(direction) {
        const options = Array.from(
            this.menu.querySelectorAll(".dropdown-option")
        );
        const currentIndex = this.selectedIndex;

        options.forEach((opt) => opt.classList.remove("highlighted"));

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = options.length - 1;
        if (newIndex >= options.length) newIndex = 0;

        options[newIndex].classList.add("highlighted");
        this.selectedIndex = newIndex;

        options[newIndex].scrollIntoView({ block: "nearest" });
    }

    selectOption(optionElement) {
        if (this.selectedOption) {
            this.selectedOption.classList.remove("selected");
        }

        optionElement.classList.add("selected");
        this.selectedOption = optionElement;
        this.selectedIndex = parseInt(optionElement.getAttribute("data-index"));

        this.trigger.querySelector(".dropdown-text").textContent =
            optionElement.textContent;

        const value = optionElement.getAttribute("data-value");
        this.element.value = value;

        this.element.dispatchEvent(new Event("change", { bubbles: true }));

        this.close();

        this.container.dispatchEvent(
            new CustomEvent("dropdown:change", {
                detail: {
                    value: value,
                    text: optionElement.textContent,
                    index: this.selectedIndex,
                },
            })
        );
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.trigger.classList.add("active");
        this.menu.classList.add("active");

        const selectedOption = this.menu.querySelector(
            ".dropdown-option.selected"
        );
        if (selectedOption) {
            this.selectedIndex = parseInt(
                selectedOption.getAttribute("data-index")
            );
        }

        this.container.dispatchEvent(new CustomEvent("dropdown:open"));
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.trigger.classList.remove("active");
        this.menu.classList.remove("active");

        this.menu.querySelectorAll(".dropdown-option").forEach((opt) => {
            opt.classList.remove("highlighted");
        });

        this.container.dispatchEvent(new CustomEvent("dropdown:close"));
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    setInitialValue() {
        const selectedOption =
            this.element.querySelector("option[selected]") ||
            this.element.querySelector("option:first-child");

        if (selectedOption && selectedOption.textContent.trim()) {
            this.trigger.querySelector(".dropdown-text").textContent =
                selectedOption.textContent;
            const dropdownOption = this.menu.querySelector(
                `[data-value="${selectedOption.value}"]`
            );
            if (dropdownOption) {
                dropdownOption.classList.add("selected");
                this.selectedOption = dropdownOption;
                this.selectedIndex = parseInt(
                    dropdownOption.getAttribute("data-index")
                );
            }
        }
    }

    setValue(value) {
        const option = this.menu.querySelector(`[data-value="${value}"]`);
        if (option) {
            this.selectOption(option);
        }
    }

    getValue() {
        return this.element.value;
    }

    destroy() {
        this.container.remove();
        this.element.style.display = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const chartSelects = document.querySelectorAll(
        ".chart-header select, .summary-header select"
    );

    chartSelects.forEach((select) => {
        new CustomDropdown(select, {
            placeholder:
                select.querySelector("option:first-child")?.textContent ||
                "Chọn...",
        });
    });

    document.documentElement.style.scrollBehavior = "smooth";
});

window.CustomDropdown = CustomDropdown;
