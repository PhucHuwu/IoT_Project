from typing import Dict, Any, Tuple
from app.core.config import (
    TEMP_NORMAL_MIN, TEMP_NORMAL_MAX, TEMP_WARNING_MIN, TEMP_WARNING_MAX,
    HUMIDITY_NORMAL_MIN, HUMIDITY_NORMAL_MAX, HUMIDITY_WARNING_MIN, HUMIDITY_WARNING_MAX,
    LIGHT_NORMAL_MIN, LIGHT_NORMAL_MAX, LIGHT_WARNING_MIN, LIGHT_WARNING_MAX
)
from app.core.logger_config import logger


class StatusService:

    @staticmethod
    def get_temperature_status(temperature: float) -> Tuple[str, str]:
        try:
            if TEMP_NORMAL_MIN <= temperature <= TEMP_NORMAL_MAX:
                return "bình thường", "status-normal"
            elif TEMP_WARNING_MIN <= temperature < TEMP_NORMAL_MIN or TEMP_NORMAL_MAX < temperature <= TEMP_WARNING_MAX:
                return "cảnh báo", "status-warning"
            else:
                return "nguy hiểm", "status-danger"
        except Exception as e:
            logger.error(f"Error determining temperature status: {e}")
            return "lỗi", "status-error"

    @staticmethod
    def get_humidity_status(humidity: float) -> Tuple[str, str]:
        try:
            if HUMIDITY_NORMAL_MIN <= humidity <= HUMIDITY_NORMAL_MAX:
                return "bình thường", "status-normal"
            elif HUMIDITY_WARNING_MIN <= humidity < HUMIDITY_NORMAL_MIN or HUMIDITY_NORMAL_MAX < humidity <= HUMIDITY_WARNING_MAX:
                return "cảnh báo", "status-warning"
            else:
                return "nguy hiểm", "status-danger"
        except Exception as e:
            logger.error(f"Error determining humidity status: {e}")
            return "lỗi", "status-error"

    @staticmethod
    def get_light_status(light: float) -> Tuple[str, str]:
        try:
            if LIGHT_NORMAL_MIN <= light <= LIGHT_NORMAL_MAX:
                return "bình thường", "status-normal"
            elif LIGHT_WARNING_MIN <= light < LIGHT_NORMAL_MIN or LIGHT_NORMAL_MAX < light <= LIGHT_WARNING_MAX:
                return "cảnh báo", "status-warning"
            else:
                return "nguy hiểm", "status-danger"
        except Exception as e:
            logger.error(f"Error determining light status: {e}")
            return "lỗi", "status-error"

    @classmethod
    def get_sensor_statuses(cls, temperature: float, humidity: float, light: float) -> Dict[str, Any]:
        temp_status, temp_color = cls.get_temperature_status(temperature)
        hum_status, hum_color = cls.get_humidity_status(humidity)
        light_status, light_color = cls.get_light_status(light)

        return {
            "temperature": {
                "status": temp_status,
                "color_class": temp_color,
                "value": temperature
            },
            "humidity": {
                "status": hum_status,
                "color_class": hum_color,
                "value": humidity
            },
            "light": {
                "status": light_status,
                "color_class": light_color,
                "value": light
            }
        }

    @staticmethod
    def get_overall_status(sensor_statuses: Dict[str, Any]) -> Tuple[str, str]:
        statuses = [sensor_statuses[key]["status"] for key in sensor_statuses.keys()]

        if "nguy hiểm" in statuses:
            return "nguy hiểm", "status-danger"
        elif "cảnh báo" in statuses:
            return "cảnh báo", "status-warning"
        else:
            return "bình thường", "status-normal"
