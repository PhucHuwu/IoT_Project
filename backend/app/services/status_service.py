from typing import Dict, Any, Tuple
from app.core.config import (
    TEMP_NORMAL_MIN, TEMP_NORMAL_MAX, TEMP_WARNING_MIN, TEMP_WARNING_MAX,
    HUMIDITY_NORMAL_MIN, HUMIDITY_NORMAL_MAX, HUMIDITY_WARNING_MIN, HUMIDITY_WARNING_MAX,
    LIGHT_NORMAL_MIN, LIGHT_NORMAL_MAX, LIGHT_WARNING_MIN, LIGHT_WARNING_MAX
)
from app.core.logger_config import logger


class StatusService:

    @staticmethod
    def _get_thresholds():
        try:
            from app.services.threshold_service import ThresholdService
            return ThresholdService.get_thresholds()
        except Exception as e:
            logger.error(f"Error loading dynamic thresholds: {e}, using defaults")
            return {
                'temperature': {
                    'normal_min': TEMP_NORMAL_MIN,
                    'normal_max': TEMP_NORMAL_MAX,
                    'warning_min': TEMP_WARNING_MIN,
                    'warning_max': TEMP_WARNING_MAX
                },
                'humidity': {
                    'normal_min': HUMIDITY_NORMAL_MIN,
                    'normal_max': HUMIDITY_NORMAL_MAX,
                    'warning_min': HUMIDITY_WARNING_MIN,
                    'warning_max': HUMIDITY_WARNING_MAX
                },
                'light': {
                    'normal_min': LIGHT_NORMAL_MIN,
                    'normal_max': LIGHT_NORMAL_MAX,
                    'warning_min': LIGHT_WARNING_MIN,
                    'warning_max': LIGHT_WARNING_MAX
                }
            }

    @staticmethod
    def get_temperature_status(temperature: float) -> Tuple[str, str]:
        try:
            thresholds = StatusService._get_thresholds()
            temp_thresholds = thresholds.get('temperature', {})

            normal_min = temp_thresholds.get('normal_min', TEMP_NORMAL_MIN)
            normal_max = temp_thresholds.get('normal_max', TEMP_NORMAL_MAX)
            warning_min = temp_thresholds.get('warning_min', TEMP_WARNING_MIN)
            warning_max = temp_thresholds.get('warning_max', TEMP_WARNING_MAX)

            if normal_min <= temperature <= normal_max:
                return "bình thường", "status-normal"
            elif warning_min <= temperature < normal_min or normal_max < temperature <= warning_max:
                return "cảnh báo", "status-warning"
            else:
                return "nguy hiểm", "status-danger"
        except Exception as e:
            logger.error(f"Error determining temperature status: {e}")
            return "lỗi", "status-error"

    @staticmethod
    def get_humidity_status(humidity: float) -> Tuple[str, str]:
        try:
            thresholds = StatusService._get_thresholds()
            hum_thresholds = thresholds.get('humidity', {})

            normal_min = hum_thresholds.get('normal_min', HUMIDITY_NORMAL_MIN)
            normal_max = hum_thresholds.get('normal_max', HUMIDITY_NORMAL_MAX)
            warning_min = hum_thresholds.get('warning_min', HUMIDITY_WARNING_MIN)
            warning_max = hum_thresholds.get('warning_max', HUMIDITY_WARNING_MAX)

            if normal_min <= humidity <= normal_max:
                return "bình thường", "status-normal"
            elif warning_min <= humidity < normal_min or normal_max < humidity <= warning_max:
                return "cảnh báo", "status-warning"
            else:
                return "nguy hiểm", "status-danger"
        except Exception as e:
            logger.error(f"Error determining humidity status: {e}")
            return "lỗi", "status-error"

    @staticmethod
    def get_light_status(light: float) -> Tuple[str, str]:
        try:
            thresholds = StatusService._get_thresholds()
            light_thresholds = thresholds.get('light', {})

            normal_min = light_thresholds.get('normal_min', LIGHT_NORMAL_MIN)
            normal_max = light_thresholds.get('normal_max', LIGHT_NORMAL_MAX)
            warning_min = light_thresholds.get('warning_min', LIGHT_WARNING_MIN)
            warning_max = light_thresholds.get('warning_max', LIGHT_WARNING_MAX)

            if normal_min <= light <= normal_max:
                return "bình thường", "status-normal"
            elif warning_min <= light < normal_min or normal_max < light <= warning_max:
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
