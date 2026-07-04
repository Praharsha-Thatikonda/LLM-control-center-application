from flask import Blueprint, jsonify, request
from backend.database.core import get_db
import uuid
import json

bp = Blueprint('evaluation', __name__)

@bp.route("/", methods=["GET"])
def list_evaluations():
    conn = get_db()
    evals = conn.execute('SELECT * FROM evaluations ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(e) for e in evals])

@bp.route("/run", methods=["POST"])
def run_evaluation():
    data = request.get_json()
    name = data.get("name", "Untitled Run")
    dataset_id = data.get("dataset_id")
    model_ids = data.get("model_ids", [])
    
    # Create Evaluation Record
    eval_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute('INSERT INTO evaluations (id, name, dataset_id, status) VALUES (?, ?, ?, ?)',
                 (eval_id, name, dataset_id, "running"))
    
    # Mock Background Job: Generate mock results immediately for demo
    for model_id in model_ids:
        # Mock Result
        conn.execute('''INSERT INTO evaluation_results (evaluation_id, model_id, prompt, response, metrics)
                        VALUES (?, ?, ?, ?, ?)''',
                     (eval_id, model_id, "Why is the sky blue?", "Rayleigh scattering...", 
                      json.dumps({"f1": 0.9, "coherence": 0.95})))
    
    conn.execute('UPDATE evaluations SET status = ? WHERE id = ?', ("completed", eval_id))
    conn.commit()
    conn.close()
    
    return jsonify({"id": eval_id, "status": "completed"})

@bp.route("/<eval_id>/results", methods=["GET"])
def get_evaluation_results(eval_id):
    conn = get_db()
    results = conn.execute('SELECT * FROM evaluation_results WHERE evaluation_id = ?', (eval_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in results])
