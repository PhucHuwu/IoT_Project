from flask import request
from flask_restx import Resource, reqparse
from datetime import datetime, timedelta
from app.core.database import DatabaseManager
from app.core.logger_config import logger
from app.core.timezone_utils import get_vietnam_timezone, create_vietnam_datetime
from app.api.swagger_config import (
    nosql_ns, multi_criteria_model, advanced_search_model,
    statistics_model, aggregated_data_model,
    success_response_model, error_response_model
)

db = DatabaseManager()

text_search_parser = reqparse.RequestParser()
text_search_parser.add_argument('q', type=str, required=True)
text_search_parser.add_argument('fields', type=str)

range_search_parser = reqparse.RequestParser()
range_search_parser.add_argument('field', type=str, required=True,
                                 choices=['temperature', 'humidity', 'light'])
range_search_parser.add_argument('min', type=float)
range_search_parser.add_argument('max', type=float)

aggregated_parser = reqparse.RequestParser()
aggregated_parser.add_argument('group_by', type=str, default='hour',
                               choices=['minute', 'hour', 'day'])
aggregated_parser.add_argument('start_date', type=str)
aggregated_parser.add_argument('end_date', type=str)

statistics_parser = reqparse.RequestParser()
statistics_parser.add_argument('start_date', type=str)
statistics_parser.add_argument('end_date', type=str)


@nosql_ns.route('/search/text')
class TextSearchResource(Resource):
    @nosql_ns.expect(text_search_parser)
    @nosql_ns.marshal_with(success_response_model)
    @nosql_ns.doc('search_by_text')
    def get(self):
        try:
            args = text_search_parser.parse_args()
            search_term = args['q']
            fields = args['fields']

            if not search_term:
                nosql_ns.abort(400, message="Search term is required")

            if fields:
                fields = [f.strip() for f in fields.split(',') if f.strip()]

            data = db.search_by_text(search_term, fields)

            for doc in data:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])

            return {
                "status": "success",
                "data": data,
                "count": len(data),
                "search_term": search_term,
                "fields": fields
            }

        except Exception as e:
            logger.error(f"Text search error: {e}")
            nosql_ns.abort(500, message=str(e))


@nosql_ns.route('/search/range')
class RangeSearchResource(Resource):
    @nosql_ns.expect(range_search_parser)
    @nosql_ns.marshal_with(success_response_model)
    @nosql_ns.doc('search_by_range')
    def get(self):
        try:
            args = range_search_parser.parse_args()
            field = args['field']
            min_val = args['min']
            max_val = args['max']

            if field not in ['temperature', 'humidity', 'light']:
                nosql_ns.abort(400, message="Invalid field. Must be temperature, humidity, or light")

            if min_val is None and max_val is None:
                nosql_ns.abort(400, message="At least one of min or max value is required")

            data = db.search_by_numeric_range(field, min_val, max_val)

            for doc in data:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])

            return {
                "status": "success",
                "data": data,
                "count": len(data),
                "field": field,
                "min_value": min_val,
                "max_value": max_val
            }

        except ValueError as e:
            nosql_ns.abort(400, message="Invalid numeric value")
        except Exception as e:
            logger.error(f"Range search error: {e}")
            nosql_ns.abort(500, message=str(e))


@nosql_ns.route('/search/multi-criteria')
class MultiCriteriaSearchResource(Resource):
    @nosql_ns.expect(multi_criteria_model)
    @nosql_ns.marshal_with(success_response_model)
    @nosql_ns.doc('search_by_multiple_criteria')
    def post(self):
        try:
            criteria = request.get_json() or {}

            if 'start_date' in criteria and 'end_date' in criteria:
                try:
                    start_date = datetime.strptime(criteria['start_date'], '%Y-%m-%d')
                    end_date = datetime.strptime(criteria['end_date'], '%Y-%m-%d')

                    criteria['start_time'] = create_vietnam_datetime(
                        start_date.year, start_date.month, start_date.day, 0, 0, 0
                    )
                    criteria['end_time'] = create_vietnam_datetime(
                        end_date.year, end_date.month, end_date.day, 23, 59, 59
                    )
                except ValueError:
                    nosql_ns.abort(400, message="Invalid date format. Use YYYY-MM-DD")

            data = db.search_by_multiple_criteria(criteria)

            for doc in data:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])

            return {
                "status": "success",
                "data": data,
                "count": len(data),
                "criteria": criteria
            }

        except Exception as e:
            logger.error(f"Multi-criteria search error: {e}")
            nosql_ns.abort(500, message=str(e))


@nosql_ns.route('/aggregated')
class AggregatedDataResource(Resource):
    @nosql_ns.expect(aggregated_parser)
    @nosql_ns.marshal_with(success_response_model)
    @nosql_ns.doc('get_aggregated_data')
    def get(self):
        try:
            args = aggregated_parser.parse_args()
            group_by = args['group_by']
            start_date = args['start_date']
            end_date = args['end_date']

            if group_by not in ['minute', 'hour', 'day']:
                nosql_ns.abort(400, message="Invalid group_by. Must be minute, hour, or day")

            time_range = None
            if start_date and end_date:
                try:
                    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                    end_dt = datetime.strptime(end_date, '%Y-%m-%d')

                    time_range = {
                        'start_time': create_vietnam_datetime(
                            start_dt.year, start_dt.month, start_dt.day, 0, 0, 0
                        ),
                        'end_time': create_vietnam_datetime(
                            end_dt.year, end_dt.month, end_dt.day, 23, 59, 59
                        )
                    }
                except ValueError:
                    nosql_ns.abort(400, message="Invalid date format. Use YYYY-MM-DD")

            data = db.get_aggregated_data(group_by, time_range)

            return {
                "status": "success",
                "data": data,
                "count": len(data),
                "group_by": group_by,
                "time_range": {
                    "start_date": start_date,
                    "end_date": end_date
                } if time_range else None
            }

        except Exception as e:
            logger.error(f"Aggregated data error: {e}")
            nosql_ns.abort(500, message=str(e))


@nosql_ns.route('/statistics')
class StatisticsResource(Resource):
    @nosql_ns.expect(statistics_parser)
    @nosql_ns.marshal_with(statistics_model)
    @nosql_ns.doc('get_statistics')
    def get(self):
        try:
            args = statistics_parser.parse_args()
            start_date = args['start_date']
            end_date = args['end_date']

            time_range = None
            if start_date and end_date:
                try:
                    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                    end_dt = datetime.strptime(end_date, '%Y-%m-%d')

                    time_range = {
                        'start_time': create_vietnam_datetime(
                            start_dt.year, start_dt.month, start_dt.day, 0, 0, 0
                        ),
                        'end_time': create_vietnam_datetime(
                            end_dt.year, end_dt.month, end_dt.day, 23, 59, 59
                        )
                    }
                except ValueError:
                    nosql_ns.abort(400, message="Invalid date format. Use YYYY-MM-DD")

            stats = db.get_statistics(time_range)

            return {
                "status": "success",
                "data": stats,
                "time_range": {
                    "start_date": start_date,
                    "end_date": end_date
                } if time_range else None
            }

        except Exception as e:
            logger.error(f"Statistics error: {e}")
            nosql_ns.abort(500, message=str(e))


@nosql_ns.route('/search/advanced')
class AdvancedSearchResource(Resource):
    @nosql_ns.expect(advanced_search_model)
    @nosql_ns.marshal_with(success_response_model)
    @nosql_ns.doc('advanced_search')
    def post(self):
        try:
            search_params = request.get_json() or {}

            query = search_params.get('query', {})
            page = int(search_params.get('page', 1))
            per_page = int(search_params.get('per_page', 10))
            sort_field = search_params.get('sort_field', 'timestamp')
            sort_order = search_params.get('sort_order', 'desc')

            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 10

            if sort_order not in ['asc', 'desc']:
                sort_order = 'desc'
            if sort_field not in ['timestamp', 'temperature', 'humidity', 'light']:
                sort_field = 'timestamp'

            if 'start_time' in query and 'end_time' in query:
                try:
                    start_dt = datetime.fromisoformat(query['start_time'].replace('Z', '+00:00'))
                    end_dt = datetime.fromisoformat(query['end_time'].replace('Z', '+00:00'))
                    query['start_time'] = start_dt
                    query['end_time'] = end_dt
                except ValueError:
                    pass

            result = db.search_with_pagination_optimized(query, page, per_page, sort_field, sort_order)

            for doc in result['data']:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])

            return {
                "status": "success",
                "data": result['data'],
                "pagination": result['pagination'],
                "sort": {
                    "field": sort_field,
                    "order": sort_order
                },
                "query": query
            }

        except Exception as e:
            logger.error(f"Advanced search error: {e}")
            nosql_ns.abort(500, message=str(e))
