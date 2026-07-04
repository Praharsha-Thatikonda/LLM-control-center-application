from flask import Blueprint, jsonify, request
from backend.database.core import get_db

bp = Blueprint('prompts', __name__)

@bp.route("/", methods=["GET"])
def list_prompts():
    conn = get_db()
    prompts = conn.execute('SELECT * FROM prompts').fetchall()
    conn.close()
    return jsonify([dict(p) for p in prompts])

@bp.route("/", methods=["POST"])
def create_prompt():
    data = request.get_json()
    name = data.get("name")
    content = data.get("content")
    tags = data.get("tags", "")
    
    conn = get_db()
    cursor = conn.execute('INSERT INTO prompts (name, content, tags) VALUES (?, ?, ?)', 
                          (name, content, tags))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"id": new_id, "status": "created"})

@bp.route("/<int:prompt_id>", methods=["DELETE"])
def delete_prompt(prompt_id):
    conn = get_db()
    conn.execute('DELETE FROM prompts WHERE id = ?', (prompt_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})
