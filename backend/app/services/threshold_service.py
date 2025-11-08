from typing import Dict, Any
from app.core.logger_config import logger
import json
import os


class ThresholdService:

    CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'threshold_config.json')

    DEFAULT_THRESHOLDS = {
        'temperature': {
            'normal_min': 25.0,
            'normal_max': 35.0,
            'warning_min': 15.0,
            'warning_max': 40.0
        },
        'humidity': {
            'normal_min': 40.0,
            'normal_max': 60.0,
            'warning_min': 30.0,
            'warning_max': 70.0
        },
        'light': {
            'normal_min': 40.0,
            'normal_max': 60.0,
            'warning_min': 20.0,
            'warning_max': 80.0
        }
    }

    @classmethod
    def load_thresholds(cls) -> Dict[str, Any]:
        try:
            if os.path.exists(cls.CONFIG_FILE):
                with open(cls.CONFIG_FILE, 'r', encoding='utf-8') as f:
                    thresholds = json.load(f)
                    logger.info("Loaded thresholds from config file")
                    return thresholds
            else:
                logger.info("Config file not found, using default thresholds")
                cls.save_thresholds(cls.DEFAULT_THRESHOLDS)
                return cls.DEFAULT_THRESHOLDS
        except Exception as e:
            logger.error(f"Error loading thresholds: {e}")
            return cls.DEFAULT_THRESHOLDS

    @classmethod
    def save_thresholds(cls, thresholds: Dict[str, Any]) -> bool:
        try:
            with open(cls.CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(thresholds, f, indent=4, ensure_ascii=False)
            logger.info("Thresholds saved successfully")
            return True
        except Exception as e:
            logger.error(f"Error saving thresholds: {e}")
            return False

    @classmethod
    def get_thresholds(cls) -> Dict[str, Any]:
        return cls.load_thresholds()

    @classmethod
    def update_thresholds(cls, new_thresholds: Dict[str, Any]) -> Dict[str, Any]:
        try:
            current = cls.load_thresholds()

            for sensor_type in ['temperature', 'humidity', 'light']:
                if sensor_type in new_thresholds:
                    if sensor_type not in current:
                        current[sensor_type] = {}

                    for key in ['normal_min', 'normal_max', 'warning_min', 'warning_max']:
                        if key in new_thresholds[sensor_type]:
                            try:
                                current[sensor_type][key] = float(new_thresholds[sensor_type][key])
                            except (ValueError, TypeError):
                                logger.warning(f"Invalid value for {sensor_type}.{key}, keeping current value")

            if cls.save_thresholds(current):
                return {"status": "success", "data": current, "message": "Cập nhật ngưỡng thành công"}
            else:
                return {"status": "error", "message": "Lỗi khi lưu cấu hình ngưỡng"}

        except Exception as e:
            logger.error(f"Error updating thresholds: {e}")
            return {"status": "error", "message": str(e)}

    @classmethod
    def validate_thresholds(cls, thresholds: Dict[str, Any]) -> tuple[bool, str]:
        try:
            for sensor_type in ['temperature', 'humidity', 'light']:
                if sensor_type not in thresholds:
                    continue

                sensor_data = thresholds[sensor_type]

                if 'normal_min' in sensor_data and 'normal_max' in sensor_data:
                    if sensor_data['normal_min'] >= sensor_data['normal_max']:
                        return False, f"Ngưỡng normal_min phải nhỏ hơn normal_max cho {sensor_type}"

                if 'warning_min' in sensor_data and 'warning_max' in sensor_data:
                    if sensor_data['warning_min'] >= sensor_data['warning_max']:
                        return False, f"Ngưỡng warning_min phải nhỏ hơn warning_max cho {sensor_type}"

                if 'warning_min' in sensor_data and 'normal_min' in sensor_data:
                    if sensor_data['warning_min'] > sensor_data['normal_min']:
                        return False, f"Ngưỡng warning_min phải nhỏ hơn hoặc bằng normal_min cho {sensor_type}"

                if 'normal_max' in sensor_data and 'warning_max' in sensor_data:
                    if sensor_data['normal_max'] > sensor_data['warning_max']:
                        return False, f"Ngưỡng normal_max phải nhỏ hơn hoặc bằng warning_max cho {sensor_type}"

            return True, "Hợp lệ"

        except Exception as e:
            logger.error(f"Error validating thresholds: {e}")
            return False, str(e)
