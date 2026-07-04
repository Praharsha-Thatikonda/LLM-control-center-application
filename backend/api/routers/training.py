from flask import Blueprint, jsonify, request
import time
import random

bp = Blueprint('training', __name__)

# Mock Data Store
JOBS = []
CHECKPOINTS = [
    {"id": "ckpt_v1_epoch1", "name": "Llama3-8B-v0.1-e1", "created": "2024-05-20 10:00", "loss": 2.45},
    {"id": "ckpt_v1_epoch2", "name": "Llama3-8B-v0.1-e2", "created": "2024-05-20 12:30", "loss": 1.98}
]
HISTORY = [
    {"id": "run_101", "model": "Llama-3-8B", "dataset": "financial_reports", "status": "Completed", "duration": "4h 20m", "final_loss": 1.8},
    {"id": "run_102", "model": "Mistral-7B", "dataset": "medical_corpus", "status": "Failed", "duration": "10m", "final_loss": 5.4}
]

ACTIVE_JOB = {"status": "idle", "id": None}

@bp.route("/jobs", methods=["POST"])
def create_training_job():
    """Create a new training job."""
    data = request.get_json()
    job_id = f"job_{int(time.time())}"
    
    new_job = {
        "id": job_id,
        "config": data,
        "status": "created",
        "created_at": time.ctime()
    }
    JOBS.append(new_job)
    return jsonify({"status": "created", "job_id": job_id})

@bp.route("/jobs/<job_id>/start", methods=["POST"])
def start_training(job_id):
    """Start the training loop."""
    ACTIVE_JOB["status"] = "running"
    ACTIVE_JOB["id"] = job_id
    return jsonify({"status": "started", "job_id": job_id})

@bp.route("/jobs/stop", methods=["POST"])
def stop_training():
    """Stop the current training loop."""
    ACTIVE_JOB["status"] = "stopped"
    ACTIVE_JOB["id"] = None
    return jsonify({"status": "stopped"})

@bp.route("/checkpoints", methods=["GET"])
def list_checkpoints():
    """List available checkpoints."""
    return jsonify(CHECKPOINTS)

@bp.route("/history", methods=["GET"])
def list_history():
    """List past training runs."""
    return jsonify(HISTORY)

@bp.route("/metrics", methods=["GET"])
def get_metrics():
    """Get real-time system metrics (mocked)."""
    # Simulate realistic fluctuation
    gpu_util = 0
    vram_used = 2 # Idle 2GB
    if ACTIVE_JOB["status"] == "running":
        gpu_util = random.randint(80, 99)
        vram_used = random.randint(18, 22) # high usage
    
    return jsonify({
        "gpu_utilization": gpu_util,
        "vram_usage": vram_used,
        "vram_total": 24, # 24GB
        "cpu_utilization": random.randint(10, 40),
        "ram_usage": random.randint(8, 16)
    })
