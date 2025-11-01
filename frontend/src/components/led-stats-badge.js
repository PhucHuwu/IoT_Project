class LEDStatsBadge {
    constructor() {
        this.ledStats = {
            LED1: 0,
            LED2: 0,
            LED3: 0,
            LED4: 0,
        };
    }

    updateBadge(ledId, count) {
        const badge = document.getElementById(`stats-badge-${ledId}`);
        if (badge) {
            const countElement = badge.querySelector(".stats-count");
            if (countElement) {
                const currentCount = parseInt(countElement.textContent) || 0;
                if (currentCount !== count) {
                    countElement.textContent = count;
                    badge.classList.add("updated");
                    setTimeout(() => {
                        badge.classList.remove("updated");
                    }, 500);
                }
            }
        }
    }

    updateStats(ledNumber, count) {
        const ledId = `LED${ledNumber}`;
        this.updateBadge(ledId, count);
        this.ledStats[ledId] = count;
    }

    updateAllBadges(statsData) {
        if (!statsData) return;

        Object.entries(statsData).forEach(([ledId, count]) => {
            const ledNumber = ledId.replace("LED", "");
            this.updateStats(ledNumber, count);
        });
    }

    getStats() {
        return { ...this.ledStats };
    }
}

export default LEDStatsBadge;

