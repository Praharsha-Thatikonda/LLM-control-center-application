from flask import Blueprint, jsonify, request
import os
import shutil
from backend.services.dataset_service import DatasetService

bp = Blueprint('datasets', __name__)

DATASET_STORE = os.path.abspath(os.path.join(os.getcwd(), 'data', 'datasets'))
os.makedirs(DATASET_STORE, exist_ok=True)

service = DatasetService(DATASET_STORE)

@bp.route("/", methods=["GET"])
def list_datasets():
    """List all available datasets in the storage."""
    files = []
    for f in os.listdir(DATASET_STORE):
        path = os.path.join(DATASET_STORE, f)
        if os.path.isfile(path):
            stats = os.stat(path)
            files.append({
                "name": f,
                "size": f"{stats.st_size / 1024 / 1024:.2f} MB",
                "created": stats.st_ctime
            })
    return jsonify(files)

@bp.route("/upload", methods=["POST"])
def upload_dataset():
    """Upload a new dataset file."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        filepath = os.path.join(DATASET_STORE, file.filename)
        file.save(filepath)
        return jsonify({"status": "uploaded", "file": file.filename})

@bp.route("/<filename>", methods=["DELETE"])
def delete_dataset(filename):
    """Delete a dataset file."""
    filepath = os.path.join(DATASET_STORE, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({"status": "deleted"})
    return jsonify({"error": "File not found"}), 404

@bp.route("/<filename>/preview", methods=["GET"])
def preview_dataset(filename):
    """Get the first few rows of a dataset."""
    return jsonify(service.get_preview(filename))

@bp.route("/<filename>/stats", methods=["GET"])
def dataset_stats(filename):
    """Get statistical summary of the dataset."""
    return jsonify(service.get_stats(filename))

@bp.route("/<filename>/clean", methods=["POST"])
def clean_dataset(filename):
    """Auto-clean the dataset."""
    data = request.json or {}
    operations = data.get("operations", [{"type": "drop_duplicates"}, {"type": "drop_na"}])
    return jsonify(service.clean_dataset(filename, operations))

@bp.route("/<filename>/split", methods=["POST"])
def split_dataset(filename):
    """Split dataset into train/test sets."""
    data = request.json or {}
    ratio = float(data.get("ratio", 0.8))
    return jsonify(service.split_dataset(filename, ratio))

@bp.route("/<filename>/row", methods=["POST"])
def add_row(filename):
    """Data Entry: Add a new row."""
    data = request.json or {}
    return jsonify(service.add_row(filename, data))

@bp.route("/<filename>/row/<int:index>", methods=["PUT"])
def update_row(filename, index):
    """Data Entry: Update an existing row."""
    data = request.json or {}
    return jsonify(service.update_row(filename, index, data))

@bp.route("/<filename>/query", methods=["POST"])
def run_query(filename):
    """Data Analyst: Run SQL query."""
    data = request.json or {}
    query = data.get("query", f"SELECT * FROM dataset LIMIT 10")
    return jsonify(service.run_sql_query(filename, query))

@bp.route("/<filename>/distribution/<column>", methods=["GET"])
def get_distribution(filename, column):
    """Data Analyst: Get column distribution for charts."""
    return jsonify(service.get_column_distribution(filename, column))

@bp.route("/<filename>/version", methods=["POST"])
def version_dataset(filename):
    """MLOps: Create a versioned copy."""
    data = request.json or {}
    tag = data.get("tag", "snapshot")
    return jsonify(service.version_dataset(filename, tag))

@bp.route("/drift/check", methods=["GET"])
def check_drift():
    """MLOps: Check drift between two files."""
    file_a = request.args.get("file_a")
    file_b = request.args.get("file_b")
    if not file_a or not file_b:
        return jsonify({"error": "Missing file_a or file_b"}), 400
    return jsonify(service.check_drift(file_a, file_b))

@bp.route("/<filename>/transform", methods=["POST"])
def transform_column(filename):
    """Engineer: Apply column transformation."""
    data = request.json or {}
    type = data.get("type")
    col = data.get("column")
    if not type or not col:
        return jsonify({"error": "Missing type or column"}), 400
    return jsonify(service.apply_transform(filename, type, col))

@bp.route("/<filename>/backup", methods=["POST"])
def backup_dataset(filename):
    """DBA: Backup dataset."""
    return jsonify(service.backup_dataset(filename))

@bp.route("/<filename>/schema", methods=["GET"])
def get_schema(filename):
    """Architect: Get deep schema."""
    return jsonify(service.get_schema(filename))

@bp.route("/<filename>/insights", methods=["GET"])
def get_insights(filename):
    """Analyst: Get automated insights."""
    return jsonify(service.get_insights(filename))

@bp.route("/<filename>/train_sim", methods=["POST"])
def train_sim(filename):
    """Scientist: Run simulated training."""
    data = request.json or {}
    target = data.get("target")
    return jsonify(service.simulated_training(filename, target))

@bp.route("/public", methods=["GET"])
def list_public_datasets():
    """Hub: List public datasets."""
    source = request.args.get("source", "all")
    return jsonify(service.get_public_datasets(source))

@bp.route("/cloud/upload", methods=["POST"])
def upload_to_cloud():
    """Hub: Upload local dataset to cloud."""
    data = request.json or {}
    filename = data.get("filename")
    platform = data.get("platform", "NeuroForge Cloud")
    return jsonify(service.upload_to_cloud(filename, platform))

@bp.route("/public/download", methods=["POST"])
def download_public_dataset():
    """Hub: Download a public dataset."""
    data = request.json or {}
    id = data.get("id")
    return jsonify(service.download_public_dataset(id))
    
@bp.route("/<filename>/index", methods=["POST"])
def index_dataset(filename):
    """Index a dataset into the RAG Vector DB."""
    filepath = os.path.join(DATASET_STORE, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        # Simple text reading for now
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # Lazy import to avoid circular dep if any (though unlikely here)
        from backend.engine.rag_engine import rag_engine
        
        # Add to RAG
        # We treat the whole file as one doc for simplicity, 
        # but in a more complex version we'd chunk it.
        # Let's do a simple split by paragraphs for "complexity"
        paragraphs = [p for p in content.split('\n\n') if p.strip()]
        
        count = 0
        for i, p in enumerate(paragraphs):
            if len(p) > 50: # Filter tiny snippets
                rag_engine.add_document(
                    doc_id=f"{filename}_{i}",
                    content=p,
                    metadata={"source": filename, "chunk": i}
                )
                count += 1
                
        return jsonify({"status": "indexed", "chunks_processed": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/<filename>/schema/rename", methods=["POST"])
def rename_column(filename):
    """Architect: Rename a column in schema."""
    data = request.json or {}
    old_name = data.get("old_name")
    new_name = data.get("new_name")
    if not old_name or not new_name:
        return jsonify({"error": "Missing old_name or new_name"}), 400
    return jsonify(service.rename_column(filename, old_name, new_name))

@bp.route("/<filename>/ingest_sim", methods=["POST"])
def simulate_ingest(filename):
    """Real-time: Simulate adding a new row."""
    # This calls generate_synthetic_row from the service
    return jsonify(service.generate_synthetic_row(filename))

@bp.route("/<filename>/download", methods=["GET"])
def download_dataset(filename):
    """Overview: Download dataset."""
    format = request.args.get("format", "csv")
    result = service.download_dataset(filename, format)
    if "error" in result:
        return jsonify(result), 400
    
    # In a real app we'd use send_file, but here we return the path/status 
    # and let the frontend 'download' it or serve it statically.
    # Given the constraint, we will return the info to allow frontend to fetch it.
    # Ideally, we should serve the file.
    # Let's check if we can serve it.
    try:
        from flask import send_file
        return send_file(result['path'], as_attachment=True, download_name=result['file'])
    except Exception as e:
        return jsonify({"error": f"Failed to serve file: {str(e)}"}), 500

@bp.route("/<filename>/utilization", methods=["GET"])
def get_utilization(filename):
    """Utilization: Get usage stats."""
    return jsonify(service.get_utilization(filename))

