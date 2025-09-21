from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.cursor import Cursor
import re
from app.core.logger_config import logger
from app.core.timezone_utils import get_vietnam_timezone, convert_from_vietnam_time, convert_to_vietnam_time, create_vietnam_datetime


class NoSQLQueryService:

    def __init__(self, collection: Collection, action_collection: Collection = None):
        self.collection = collection
        self.action_collection = action_collection
        self._ensure_indexes()

    def _ensure_indexes(self):
        try:
            self.collection.create_index([("timestamp", DESCENDING)])

            self.collection.create_index([("temperature", ASCENDING), ("timestamp", DESCENDING)])

            self.collection.create_index([("humidity", ASCENDING), ("timestamp", DESCENDING)])

            self.collection.create_index([("light", ASCENDING), ("timestamp", DESCENDING)])

            self.collection.create_index([("$**", "text")])

            if self.action_collection is not None:
                self.action_collection.create_index([("timestamp", DESCENDING)])
                self.action_collection.create_index([("led", ASCENDING), ("timestamp", DESCENDING)])
                self.action_collection.create_index([("state", ASCENDING), ("timestamp", DESCENDING)])
                self.action_collection.create_index([("type", ASCENDING), ("timestamp", DESCENDING)])

            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create indexes: {e}")

    def search_by_text(self, search_term: str, fields: List[str] = None) -> List[Dict[str, Any]]:
        try:
            if fields:
                query = {
                    "$text": {"$search": search_term},
                    "$or": [{field: {"$regex": search_term, "$options": "i"}} for field in fields]
                }
            else:
                query = {"$text": {"$search": search_term}}

            cursor = self.collection.find(query).sort([("score", {"$meta": "textScore"})])
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Text search found {len(data)} records for term: {search_term}")
            return data

        except Exception as e:
            logger.error(f"Text search error: {e}")
            return []

    def search_by_numeric_range(self, field: str, min_val: float = None, max_val: float = None) -> List[Dict[str, Any]]:
        try:
            query = {}
            if min_val is not None or max_val is not None:
                range_query = {}
                if min_val is not None:
                    range_query["$gte"] = min_val
                if max_val is not None:
                    range_query["$lte"] = max_val
                query[field] = range_query

            cursor = self.collection.find(query).sort("timestamp", DESCENDING)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Range search found {len(data)} records for {field}: {min_val}-{max_val}")
            return data

        except Exception as e:
            logger.error(f"Range search error: {e}")
            return []

    def search_by_time_range(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        try:
            start_utc = convert_from_vietnam_time(start_time) if start_time.tzinfo else start_time.replace(tzinfo=get_vietnam_timezone())
            end_utc = convert_from_vietnam_time(end_time) if end_time.tzinfo else end_time.replace(tzinfo=get_vietnam_timezone())

            query = {
                "timestamp": {
                    "$gte": start_utc,
                    "$lte": end_utc
                }
            }

            cursor = self.collection.find(query).sort("timestamp", ASCENDING)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Time range search found {len(data)} records from {start_time} to {end_time}")
            return data

        except Exception as e:
            logger.error(f"Time range search error: {e}")
            return []

    def search_by_multiple_criteria(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            query = {}

            if 'start_time' in criteria and 'end_time' in criteria:
                start_utc = convert_from_vietnam_time(criteria['start_time'])
                end_utc = convert_from_vietnam_time(criteria['end_time'])
                query['timestamp'] = {"$gte": start_utc, "$lte": end_utc}

            if 'temperature_min' in criteria or 'temperature_max' in criteria:
                temp_query = {}
                if 'temperature_min' in criteria and 'temperature_max' in criteria:
                    if criteria['temperature_min'] == criteria['temperature_max']:
                        exact_value = criteria['temperature_min']
                        query['temperature'] = exact_value
                    else:
                        temp_query['$gte'] = criteria['temperature_min']
                        temp_query['$lte'] = criteria['temperature_max']
                        query['temperature'] = temp_query
                else:
                    if 'temperature_min' in criteria:
                        temp_query['$gte'] = criteria['temperature_min']
                    if 'temperature_max' in criteria:
                        temp_query['$lte'] = criteria['temperature_max']
                    query['temperature'] = temp_query

            if 'humidity_min' in criteria or 'humidity_max' in criteria:
                humidity_query = {}
                if 'humidity_min' in criteria and 'humidity_max' in criteria:
                    if criteria['humidity_min'] == criteria['humidity_max']:
                        exact_value = criteria['humidity_min']
                        query['humidity'] = exact_value
                    else:
                        humidity_query['$gte'] = criteria['humidity_min']
                        humidity_query['$lte'] = criteria['humidity_max']
                        query['humidity'] = humidity_query
                else:
                    if 'humidity_min' in criteria:
                        humidity_query['$gte'] = criteria['humidity_min']
                    if 'humidity_max' in criteria:
                        humidity_query['$lte'] = criteria['humidity_max']
                    query['humidity'] = humidity_query

            if 'light_min' in criteria or 'light_max' in criteria:
                light_query = {}
                if 'light_min' in criteria and 'light_max' in criteria:
                    if criteria['light_min'] == criteria['light_max']:
                        exact_value = criteria['light_min']
                        query['light'] = exact_value
                    else:
                        light_query['$gte'] = criteria['light_min']
                        light_query['$lte'] = criteria['light_max']
                        query['light'] = light_query
                else:
                    if 'light_min' in criteria:
                        light_query['$gte'] = criteria['light_min']
                    if 'light_max' in criteria:
                        light_query['$lte'] = criteria['light_max']
                    query['light'] = light_query

            if 'text_search' in criteria and criteria['text_search']:
                search_term = criteria['text_search']
                or_conditions = []

                try:
                    search_value = float(search_term)
                    or_conditions.extend([
                        {'temperature': search_value},
                        {'humidity': search_value},
                        {'light': search_value}
                    ])
                except ValueError:
                    pass

                or_conditions.append({'timestamp': {'$regex': search_term, '$options': 'i'}})

                if or_conditions:
                    query['$or'] = or_conditions

            cursor = self.collection.find(query).sort("timestamp", DESCENDING)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Multi-criteria search found {len(data)} records")
            return data

        except Exception as e:
            logger.error(f"Multi-criteria search error: {e}")
            return []

    def search_by_time_string(self, time_string: str) -> List[Dict[str, Any]]:
        try:
            query = {}
            current_time = datetime.now(get_vietnam_timezone())

            if re.match(r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$', time_string):
                parts = time_string.split()
                time_part = parts[0].split(':')
                date_part = parts[1].split('/')

                hour = int(time_part[0])
                minute = int(time_part[1])
                second = int(time_part[2])
                day = int(date_part[0])
                month = int(date_part[1])
                year = int(date_part[2])

                search_datetime = create_vietnam_datetime(year, month, day, hour, minute, second)
                start_time = search_datetime
                end_time = search_datetime.replace(microsecond=999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                logger.info(f"Searching for exact time: {search_datetime}")

            elif re.match(r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$', time_string):
                parts = time_string.split(':')
                hour = int(parts[0])
                minute = int(parts[1])
                second = int(parts[2])

                search_datetime = current_time.replace(hour=hour, minute=minute, second=second, microsecond=0)
                start_time = search_datetime
                end_time = search_datetime.replace(microsecond=999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                logger.info(f"Searching for exact time today: {search_datetime}")

            elif re.match(r'^(\d{1,2}):(\d{1,2})$', time_string):
                parts = time_string.split(':')
                hour = int(parts[0])
                minute = int(parts[1])

                search_datetime = current_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
                start_time = search_datetime
                end_time = search_datetime.replace(second=59, microsecond=999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                logger.info(f"Searching for exact hour:minute today: {search_datetime}")

            elif re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', time_string):
                parts = time_string.split('/')
                day = int(parts[0])
                month = int(parts[1])
                year = int(parts[2])

                start_date = create_vietnam_datetime(year, month, day, 0, 0, 0)
                end_date = create_vietnam_datetime(year, month, day, 23, 59, 59, 999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_date), '$lte': convert_from_vietnam_time(end_date)}
                logger.info(f"Searching for exact date: {start_date.date()}")

            elif re.match(r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$', time_string):
                parts = time_string.split()
                time_part = parts[0].split(':')
                date_part = parts[1].split('/')

                hour = int(time_part[0])
                minute = int(time_part[1])
                day = int(date_part[0])
                month = int(date_part[1])
                year = int(date_part[2])

                search_datetime = create_vietnam_datetime(year, month, day, hour, minute, 0)
                start_time = search_datetime
                end_time = search_datetime.replace(second=59, microsecond=999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                logger.info(f"Searching for exact date and hour:minute: {search_datetime}")

            else:
                cursor = self.collection.find({})
                all_data = list(cursor)

                filtered_data = []
                for doc in all_data:
                    if doc.get('timestamp'):
                        timestamp_str = str(doc['timestamp'])
                        if time_string in timestamp_str:
                            filtered_data.append(doc)

                filtered_data = self._convert_timestamps_to_vietnam(filtered_data)

                logger.info(f"Text search in timestamp found {len(filtered_data)} records")
                return filtered_data

            cursor = self.collection.find(query).sort("timestamp", DESCENDING)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Exact time string search found {len(data)} records for: {time_string}")
            return data

        except Exception as e:
            logger.error(f"Time string search error: {e}")
            return []

    def get_aggregated_data(self, group_by: str = "hour", time_range: Dict[str, datetime] = None) -> List[Dict[str, Any]]:
        try:
            pipeline = []

            if time_range and 'start_time' in time_range and 'end_time' in time_range:
                start_utc = convert_from_vietnam_time(time_range['start_time'])
                end_utc = convert_from_vietnam_time(time_range['end_time'])
                pipeline.append({
                    "$match": {
                        "timestamp": {
                            "$gte": start_utc,
                            "$lte": end_utc
                        }
                    }
                })

            if group_by == "hour":
                group_stage = {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$timestamp"},
                            "month": {"$month": "$timestamp"},
                            "day": {"$dayOfMonth": "$timestamp"},
                            "hour": {"$hour": "$timestamp"}
                        },
                        "avg_temperature": {"$avg": "$temperature"},
                        "avg_humidity": {"$avg": "$humidity"},
                        "avg_light": {"$avg": "$light"},
                        "max_temperature": {"$max": "$temperature"},
                        "min_temperature": {"$min": "$temperature"},
                        "count": {"$sum": 1},
                        "latest_timestamp": {"$max": "$timestamp"}
                    }
                }
            elif group_by == "day":
                group_stage = {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$timestamp"},
                            "month": {"$month": "$timestamp"},
                            "day": {"$dayOfMonth": "$timestamp"}
                        },
                        "avg_temperature": {"$avg": "$temperature"},
                        "avg_humidity": {"$avg": "$humidity"},
                        "avg_light": {"$avg": "$light"},
                        "max_temperature": {"$max": "$temperature"},
                        "min_temperature": {"$min": "$temperature"},
                        "count": {"$sum": 1},
                        "latest_timestamp": {"$max": "$timestamp"}
                    }
                }
            else:
                group_stage = {
                    "$group": {
                        "_id": {
                            "year": {"$year": "$timestamp"},
                            "month": {"$month": "$timestamp"},
                            "day": {"$dayOfMonth": "$timestamp"},
                            "hour": {"$hour": "$timestamp"},
                            "minute": {"$minute": "$timestamp"}
                        },
                        "avg_temperature": {"$avg": "$temperature"},
                        "avg_humidity": {"$avg": "$humidity"},
                        "avg_light": {"$avg": "$light"},
                        "max_temperature": {"$max": "$temperature"},
                        "min_temperature": {"$min": "$temperature"},
                        "count": {"$sum": 1},
                        "latest_timestamp": {"$max": "$timestamp"}
                    }
                }

            pipeline.append(group_stage)
            pipeline.append({"$sort": {"_id": 1}})

            cursor = self.collection.aggregate(pipeline)
            data = list(cursor)

            for item in data:
                if 'latest_timestamp' in item:
                    item['latest_timestamp'] = convert_to_vietnam_time(item['latest_timestamp'])

            logger.info(f"Aggregated data by {group_by}: {len(data)} groups")
            return data

        except Exception as e:
            logger.error(f"Aggregation error: {e}")
            return []

    def get_statistics(self, time_range: Dict[str, datetime] = None) -> Dict[str, Any]:
        try:
            pipeline = []

            if time_range and 'start_time' in time_range and 'end_time' in time_range:
                start_utc = convert_from_vietnam_time(time_range['start_time'])
                end_utc = convert_from_vietnam_time(time_range['end_time'])
                pipeline.append({
                    "$match": {
                        "timestamp": {
                            "$gte": start_utc,
                            "$lte": end_utc
                        }
                    }
                })

            pipeline.append({
                "$group": {
                    "_id": None,
                    "total_records": {"$sum": 1},
                    "avg_temperature": {"$avg": "$temperature"},
                    "min_temperature": {"$min": "$temperature"},
                    "max_temperature": {"$max": "$temperature"},
                    "avg_humidity": {"$avg": "$humidity"},
                    "min_humidity": {"$min": "$humidity"},
                    "max_humidity": {"$max": "$humidity"},
                    "avg_light": {"$avg": "$light"},
                    "min_light": {"$min": "$light"},
                    "max_light": {"$max": "$light"},
                    "first_timestamp": {"$min": "$timestamp"},
                    "last_timestamp": {"$max": "$timestamp"}
                }
            })

            cursor = self.collection.aggregate(pipeline)
            result = list(cursor)

            if result:
                stats = result[0]
                if 'first_timestamp' in stats:
                    stats['first_timestamp'] = convert_to_vietnam_time(stats['first_timestamp'])
                if 'last_timestamp' in stats:
                    stats['last_timestamp'] = convert_to_vietnam_time(stats['last_timestamp'])

                logger.info(f"Statistics calculated: {stats['total_records']} records")
                return stats
            else:
                return {"total_records": 0}

        except Exception as e:
            logger.error(f"Statistics error: {e}")
            return {"total_records": 0}

    def search_with_pagination(self, query: Dict[str, Any], page: int = 1, per_page: int = 10,
                               sort_field: str = "timestamp", sort_order: str = "desc") -> Dict[str, Any]:
        try:
            skip = (page - 1) * per_page

            sort_direction = DESCENDING if sort_order.lower() == "desc" else ASCENDING
            sort_criteria = [(sort_field, sort_direction)]

            total_count = self.collection.count_documents(query)

            cursor = self.collection.find(query).sort(sort_criteria).skip(skip).limit(per_page)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            total_pages = max(1, (total_count + per_page - 1) // per_page)

            result = {
                'data': data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'has_prev': page > 1,
                    'has_next': page < total_pages
                }
            }

            logger.info(f"Paginated search: {len(data)} records, page {page}/{total_pages}")
            return result

        except Exception as e:
            logger.error(f"Paginated search error: {e}")
            return {'data': [], 'pagination': {'page': 1, 'per_page': per_page, 'total_count': 0, 'total_pages': 1, 'has_prev': False, 'has_next': False}}

    def _convert_timestamps_to_vietnam(self, data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for item in data_list:
            if 'timestamp' in item and isinstance(item['timestamp'], datetime):
                item['timestamp'] = convert_to_vietnam_time(item['timestamp'])
        return data_list

    def search_action_history(self, search_term: str = '', device_filter: str = 'all',
                              state_filter: str = 'all', sort_field: str = 'timestamp',
                              sort_order: str = 'desc', page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        if self.action_collection is None:
            logger.error("Action collection not initialized")
            return {'data': [], 'pagination': {'page': 1, 'per_page': per_page, 'total_count': 0, 'total_pages': 1, 'has_prev': False, 'has_next': False}}

        try:
            query = {}

            if device_filter and device_filter != 'all':
                query['led'] = {'$regex': f'^{device_filter}$', '$options': 'i'}

            if state_filter and state_filter != 'all':
                if state_filter.lower() == 'on':
                    query['state'] = {'$in': ['ON', 'on', '1', 'true', 'TRUE']}
                elif state_filter.lower() == 'off':
                    query['state'] = {'$in': ['OFF', 'off', '0', 'false', 'FALSE']}

            if search_term:
                time_patterns = [
                    r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$',
                    r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$',
                    r'^(\d{1,2}):(\d{1,2})$',
                    r'^(\d{1,2})/(\d{1,2})/(\d{4})$',
                    r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$'
                ]

                is_time_search = any(re.match(pattern, search_term) for pattern in time_patterns)

                if is_time_search:
                    current_time = datetime.now(get_vietnam_timezone())

                    if re.match(r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$', search_term):
                        parts = search_term.split()
                        time_part = parts[0].split(':')
                        date_part = parts[1].split('/')

                        hour = int(time_part[0])
                        minute = int(time_part[1])
                        second = int(time_part[2])
                        day = int(date_part[0])
                        month = int(date_part[1])
                        year = int(date_part[2])

                        search_datetime = create_vietnam_datetime(year, month, day, hour, minute, second)
                        start_time = search_datetime
                        end_time = search_datetime.replace(microsecond=999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                        logger.info(f"Action history searching for exact time: {search_datetime}")

                    elif re.match(r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$', search_term):
                        parts = search_term.split(':')
                        hour = int(parts[0])
                        minute = int(parts[1])
                        second = int(parts[2])

                        search_datetime = current_time.replace(hour=hour, minute=minute, second=second, microsecond=0)
                        start_time = search_datetime
                        end_time = search_datetime.replace(microsecond=999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                        logger.info(f"Action history searching for exact time today: {search_datetime}")

                    elif re.match(r'^(\d{1,2}):(\d{1,2})$', search_term):
                        parts = search_term.split(':')
                        hour = int(parts[0])
                        minute = int(parts[1])

                        search_datetime = current_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        start_time = search_datetime
                        end_time = search_datetime.replace(second=59, microsecond=999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                        logger.info(f"Action history searching for exact hour:minute today: {search_datetime}")

                    elif re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', search_term):
                        parts = search_term.split('/')
                        day = int(parts[0])
                        month = int(parts[1])
                        year = int(parts[2])

                        start_date = create_vietnam_datetime(year, month, day, 0, 0, 0)
                        end_date = create_vietnam_datetime(year, month, day, 23, 59, 59, 999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_date), '$lte': convert_from_vietnam_time(end_date)}
                        logger.info(f"Action history searching for exact date: {start_date.date()}")

                    elif re.match(r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$', search_term):
                        parts = search_term.split()
                        time_part = parts[0].split(':')
                        date_part = parts[1].split('/')

                        hour = int(time_part[0])
                        minute = int(time_part[1])
                        day = int(date_part[0])
                        month = int(date_part[1])
                        year = int(date_part[2])

                        search_datetime = create_vietnam_datetime(year, month, day, hour, minute, 0)
                        start_time = search_datetime
                        end_time = search_datetime.replace(second=59, microsecond=999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}
                        logger.info(f"Action history searching for exact date and hour:minute: {search_datetime}")
                else:
                    logger.info(f"Action history search term '{search_term}' is not a valid time format, ignoring search")

            sort_direction = DESCENDING if sort_order.lower() == "desc" else ASCENDING
            sort_criteria = [(sort_field, sort_direction)]

            skip = (page - 1) * per_page
            total_count = self.action_collection.count_documents(query)

            cursor = self.action_collection.find(query).sort(sort_criteria).skip(skip).limit(per_page)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            total_pages = max(1, (total_count + per_page - 1) // per_page)

            result = {
                'data': data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'has_prev': page > 1,
                    'has_next': page < total_pages
                },
                'filters': {
                    'device': device_filter,
                    'state': state_filter,
                    'search': search_term
                },
                'sort': {
                    'field': sort_field,
                    'order': sort_order
                }
            }

            logger.info(f"Action history search: {len(data)} records, page {page}/{total_pages}")
            return result

        except Exception as e:
            logger.error(f"Action history search error: {e}")
            return {'data': [], 'pagination': {'page': 1, 'per_page': per_page, 'total_count': 0, 'total_pages': 1, 'has_prev': False, 'has_next': False}}

    def get_recent_action_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self.action_collection is None:
            logger.error("Action collection not initialized")
            return []

        try:
            cursor = self.action_collection.find().sort("timestamp", DESCENDING).limit(limit)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Retrieved {len(data)} recent action history records")
            return data

        except Exception as e:
            logger.error(f"Error retrieving action history: {e}")
            return []
