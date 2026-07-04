from flask import Blueprint, jsonify, request
from typing import List, Optional
import time
from backend.database.core import get_db

bp = Blueprint('models', __name__)

# --- Database Integration ---
@bp.route("/", methods=["GET"])
def list_models():
    """List all locally available models from DB."""
    conn = get_db()
    models = conn.execute('SELECT * FROM models').fetchall()
    conn.close()
    
    # Convert row objects to dict
    results = []
    for m in models:
        results.append({
            "id": m["id"],
            "name": m["name"],
            "size": m["size"],
            "format": m["format"],
            "source": m["source"],
            "tags": m["tags"].split(",") if m["tags"] else []
        })
    return jsonify(results)

# Mock Ollama Data (Keep as mock for external API simulation or integrate if preferred)
# For now, let's allow the DB to allow "Ollama" source models too.

OLLAMA_LIBRARY = [
    {"name": "llama3", "description": "Meta's Llama 3 models", "pulls": "1M+", "tags": ["facebook", "meta"]},
    {"name": "mistral", "description": "Mistral 7B is a 7B parameter model", "pulls": "5M+", "tags": ["mistral"]},
    {"name": "gemma", "description": "Gemma is a family of lightweight, state-of-the-art open models", "pulls": "500k+", "tags": ["google"]}
]

# Mock HF Data
HF_SEARCH_RESULTS = [
    {"id": "meta-llama/Meta-Llama-3-8B", "name": "Meta-Llama-3-8B", "likes": 15000, "downloads": "2M", "task": "Text Generation"},
    {"id": "microsoft/Phi-3-mini-4k-instruct", "name": "Phi-3-mini-4k-instruct", "likes": 8000, "downloads": "500k", "task": "Text Generation"},
    {"id": "databricks/dbrx-instruct", "name": "dbrx-instruct", "likes": 4000, "downloads": "100k", "task": "Text Generation"}
]

@bp.route("/download", methods=["POST"])
def download_model():
    """Trigger a background download of a model from HuggingFace."""
    data = request.get_json()
    repo_id = data.get("repo_id")
    # Logic to call ModelLoader.download_model would go here
    return jsonify({"status": "download_started", "job_id": "dl_" + str(int(time.time())), "repo": repo_id})

@bp.route("/<model_id>", methods=["DELETE"])
def delete_model(model_id):
    conn = get_db()
    conn.execute('DELETE FROM models WHERE id = ?', (model_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted", "id": model_id})

# --- Ollama Endpoints ---
@bp.route("/ollama", methods=["GET"])
def list_ollama():
    # Fetch only ollama source from DB or keep mock? 
    # Let's use the DB as the source of truth for "Installed" models
    conn = get_db()
    models = conn.execute('SELECT * FROM models WHERE source = "ollama"').fetchall()
    conn.close()
    
    results = []
    for m in models:
        results.append({
            "id": m["id"],
            "name": m["name"],
            "size": m["size"],
            "modified": "Recently" 
        })
    return jsonify(results)

@bp.route("/ollama/library", methods=["GET"])
def search_ollama():
    query = request.args.get("q", "").lower()
    if query:
        return jsonify([m for m in OLLAMA_LIBRARY if query in m["name"].lower()])
    return jsonify(OLLAMA_LIBRARY)

@bp.route("/ollama/pull", methods=["POST"])
def pull_ollama():
    data = request.get_json()
    model_name = data.get("name")
    
    # Mock: Add to DB as "installed"
    conn = get_db()
    existing = conn.execute('SELECT 1 FROM models WHERE name = ?', (model_name + ":latest",)).fetchone()
    if not existing:
        conn.execute('INSERT INTO models (id, name, size, format, source, tags) VALUES (?, ?, ?, ?, ?, ?)',
                     (f"ollama-{int(time.time())}", f"{model_name}:latest", "Unknown", "ollama", "ollama", "ollama"))
        conn.commit()
    conn.close()
    
    return jsonify({"status": "pulling", "job_id": "pull_" + str(int(time.time())), "model": model_name})

# --- HF Endpoints ---
@bp.route("/hf/search", methods=["GET"])
def search_hf():
    query = request.args.get("q", "").lower()
    if query:
        return jsonify([m for m in HF_SEARCH_RESULTS if query in m["name"].lower() or query in m["id"].lower()])
    return jsonify(HF_SEARCH_RESULTS)

# --- New Features: Creation, Upload, Control ---

@bp.route("/create", methods=["POST"])
def create_model():
    """Create a new model definition (Architecture/Config)."""
    data = request.json or {}
    name = data.get("name")
    arch = data.get("architecture", "Unknown")
    
    conn = get_db()
    try:
        # Check uniqueness
        exists = conn.execute("SELECT 1 FROM models WHERE name = ?", (name,)).fetchone()
        if exists:
            return jsonify({"error": "Model name already exists"}), 400
            
        new_id = f"custom-{int(time.time())}"
        conn.execute(
            'INSERT INTO models (id, name, size, format, source, tags) VALUES (?, ?, ?, ?, ?, ?)',
            (new_id, name, "0B", "config", "custom", arch)
        )
        conn.commit()
        return jsonify({"status": "success", "id": new_id, "message": "Model scaffold created."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@bp.route("/upload", methods=["POST"])
def upload_local_model():
    """Mock upload of a model file from user's machine."""
    # In a real app, this would handle multipart/form-data
    # For now, we simulate receiving a file and registering it.
    file_name = request.args.get("name", "uploaded-model.gguf")
    size = request.args.get("size", "2GB")
    
    conn = get_db()
    new_id = f"local-{int(time.time())}"
    conn.execute(
        'INSERT INTO models (id, name, size, format, source, tags) VALUES (?, ?, ?, ?, ?, ?)',
        (new_id, file_name, size, "GGUF", "local", "uploaded")
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "id": new_id})

@bp.route("/cloud/upload", methods=["POST"])
def upload_to_cloud():
    """Mock push to cloud."""
    data = request.json or {}
    return jsonify({"status": "success", "cloud_id": f"nf-cloud/{data.get('model_id')}"})

# --- Control Panel Mock State ---
ACTIVE_MODEL = {"id": None, "name": None, "status": "idle", "vram_usage": 0}

@bp.route("/control/status", methods=["GET"])
def get_control_status():
    """Get status of the running model engine."""
    import random
    # Simulate VRAM flake
    if ACTIVE_MODEL["status"] == "running":
        ACTIVE_MODEL["vram_usage"] = random.randint(4000, 8000)
    else:
        ACTIVE_MODEL["vram_usage"] = 0
        
    return jsonify({
        "active_model": ACTIVE_MODEL,
        "system_vram_total": 24576, # 24GB
        "system_ram_usage": random.randint(10, 40)
    })

@bp.route("/control/load", methods=["POST"])
def load_model():
    data = request.json or {}
    model_id = data.get("id")
    
    # Simulate load time
    time.sleep(1)
    ACTIVE_MODEL["id"] = model_id
    ACTIVE_MODEL["name"] = data.get("name", "Model")
    ACTIVE_MODEL["status"] = "running"
    return jsonify({"status": "loaded", "config": ACTIVE_MODEL})

@bp.route("/control/unload", methods=["POST"])
def unload_model():
    ACTIVE_MODEL["id"] = None
    ACTIVE_MODEL["name"] = None
    ACTIVE_MODEL["status"] = "idle"
    return jsonify({"status": "unloaded"})
