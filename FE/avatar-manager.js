class AvatarManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadSavedAvatar();
        this.setupEventListeners();
    }

    loadSavedAvatar() {
        const avatarType = localStorage.getItem("userAvatarType");
        const avatarData = localStorage.getItem("userAvatarData");

        if (avatarType && avatarData) {
            this.updateAllAvatars(avatarType, avatarData);
        }
    }

    updateAllAvatars(type, data) {
        const avatarElements = document.querySelectorAll(
            ".avatar, #profileAvatar, #currentAvatarPreview"
        );

        avatarElements.forEach((element) => {
            if (type === "image") {
                element.style.backgroundImage = `url(${data})`;
                element.style.backgroundSize = "cover";
                element.style.backgroundPosition = "center";
                element.innerHTML = "";

                if (element.classList.contains("avatar")) {
                    element.style.fontSize = "";
                }
                else if (element.id === "profileAvatar") {
                    element.style.fontSize = "48px";
                }
            } else if (type === "preset") {
                element.style.backgroundImage = "none";
                element.innerHTML = data;

                if (element.classList.contains("avatar")) {
                    element.style.fontSize = "16px";
                } else if (element.id === "profileAvatar") {
                    element.style.fontSize = "48px";
                } else if (element.id === "currentAvatarPreview") {
                    element.style.fontSize = "40px";
                }
            }
        });
    }

    saveAvatar(type, data) {
        localStorage.setItem("userAvatarType", type);
        localStorage.setItem("userAvatarData", data);
        this.updateAllAvatars(type, data);
    }

    getCurrentAvatar() {
        return {
            type: localStorage.getItem("userAvatarType") || "preset",
            data: localStorage.getItem("userAvatarData") || "G",
        };
    }

    resetAvatar() {
        localStorage.removeItem("userAvatarType");
        localStorage.removeItem("userAvatarData");
        this.updateAllAvatars("preset", "G");
    }

    setupEventListeners() {
        window.addEventListener("storage", (e) => {
            if (e.key === "userAvatarType" || e.key === "userAvatarData") {
                this.loadSavedAvatar();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    window.avatarManager = new AvatarManager();
});

if (typeof module !== "undefined" && module.exports) {
    module.exports = AvatarManager;
}
