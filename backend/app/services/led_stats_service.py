import time
from typing import Dict
from app.core.database import DatabaseManager
from app.core.logger_config import logger


class LEDStatsService:
    _instance = None
    _cache = {
        'data': None,
        'timestamp': 0,
        'ttl': 3
    }

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.db_manager = DatabaseManager()
        self._initialized = True

    def get_led_stats(self, use_cache: bool = True, date: str = None) -> Dict[str, int]:
        try:
            current_time = time.time()

            cache_key = date if date else 'today'

            if use_cache and self._cache['data'] is not None and not date:
                cache_age = current_time - self._cache['timestamp']
                if cache_age < self._cache['ttl']:
                    logger.info(f"Returning cached LED stats (age: {cache_age:.2f}s)")
                    return self._cache['data']

            stats = self.db_manager.get_led_toggle_stats(date=date)

            if not date:
                self._cache['data'] = stats
                self._cache['timestamp'] = current_time

            logger.info(f"LED stats refreshed from database (date={date}): {stats}")
            return stats

        except Exception as e:
            logger.error(f"Error in LED stats service: {e}")
            return {'LED1': 0, 'LED2': 0, 'LED3': 0, 'LED4': 0}

    def clear_cache(self):
        self._cache['data'] = None
        self._cache['timestamp'] = 0
        logger.info("LED stats cache cleared")
