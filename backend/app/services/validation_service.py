from typing import Dict, Any, List
from app.core.logger_config import logger


class DataValidator:

    REQUIRED_FIELDS = ['temperature', 'humidity', 'light']

    @classmethod
    def validate_sensor_data(cls, data: Dict[str, Any]) -> bool:
        try:
            if not all(field in data for field in cls.REQUIRED_FIELDS):
                missing_fields = [field for field in cls.REQUIRED_FIELDS if field not in data]
                logger.warning(f"Missing required fields: {missing_fields}")
                return False

            if not cls._validate_temperature(data['temperature']):
                return False

            if not cls._validate_humidity(data['humidity']):
                return False

            if not cls._validate_light(data['light']):
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating data: {e}")
            return False

    @classmethod
    def _validate_temperature(cls, temperature: Any) -> bool:
        try:
            temp = float(temperature)
            if -50 <= temp <= 100:
                return True
            else:
                logger.warning(f"Temperature out of range: {temp}°C")
                return False
        except (ValueError, TypeError):
            logger.warning(f"Invalid temperature value: {temperature}")
            return False

    @classmethod
    def _validate_humidity(cls, humidity: Any) -> bool:
        try:
            hum = float(humidity)
            if 0 <= hum <= 100:
                return True
            else:
                logger.warning(f"Humidity out of range: {hum}%")
                return False
        except (ValueError, TypeError):
            logger.warning(f"Invalid humidity value: {humidity}")
            return False

    @classmethod
    def _validate_light(cls, light: Any) -> bool:
        try:
            light_val = float(light)
            if 0 <= light_val <= 100:
                return True
            else:
                logger.warning(f"Light value out of range: {light_val}%")
                return False
        except (ValueError, TypeError):
            logger.warning(f"Invalid light value: {light}")
            return False
