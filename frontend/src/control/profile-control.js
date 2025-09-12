// Avatar update functionality
let selectedAvatarType = null;
let selectedAvatarData = null;

function openAvatarModal() {
    document.getElementById("avatarModal").style.display = "flex";
    document.body.style.overflow = "hidden";

    // Reset modal state
    document.getElementById("newAvatarSection").style.display = "none";
    document.getElementById("updateBtn").disabled = true;
    selectedAvatarType = null;
    selectedAvatarData = null;
}

function closeAvatarModal() {
    document.getElementById("avatarModal").style.display = "none";
    document.body.style.overflow = "auto";
}

function triggerFileInput() {
    document.getElementById("avatarInput").click();
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert("Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 5MB.");
            return;
        }

        // Check file type
        if (!file.type.match("image.*")) {
            alert("Vui lòng chọn file ảnh hợp lệ.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const newAvatarPreview =
                document.getElementById("newAvatarPreview");
            newAvatarPreview.style.backgroundImage = `url(${e.target.result})`;
            newAvatarPreview.style.backgroundSize = "cover";
            newAvatarPreview.style.backgroundPosition = "center";
            newAvatarPreview.innerHTML = "";

            document.getElementById("newAvatarSection").style.display = "block";
            document.getElementById("updateBtn").disabled = false;

            selectedAvatarType = "image";
            selectedAvatarData = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function selectPresetAvatar(avatar) {
    // Remove active class from all preset avatars
    document.querySelectorAll(".preset-avatar").forEach((el) => {
        el.classList.remove("active");
    });

    // Add active class to selected avatar
    event.target.classList.add("active");

    const newAvatarPreview = document.getElementById("newAvatarPreview");
    newAvatarPreview.style.backgroundImage = "none";
    newAvatarPreview.innerHTML = avatar;
    newAvatarPreview.style.fontSize = "48px";

    document.getElementById("newAvatarSection").style.display = "block";
    document.getElementById("updateBtn").disabled = false;

    selectedAvatarType = "preset";
    selectedAvatarData = avatar;
}

function updateAvatar() {
    if (!selectedAvatarType || !selectedAvatarData) {
        alert("Vui lòng chọn ảnh đại diện mới.");
        return;
    }

    // Sử dụng AvatarManager để cập nhật avatar
    if (window.avatarManager) {
        window.avatarManager.saveAvatar(selectedAvatarType, selectedAvatarData);
    } else {
        // Fallback nếu AvatarManager chưa load
        if (selectedAvatarType === "image") {
            localStorage.setItem("userAvatarType", "image");
            localStorage.setItem("userAvatarData", selectedAvatarData);
        } else if (selectedAvatarType === "preset") {
            localStorage.setItem("userAvatarType", "preset");
            localStorage.setItem("userAvatarData", selectedAvatarData);
        }

        // Manual update cho trang hiện tại
        const profileAvatar = document.getElementById("profileAvatar");
        const headerAvatar = document.querySelector(".header-right .avatar");

        if (selectedAvatarType === "image") {
            profileAvatar.style.backgroundImage = `url(${selectedAvatarData})`;
            profileAvatar.style.backgroundSize = "cover";
            profileAvatar.style.backgroundPosition = "center";
            profileAvatar.innerHTML = "";

            headerAvatar.style.backgroundImage = `url(${selectedAvatarData})`;
            headerAvatar.style.backgroundSize = "cover";
            headerAvatar.style.backgroundPosition = "center";
            headerAvatar.innerHTML = "";
        } else if (selectedAvatarType === "preset") {
            profileAvatar.style.backgroundImage = "none";
            profileAvatar.innerHTML = selectedAvatarData;
            profileAvatar.style.fontSize = "48px";

            headerAvatar.style.backgroundImage = "none";
            headerAvatar.innerHTML = selectedAvatarData;
            headerAvatar.style.fontSize = "16px";
        }
    }

    // Show success message
    showNotification("Cập nhật ảnh đại diện thành công!", "success");

    // Close modal
    closeAvatarModal();
}

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${
            type === "success" ? "check-circle" : "info-circle"
        }"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add("show");
    }, 100);

    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Load saved avatar on page load
function loadSavedAvatar() {
    // AvatarManager sẽ tự động load avatar, không cần function này nữa
    // Tuy nhiên giữ lại để backward compatibility
    if (window.avatarManager) {
        window.avatarManager.loadSavedAvatar();
    } else {
        // Fallback code
        const avatarType = localStorage.getItem("userAvatarType");
        const avatarData = localStorage.getItem("userAvatarData");

        if (avatarType && avatarData) {
            const profileAvatar = document.getElementById("profileAvatar");
            const headerAvatar = document.querySelector(
                ".header-right .avatar"
            );

            if (avatarType === "image") {
                profileAvatar.style.backgroundImage = `url(${avatarData})`;
                profileAvatar.style.backgroundSize = "cover";
                profileAvatar.style.backgroundPosition = "center";
                profileAvatar.innerHTML = "";

                headerAvatar.style.backgroundImage = `url(${avatarData})`;
                headerAvatar.style.backgroundSize = "cover";
                headerAvatar.style.backgroundPosition = "center";
                headerAvatar.innerHTML = "";
            } else if (avatarType === "preset") {
                profileAvatar.style.backgroundImage = "none";
                profileAvatar.innerHTML = avatarData;

                headerAvatar.style.backgroundImage = "none";
                headerAvatar.innerHTML = avatarData;
            }
        }
    }
}

// Initialize avatar on page load
document.addEventListener("DOMContentLoaded", function () {
    loadSavedAvatar();
});

// Close modal when clicking outside
document.getElementById("avatarModal").addEventListener("click", function (e) {
    if (e.target === this) {
        closeAvatarModal();
    }
});

// Drag & drop support removed: keep click-to-upload (file input) only

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
                } else if (element.id === "profileAvatar") {
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
