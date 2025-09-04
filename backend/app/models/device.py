from typing import Dict, Any, Optional
from enum import Enum


class DeviceStatus(Enum):
    ON = "on"
    OFF = "off"
    UNKNOWN = "unknown"


class Device:

    def __init__(self, device_id: str, name: str, device_type: str,
                 status: DeviceStatus = DeviceStatus.OFF, **kwargs):
        self.device_id = device_id
        self.name = name
        self.device_type = device_type
        self.status = status
        self.additional_properties = kwargs

    def to_dict(self) -> Dict[str, Any]:
        return {
            "device_id": self.device_id,
            "name": self.name,
            "device_type": self.device_type,
            "status": self.status.value,
            **self.additional_properties
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Device':
        status = DeviceStatus.OFF
        if 'status' in data:
            try:
                status = DeviceStatus(data['status'])
            except ValueError:
                status = DeviceStatus.UNKNOWN

        return cls(
            device_id=data.get('device_id', ''),
            name=data.get('name', ''),
            device_type=data.get('device_type', ''),
            status=status,
            **{k: v for k, v in data.items()
               if k not in ['device_id', 'name', 'device_type', 'status']}
        )

    def toggle_status(self) -> None:
        if self.status == DeviceStatus.ON:
            self.status = DeviceStatus.OFF
        elif self.status == DeviceStatus.OFF:
            self.status = DeviceStatus.ON
