from pymongo import MongoClient
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.logger_config import logger
from app.core.config import MONGODB_CONNECTION_STRING, MONGODB_DB_NAME, MONGODB_COLLECTION_NAME
from app.core.timezone_utils import get_current_vietnam_time, convert_from_vietnam_time, convert_to_vietnam_time, get_vietnam_timezone


class DatabaseManager:

    def __init__(self):
        self.mongo_client: Optional[MongoClient] = None
        self.db = None
        self.collection = None
        self.connect()

    def _convert_timestamps_to_vietnam(self, data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for item in data_list:
            if 'timestamp' in item and isinstance(item['timestamp'], datetime):
                item['timestamp'] = convert_to_vietnam_time(item['timestamp'])
        return data_list

    def connect(self) -> bool:
        try:
            self.mongo_client = MongoClient(
                MONGODB_CONNECTION_STRING,
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
                socketTimeoutMS=10000
            )
            self.db = self.mongo_client[MONGODB_DB_NAME]
            self.collection = self.db[MONGODB_COLLECTION_NAME]

            self.mongo_client.admin.command('ping')
            logger.info("Connected to MongoDB successfully")

            return True

        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            return False

    def insert_sensor_data(self, sensor_data: Dict[str, Any]) -> Optional[str]:
        try:
            if 'timestamp' not in sensor_data:
                sensor_data['timestamp'] = get_current_vietnam_time()
            else:
                if isinstance(sensor_data['timestamp'], datetime):
                    sensor_data['timestamp'] = convert_from_vietnam_time(sensor_data['timestamp'])

            result = self.collection.insert_one(sensor_data)
            logger.info(f"Data stored in MongoDB with ID: {result.inserted_id}")

            logger.info(f"Temperature: {sensor_data.get('temperature')}°C, "
                        f"Humidity: {sensor_data.get('humidity')}%, "
                        f"Light: {sensor_data.get('light')}%")

            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error inserting sensor data: {e}")
            return None

    def insert_action_history(self, action_data: Dict[str, Any], collection_name: Optional[str] = 'action_history') -> Optional[str]:
        try:
            collection = self.db[collection_name]

            if 'timestamp' not in action_data:
                action_data['timestamp'] = get_current_vietnam_time()
            else:
                if isinstance(action_data['timestamp'], datetime):
                    action_data['timestamp'] = convert_from_vietnam_time(action_data['timestamp'])

            result = collection.insert_one(action_data)
            logger.info(f"Action history stored in MongoDB with ID: {result.inserted_id}")
            return str(result.inserted_id)

        except Exception as e:
            logger.error(f"Error inserting action history: {e}")
            return None

    def insert_data(self, data: Dict[str, Any]) -> Optional[object]:
        result_id = self.insert_sensor_data(data)
        if result_id:
            class InsertResult:
                def __init__(self, inserted_id):
                    self.inserted_id = inserted_id
            return InsertResult(result_id)
        return None

    def get_recent_data(self, limit: Optional[int] = 10) -> List[Dict[str, Any]]:
        try:
            cursor = self.collection.find().sort("timestamp", -1)
            if limit is not None:
                cursor = cursor.limit(limit)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Retrieved {len(data)} recent records")
            return data

        except Exception as e:
            logger.error(f"Error retrieving data: {e}")
            return []

    def get_recent_action_history(self, limit: int = 50, collection_name: Optional[str] = 'action_history') -> List[Dict[str, Any]]:
        try:
            collection = self.db[collection_name]
            cursor = collection.find().sort("timestamp", -1).limit(limit)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Retrieved {len(data)} recent action history records")
            return data
        except Exception as e:
            logger.error(f"Error retrieving action history: {e}")
            return []

    def get_action_history_with_crud_operations(self,
                                                search_term: str = '',
                                                device_filter: str = 'all',
                                                state_filter: str = 'all',
                                                sort_field: str = 'timestamp',
                                                sort_order: str = 'desc',
                                                page: int = 1,
                                                per_page: int = 10,
                                                collection_name: Optional[str] = 'action_history') -> Dict[str, Any]:
        try:
            collection = self.db[collection_name]

            base_query = {}

            if device_filter and device_filter != 'all':
                base_query['led'] = {'$regex': f'^{device_filter}$', '$options': 'i'}

            if state_filter and state_filter != 'all':
                if state_filter.lower() == 'on':
                    base_query['state'] = {'$in': ['ON', 'on', '1', 'true', 'TRUE']}
                elif state_filter.lower() == 'off':
                    base_query['state'] = {'$in': ['OFF', 'off', '0', 'false', 'FALSE']}

            if search_term:
                try:
                    from datetime import datetime, timedelta
                    search_lower = search_term.lower()
                    search_original = search_term.strip()

                    time_date_pattern = r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$'
                    import re
                    time_date_match = re.match(time_date_pattern, search_original)

                    if time_date_match:
                        hour = int(time_date_match.group(1))
                        minute = int(time_date_match.group(2))
                        second = int(time_date_match.group(3))
                        day = int(time_date_match.group(4))
                        month = int(time_date_match.group(5))
                        year = int(time_date_match.group(6))

                        try:
                            search_datetime = datetime(year, month, day, hour, minute, second)
                            start_time = search_datetime - timedelta(seconds=30)
                            end_time = search_datetime + timedelta(seconds=30)
                            base_query['timestamp'] = {'$gte': start_time, '$lte': end_time}
                            logger.info(f"Searching for exact time: {search_datetime}")
                        except ValueError:
                            logger.error(f"Invalid datetime: {search_original}")
                            pass

                    elif re.match(r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$', search_original):
                        parts = search_original.split()
                        time_part = parts[0].split(':')
                        date_part = parts[1].split('/')

                        hour = int(time_part[0])
                        minute = int(time_part[1])
                        day = int(date_part[0])
                        month = int(date_part[1])
                        year = int(date_part[2])

                        try:
                            start_time = datetime(year, month, day, hour, minute, 0)
                            end_time = datetime(year, month, day, hour, minute, 59, 999999)
                            base_query['timestamp'] = {'$gte': start_time, '$lte': end_time}
                            logger.info(f"Searching for time: {start_time} to {end_time}")
                        except ValueError:
                            logger.error(f"Invalid datetime: {search_original}")
                            pass

                    elif re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', search_original):
                        parts = search_original.split('/')
                        day = int(parts[0])
                        month = int(parts[1])
                        year = int(parts[2])

                        try:
                            start_date = datetime(year, month, day, 0, 0, 0)
                            end_date = datetime(year, month, day, 23, 59, 59)
                            base_query['timestamp'] = {'$gte': start_date, '$lte': end_date}
                            logger.info(f"Searching for date: {start_date.date()}")
                        except ValueError:
                            logger.error(f"Invalid date: {search_original}")
                            pass

                    elif re.match(r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$', search_original):
                        parts = search_original.split(':')
                        hour = int(parts[0])
                        minute = int(parts[1])
                        second = int(parts[2])

                        cursor = collection.find(base_query)
                        all_data = list(cursor)

                        filtered_data = []
                        for doc in all_data:
                            if doc.get('timestamp'):
                                timestamp_str = str(doc['timestamp'])
                                if search_original in timestamp_str:
                                    filtered_data.append(doc)

                        filtered_data.sort(key=lambda x: x.get(sort_field, ''), reverse=(sort_order == 'desc'))
                        total_count = len(filtered_data)
                        start_idx = (page - 1) * per_page
                        end_idx = start_idx + per_page
                        data = filtered_data[start_idx:end_idx]

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

                        logger.info(f"Action history time search executed: {len(data)} records, page {page}/{total_pages}")
                        return result

                    elif search_lower.isdigit() and len(search_lower) == 4:
                        year = int(search_lower)
                        start_date = datetime(year, 1, 1)
                        end_date = datetime(year, 12, 31, 23, 59, 59)
                        base_query['timestamp'] = {'$gte': start_date, '$lte': end_date}
                        logger.info(f"Searching for year: {year}")

                    elif search_lower in ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']:
                        month = int(search_lower)
                        current_year = datetime.now().year
                        start_date = datetime(current_year, month, 1)
                        if month == 12:
                            end_date = datetime(current_year + 1, 1, 1) - timedelta(seconds=1)
                        else:
                            end_date = datetime(current_year, month + 1, 1) - timedelta(seconds=1)
                        base_query['timestamp'] = {'$gte': start_date, '$lte': end_date}
                        logger.info(f"Searching for month: {month}")

                    elif search_lower.isdigit() and 1 <= int(search_lower) <= 31:
                        day = int(search_lower)
                        current_date = datetime.now()
                        start_date = current_date.replace(day=day, hour=0, minute=0, second=0, microsecond=0)
                        end_date = current_date.replace(day=day, hour=23, minute=59, second=59, microsecond=999999)
                        base_query['timestamp'] = {'$gte': start_date, '$lte': end_date}
                        logger.info(f"Searching for day: {day}")

                    else:
                        cursor = collection.find(base_query)
                        all_data = list(cursor)

                        filtered_data = []
                        for doc in all_data:
                            if doc.get('timestamp'):
                                timestamp_str = str(doc['timestamp'])
                                if search_term.lower() in timestamp_str.lower():
                                    filtered_data.append(doc)

                        filtered_data.sort(key=lambda x: x.get(sort_field, ''), reverse=(sort_order == 'desc'))
                        total_count = len(filtered_data)
                        start_idx = (page - 1) * per_page
                        end_idx = start_idx + per_page
                        data = filtered_data[start_idx:end_idx]

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

                        logger.info(f"Action history search executed: {len(data)} records, page {page}/{total_pages}")
                        return result

                except Exception as e:
                    logger.error(f"Error in search logic: {e}")
                    pass

            sort_criteria = [(sort_field, -1 if sort_order == 'desc' else 1)]

            skip = (page - 1) * per_page

            total_count = collection.count_documents(base_query)

            cursor = collection.find(base_query).sort(sort_criteria).skip(skip).limit(per_page)
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

            logger.info(f"Action history CRUD query executed: {len(data)} records, page {page}/{total_pages}")
            return result

        except Exception as e:
            logger.error(f"Error in action history CRUD operations: {e}")
            return {
                'data': [],
                'pagination': {
                    'page': 1,
                    'per_page': per_page,
                    'total_count': 0,
                    'total_pages': 1,
                    'has_prev': False,
                    'has_next': False
                },
                'filters': {'device': device_filter, 'state': state_filter, 'search': search_term},
                'sort': {'field': sort_field, 'order': sort_order}
            }

    def get_data_by_time_range(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        try:
            start_time_utc = convert_from_vietnam_time(start_time) if start_time.tzinfo else start_time.replace(tzinfo=timezone.utc)
            end_time_utc = convert_from_vietnam_time(end_time) if end_time.tzinfo else end_time.replace(tzinfo=timezone.utc)

            query = {
                "timestamp": {
                    "$gte": start_time_utc,
                    "$lte": end_time_utc
                }
            }
            cursor = self.collection.find(query).sort("timestamp", 1)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Retrieved {len(data)} records for time range {start_time} to {end_time}")
            return data

        except Exception as e:
            logger.error(f"Error retrieving data by time range: {e}")
            return []

    def get_filtered_data(self, query_filter: Dict[str, Any], limit: Optional[int] = 100) -> List[Dict[str, Any]]:
        try:
            cursor = self.collection.find(query_filter).sort("timestamp", -1)
            if limit is not None:
                cursor = cursor.limit(limit)
            data = list(cursor)

            logger.info(f"Retrieved {len(data)} filtered records with query: {query_filter}")
            return data

        except Exception as e:
            logger.error(f"Error retrieving filtered data: {e}")
            return []

    def get_data_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        try:
            from bson import ObjectId
            if len(sensor_id) == 24:
                data = self.collection.find_one({"_id": ObjectId(sensor_id)})
            else:
                data = self.collection.find_one({"_id": sensor_id})

            if data:
                logger.info(f"Retrieved sensor data with ID: {sensor_id}")
            else:
                logger.info(f"No sensor data found with ID: {sensor_id}")

            return data

        except Exception as e:
            logger.error(f"Error retrieving data by ID: {e}")
            return None

    def get_data_with_crud_operations(self,
                                      query_filter: Dict[str, Any] = None,
                                      search_term: str = '',
                                      search_criteria: str = 'all',
                                      sort_field: str = 'timestamp',
                                      sort_order: str = 'desc',
                                      page: int = 1,
                                      per_page: int = 10,
                                      limit: Optional[int] = None) -> Dict[str, Any]:
        try:
            base_query = query_filter or {}

            if search_term:
                search_conditions = []

                if search_criteria == 'all':
                    try:
                        search_num = float(search_term)
                        search_conditions.extend([
                            {"temperature": search_num},
                            {"humidity": search_num},
                            {"light": search_num}
                        ])
                    except ValueError:
                        pass

                    search_conditions.append({"timestamp": {"$regex": search_term, "$options": "i"}})

                elif search_criteria == 'temperature':
                    try:
                        search_num = float(search_term)
                        search_conditions.append({"temperature": search_num})
                    except ValueError:
                        search_conditions.append({"temperature": {"$regex": search_term, "$options": "i"}})

                elif search_criteria == 'humidity':
                    try:
                        search_num = float(search_term)
                        search_conditions.append({"humidity": search_num})
                    except ValueError:
                        search_conditions.append({"humidity": {"$regex": search_term, "$options": "i"}})

                elif search_criteria == 'light':
                    try:
                        search_num = float(search_term)
                        search_conditions.append({"light": search_num})
                    except ValueError:
                        search_conditions.append({"light": {"$regex": search_term, "$options": "i"}})

                elif search_criteria == 'time':
                    search_conditions.append({"timestamp": {"$regex": search_term, "$options": "i"}})

                if search_conditions:
                    base_query["$or"] = search_conditions

            sort_criteria = [(sort_field, -1 if sort_order == 'desc' else 1)]

            skip = (page - 1) * per_page

            total_count = self.collection.count_documents(base_query)

            cursor = self.collection.find(base_query).sort(sort_criteria)

            if limit:
                cursor = cursor.limit(limit)
            else:
                cursor = cursor.skip(skip).limit(per_page)

            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            total_pages = max(1, (total_count + per_page - 1) // per_page) if not limit else 1

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
                'sort': {
                    'field': sort_field,
                    'order': sort_order
                },
                'search': {
                    'term': search_term,
                    'criteria': search_criteria
                }
            }

            logger.info(f"CRUD query executed: {len(data)} records, page {page}/{total_pages}")
            return result

        except Exception as e:
            logger.error(f"Error in CRUD operations: {e}")
            return {
                'data': [],
                'pagination': {
                    'page': 1,
                    'per_page': per_page,
                    'total_count': 0,
                    'total_pages': 1,
                    'has_prev': False,
                    'has_next': False
                },
                'sort': {'field': sort_field, 'order': sort_order},
                'search': {'term': search_term, 'criteria': search_criteria}
            }

    def close_connection(self):
        try:
            if self.mongo_client:
                self.mongo_client.close()
                logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")

    def is_connected(self) -> bool:
        try:
            if self.mongo_client:
                self.mongo_client.admin.command('ping')
                return True
        except:
            pass
        return False

    def search_by_time_range_optimized(self, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        try:
            start_utc = convert_from_vietnam_time(start_time) if start_time.tzinfo else start_time.replace(tzinfo=get_vietnam_timezone())
            end_utc = convert_from_vietnam_time(end_time) if end_time.tzinfo else end_time.replace(tzinfo=get_vietnam_timezone())

            query = {
                "timestamp": {
                    "$gte": start_utc,
                    "$lte": end_utc
                }
            }

            cursor = self.collection.find(query).sort("timestamp", 1)
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

                import re
                time_patterns = [
                    r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$',
                    r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$',
                    r'^(\d{1,2}):(\d{1,2})$',
                    r'^(\d{1,2})/(\d{1,2})/(\d{4})$',
                    r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$'
                ]

                is_time_format = any(re.match(pattern, search_term) for pattern in time_patterns)

                if is_time_format:
                    time_search_data = self.search_by_time_string(search_term)
                    if time_search_data:
                        time_ids = [item['_id'] for item in time_search_data if '_id' in item]
                        query['_id'] = {'$in': time_ids}
                else:
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

            cursor = self.collection.find(query).sort("timestamp", -1)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Multi-criteria search found {len(data)} records")
            return data

        except Exception as e:
            logger.error(f"Multi-criteria search error: {e}")
            return []

    def search_with_pagination_optimized(self, query: Dict[str, Any], page: int = 1, per_page: int = 10,
                                         sort_field: str = "timestamp", sort_order: str = "desc") -> Dict[str, Any]:
        try:
            skip = (page - 1) * per_page

            sort_direction = -1 if sort_order.lower() == "desc" else 1
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

    def search_action_history(self, search_term: str = '', device_filter: str = 'all',
                              state_filter: str = 'all', sort_field: str = 'timestamp',
                              sort_order: str = 'desc', page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        try:
            action_collection = self.db.get_collection('action_history')
            query = {}

            if device_filter and device_filter != 'all':
                query['led'] = {'$regex': f'^{device_filter}$', '$options': 'i'}

            if state_filter and state_filter != 'all':
                if state_filter.lower() == 'on':
                    query['state'] = {'$in': ['ON', 'on', '1', 'true', 'TRUE']}
                elif state_filter.lower() == 'off':
                    query['state'] = {'$in': ['OFF', 'off', '0', 'false', 'FALSE']}

            if search_term:
                import re
                time_patterns = [
                    r'^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$',
                    r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$',
                    r'^(\d{1,2}):(\d{1,2})$',
                    r'^(\d{1,2})/(\d{1,2})/(\d{4})$',
                    r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$'
                ]

                is_time_search = any(re.match(pattern, search_term) for pattern in time_patterns)

                if is_time_search:
                    from app.core.timezone_utils import get_vietnam_timezone, create_vietnam_datetime
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

                    elif re.match(r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$', search_term):
                        parts = search_term.split(':')
                        hour = int(parts[0])
                        minute = int(parts[1])
                        second = int(parts[2])

                        search_datetime = current_time.replace(hour=hour, minute=minute, second=second, microsecond=0)
                        start_time = search_datetime
                        end_time = search_datetime.replace(microsecond=999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}

                    elif re.match(r'^(\d{1,2}):(\d{1,2})$', search_term):
                        parts = search_term.split(':')
                        hour = int(parts[0])
                        minute = int(parts[1])

                        search_datetime = current_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        start_time = search_datetime
                        end_time = search_datetime.replace(second=59, microsecond=999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}

                    elif re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', search_term):
                        parts = search_term.split('/')
                        day = int(parts[0])
                        month = int(parts[1])
                        year = int(parts[2])

                        start_date = create_vietnam_datetime(year, month, day, 0, 0, 0)
                        end_date = create_vietnam_datetime(year, month, day, 23, 59, 59, 999999)
                        query['timestamp'] = {'$gte': convert_from_vietnam_time(start_date), '$lte': convert_from_vietnam_time(end_date)}

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

            sort_direction = -1 if sort_order.lower() == "desc" else 1
            sort_criteria = [(sort_field, sort_direction)]

            skip = (page - 1) * per_page
            total_count = action_collection.count_documents(query)

            cursor = action_collection.find(query).sort(sort_criteria).skip(skip).limit(per_page)
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

    def get_recent_action_history_optimized(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            action_collection = self.db.get_collection('action_history')
            cursor = action_collection.find().sort("timestamp", -1).limit(limit)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Retrieved {len(data)} recent action history records")
            return data

        except Exception as e:
            logger.error(f"Error retrieving action history: {e}")
            return []

    def save_action_history(self, action_data: Dict[str, Any]) -> bool:
        try:
            action_collection = self.db.get_collection('action_history')

            if 'timestamp' in action_data:
                timestamp = action_data['timestamp']
                if hasattr(timestamp, 'utctimetuple'):
                    action_data['timestamp'] = timestamp
                else:
                    from app.core.timezone_utils import convert_to_utc
                    action_data['timestamp'] = convert_to_utc(timestamp)

            result = action_collection.insert_one(action_data)

            if result.inserted_id:
                logger.info(f"Action history saved: {action_data.get('type', 'unknown')} - {action_data.get('led', 'unknown')}")
                return True
            else:
                logger.error("Failed to save action history")
                return False

        except Exception as e:
            logger.error(f"Error saving action history: {e}")
            return False

    def get_latest_led_status(self) -> Dict[str, str]:
        try:
            action_collection = self.db.get_collection('action_history')

            led_states = {'LED1': 'OFF', 'LED2': 'OFF', 'LED3': 'OFF', 'LED4': 'OFF'}

            for led_id in ['LED1', 'LED2', 'LED3', 'LED4']:
                latest_record = action_collection.find_one(
                    {
                        '$or': [
                            {'led': led_id},
                            {'device': led_id},
                            {'action': {'$regex': f'^{led_id}_'}}
                        ]
                    },
                    sort=[('timestamp', -1)]
                )

                if latest_record:
                    state = None
                    if 'state' in latest_record:
                        state = latest_record['state']
                    elif 'action' in latest_record:
                        action = latest_record['action']
                        if '_' in action and action.startswith(led_id):
                            state = action.split('_')[1]

                    if state:
                        state_str = str(state).upper()
                        if state_str in ['ON', '1', 'TRUE']:
                            led_states[led_id] = 'ON'
                        elif state_str in ['OFF', '0', 'FALSE']:
                            led_states[led_id] = 'OFF'

            logger.info(f"Latest LED status retrieved: {led_states}")
            return led_states

        except Exception as e:
            logger.error(f"Error getting latest LED status: {e}")
            return {'LED1': 'OFF', 'LED2': 'OFF', 'LED3': 'OFF', 'LED4': 'OFF'}

    def search_by_time_string(self, time_string: str) -> List[Dict[str, Any]]:
        try:
            import re
            from app.core.timezone_utils import get_vietnam_timezone, create_vietnam_datetime

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

            elif re.match(r'^(\d{1,2}):(\d{1,2}):(\d{1,2})$', time_string):
                parts = time_string.split(':')
                hour = int(parts[0])
                minute = int(parts[1])
                second = int(parts[2])

                search_datetime = current_time.replace(hour=hour, minute=minute, second=second, microsecond=0)
                start_time = search_datetime
                end_time = search_datetime.replace(microsecond=999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}

            elif re.match(r'^(\d{1,2}):(\d{1,2})$', time_string):
                parts = time_string.split(':')
                hour = int(parts[0])
                minute = int(parts[1])

                search_datetime = current_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
                start_time = search_datetime
                end_time = search_datetime.replace(second=59, microsecond=999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}

            elif re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', time_string):
                parts = time_string.split('/')
                day = int(parts[0])
                month = int(parts[1])
                year = int(parts[2])

                start_date = create_vietnam_datetime(year, month, day, 0, 0, 0)
                end_date = create_vietnam_datetime(year, month, day, 23, 59, 59, 999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_date), '$lte': convert_from_vietnam_time(end_date)}

            elif re.match(r'^(\d{1,2}):(\d{1,2})\s+(\d{1,2})/(\d{1,2})/(\d{4})$', time_string):
                parts = time_string.split()
                time_part = parts[0].split(':')
                date_part = parts[1].split('/')

                hour = int(time_part[0])
                minute = int(time_part[1])
                day = int(date_part[0])
                month = int(date_part[1])
                year = int(date_part[2])

                start_time = create_vietnam_datetime(year, month, day, hour, minute, 0)
                end_time = create_vietnam_datetime(year, month, day, hour, minute, 59, 999999)
                query['timestamp'] = {'$gte': convert_from_vietnam_time(start_time), '$lte': convert_from_vietnam_time(end_time)}

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

            cursor = self.collection.find(query).sort("timestamp", -1)
            data = list(cursor)

            data = self._convert_timestamps_to_vietnam(data)

            logger.info(f"Exact time string search found {len(data)} records for: {time_string}")
            return data

        except Exception as e:
            logger.error(f"Time string search error: {e}")
            return []
