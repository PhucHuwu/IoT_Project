from typing import Dict, Any, Tuple
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
                'temperature': {'warning': 35.0, 'danger': 40.0},
                'humidity': {'warning': 70.0, 'danger': 85.0},
                'light': {'warning': 60.0, 'danger': 80.0}
            }

    @staticmethod
    def get_temperature_status(temperature: float) -> Tuple[str, str]:
        try:
            thresholds = StatusService._get_thresholds()
            temp_thresholds = thresholds.get('temperature', {})

            warning_threshold = temp_thresholds.get('warning', 35.0)
            danger_threshold = temp_thresholds.get('danger', 40.0)

            if temperature >= danger_threshold:
                return "nguy hiểm", "status-danger"
            elif temperature >= warning_threshold:
                return "cảnh báo", "status-warning"
            else:
                return "bình thường", "status-normal"
        except Exception as e:
            logger.error(f"Error determining temperature status: {e}")
            return "lỗi", "status-error"

    @staticmethod
    def get_humidity_status(humidity: float) -> Tuple[str, str]:
        try:
            thresholds = StatusService._get_thresholds()
            hum_thresholds = thresholds.get('humidity', {})

            warning_threshold = hum_thresholds.get('warning', 70.0)
            danger_threshold = hum_thresholds.get('danger', 85.0)

            if humidity >= danger_threshold:
                return "nguy hiểm", "status-danger"
            elif humidity >= warning_threshold:
                return "cảnh báo", "status-warning"
            else:
                return "bình thường", "status-normal"
        except Exception as e:
            logger.error(f"Error determining humidity status: {e}")
            return "lỗi", "status-error"

    @staticmethod
    def get_light_status(light: float) -> Tuple[str, str]:
        try:
            thresholds = StatusService._get_thresholds()
            light_thresholds = thresholds.get('light', {})

            warning_threshold = light_thresholds.get('warning', 60.0)
            danger_threshold = light_thresholds.get('danger', 80.0)

            if light >= danger_threshold:
                return "nguy hiểm", "status-danger"
            elif light >= warning_threshold:
                return "cảnh báo", "status-warning"
            else:
                return "bình thường", "status-normal"
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
