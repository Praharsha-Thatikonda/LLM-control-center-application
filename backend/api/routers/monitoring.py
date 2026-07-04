from flask import Blueprint, jsonify, request
from backend.database.core import get_db
import uuid
import datetime

bp = Blueprint('monitoring', __name__)

@bp.route("/traces", methods=["GET"])
def list_traces():
    conn = get_db()
    traces = conn.execute('SELECT * FROM traces ORDER BY start_time DESC LIMIT 50').fetchall()
    conn.close()
    return jsonify([dict(t) for t in traces])

@bp.route("/traces", methods=["POST"])
def ingest_trace():
    # Endpoint to receive traces from the application or agent
    data = request.get_json()
    trace_id = data.get("trace_id", str(uuid.uuid4()))
    span_id = data.get("span_id", str(uuid.uuid4()))
    op_name = data.get("operation_name", "unknown")
    start = data.get("start_time", datetime.datetime.utcnow().isoformat())
    end = data.get("end_time")
    attrs = data.get("attributes", "{}")
    
    conn = get_db()
    conn.execute('''INSERT INTO traces (id, trace_id, span_id, operation_name, start_time, end_time, attributes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)''',
                 (str(uuid.uuid4()), trace_id, span_id, op_name, start, end, str(attrs)))
    conn.commit()
    conn.close()
    return jsonify({"status": "recorded"})
