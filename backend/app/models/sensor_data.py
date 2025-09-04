from datetime import datetime
from typing import Optional, Dict, Any


class SensorData:

    def __init__(self, temperature: float, humidity: float, light: float,
                 timestamp: Optional[datetime] = None, **kwargs):
        self.temperature = temperature
        self.humidity = humidity
        self.light = light
        self.timestamp = timestamp or datetime.now()
        self.additional_data = kwargs

    def to_dict(self) -> Dict[str, Any]:
        return {
            "temperature": self.temperature,
            "humidity": self.humidity,
            "light": self.light,
            "timestamp": self.timestamp,
            **self.additional_data
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SensorData':
        return cls(
            temperature=data.get('temperature', 0.0),
            humidity=data.get('humidity', 0.0),
            light=data.get('light', 0.0),
            timestamp=data.get('timestamp'),
            **{k: v for k, v in data.items()
               if k not in ['temperature', 'humidity', 'light', 'timestamp']}
        )

    def validate(self) -> bool:
        return (
            -50 <= self.temperature <= 80 and
            0 <= self.humidity <= 100 and
            0 <= self.light <= 100
        )
