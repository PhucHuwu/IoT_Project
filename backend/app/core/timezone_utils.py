from datetime import datetime, timedelta, timezone
from typing import Tuple


def get_vietnam_timezone() -> timezone:
    return timezone(timedelta(hours=7))


def get_current_vietnam_time() -> datetime:
    return datetime.now(get_vietnam_timezone())


def convert_to_vietnam_time(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).astimezone(get_vietnam_timezone())
    return dt.astimezone(get_vietnam_timezone())


def convert_from_vietnam_time(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=get_vietnam_timezone()).astimezone(timezone.utc)
    return dt.astimezone(timezone.utc)


def create_vietnam_datetime(year: int, month: int, day: int,
                            hour: int = 0, minute: int = 0, second: int = 0,
                            microsecond: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, second, microsecond, tzinfo=get_vietnam_timezone())
