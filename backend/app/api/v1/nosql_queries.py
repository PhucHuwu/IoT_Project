from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from app.core.database import DatabaseManager
from app.core.logger_config import logger
from app.core.timezone_utils import get_vietnam_timezone, create_vietnam_datetime

nosql_bp = Blueprint('nosql_queries', __name__)
db = DatabaseManager()


@nosql_bp.route("/search/text")
def search_by_text():
    try:
        search_term = request.args.get('q', '')
        fields = request.args.get('fields', '').split(',') if request.args.get('fields') else None

        if not search_term:
            return jsonify({
                "status": "error",
                "message": "Search term is required",
                "data": []
            }), 400

        if fields:
            fields = [f.strip() for f in fields if f.strip()]

        data = db.search_by_text(search_term, fields)

        for doc in data:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])

        return jsonify({
            "status": "success",
            "data": data,
            "count": len(data),
            "search_term": search_term,
            "fields": fields
        })

    except Exception as e:
        logger.error(f"Text search error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@nosql_bp.route("/search/range")
def search_by_range():
    try:
        field = request.args.get('field', 'temperature')
        min_val = request.args.get('min', None)
        max_val = request.args.get('max', None)

        if field not in ['temperature', 'humidity', 'light']:
            return jsonify({
                "status": "error",
                "message": "Invalid field. Must be temperature, humidity, or light",
                "data": []
            }), 400

        min_val = float(min_val) if min_val else None
        max_val = float(max_val) if max_val else None

        if min_val is None and max_val is None:
            return jsonify({
                "status": "error",
                "message": "At least one of min or max value is required",
                "data": []
            }), 400

        data = db.search_by_numeric_range(field, min_val, max_val)

        for doc in data:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])

        return jsonify({
            "status": "success",
            "data": data,
            "count": len(data),
            "field": field,
            "min_value": min_val,
            "max_value": max_val
        })

    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": "Invalid numeric value",
            "data": []
        }), 400
    except Exception as e:
        logger.error(f"Range search error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@nosql_bp.route("/search/multi-criteria", methods=['POST'])
def search_by_multiple_criteria():
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
                return jsonify({
                    "status": "error",
                    "message": "Invalid date format. Use YYYY-MM-DD",
                    "data": []
                }), 400

        data = db.search_by_multiple_criteria(criteria)

        for doc in data:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])

        return jsonify({
            "status": "success",
            "data": data,
            "count": len(data),
            "criteria": criteria
        })

    except Exception as e:
        logger.error(f"Multi-criteria search error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@nosql_bp.route("/aggregated")
def get_aggregated_data():
    try:
        group_by = request.args.get('group_by', 'hour')
        start_date = request.args.get('start_date', None)
        end_date = request.args.get('end_date', None)

        if group_by not in ['minute', 'hour', 'day']:
            return jsonify({
                "status": "error",
                "message": "Invalid group_by. Must be minute, hour, or day",
                "data": []
            }), 400

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
                return jsonify({
                    "status": "error",
                    "message": "Invalid date format. Use YYYY-MM-DD",
                    "data": []
                }), 400

        data = db.get_aggregated_data(group_by, time_range)

        return jsonify({
            "status": "success",
            "data": data,
            "count": len(data),
            "group_by": group_by,
            "time_range": {
                "start_date": start_date,
                "end_date": end_date
            } if time_range else None
        })

    except Exception as e:
        logger.error(f"Aggregated data error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500


@nosql_bp.route("/statistics")
def get_statistics():
    try:
        start_date = request.args.get('start_date', None)
        end_date = request.args.get('end_date', None)

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
                return jsonify({
                    "status": "error",
                    "message": "Invalid date format. Use YYYY-MM-DD",
                    "data": {}
                }), 400

        stats = db.get_statistics(time_range)

        return jsonify({
            "status": "success",
            "data": stats,
            "time_range": {
                "start_date": start_date,
                "end_date": end_date
            } if time_range else None
        })

    except Exception as e:
        logger.error(f"Statistics error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": {}
        }), 500


@nosql_bp.route("/search/advanced", methods=['POST'])
def advanced_search():
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

        return jsonify({
            "status": "success",
            "data": result['data'],
            "pagination": result['pagination'],
            "sort": {
                "field": sort_field,
                "order": sort_order
            },
            "query": query
        })

    except Exception as e:
        logger.error(f"Advanced search error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "data": []
        }), 500
