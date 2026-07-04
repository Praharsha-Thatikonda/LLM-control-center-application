from flask import Flask, render_template, request
from backend.api.routers import models, training, inference, datasets, prompts, evaluation, monitoring
from backend.database.core import init_db
import os

# Define paths for Flask to match the project structure
CONTEXT_ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(CONTEXT_ROOT), 'frontend')
TEMPLATE_DIR = os.path.join(FRONTEND_DIR, 'templates')
STATIC_DIR = os.path.join(FRONTEND_DIR, 'static')

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)

# Initialize Database
with app.app_context():
    init_db()

# Register Blueprints for API
app.register_blueprint(models.bp, url_prefix="/api/v1/models")
app.register_blueprint(training.bp, url_prefix="/api/v1/training")
app.register_blueprint(inference.bp, url_prefix="/api/v1/chat")
app.register_blueprint(datasets.bp, url_prefix="/api/v1/datasets")
app.register_blueprint(prompts.bp, url_prefix="/api/v1/prompts")
app.register_blueprint(evaluation.bp, url_prefix="/api/v1/evaluation")
app.register_blueprint(monitoring.bp, url_prefix="/api/v1/monitoring")

# --- UI Routes ---
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat")
def chat_page():
    return render_template("chat.html")

@app.route("/models")
def models_page():
    return render_template("models.html")

@app.route("/datasets")
def datasets_page():
    return render_template("datasets.html")

@app.route("/training")
def training_page():
    return render_template("training.html")

@app.route("/workflow")
def workflow_page():
    return render_template("workflow.html")

@app.route("/evaluation")
def evaluation_page():
    return render_template("evaluation.html")

@app.route("/monitoring")
def monitoring_page():
    return render_template("monitoring.html")

@app.route("/blog")
def blog_page():
    return render_template("blog.html")

@app.route("/profile")
def profile_page():
    # Mock User Data context could be passed here
    return render_template("profile.html")

@app.route("/settings")
def settings_page():
    return render_template("settings.html")

@app.route("/help")
def help_page():
    return render_template("help.html")

@app.route("/about")
def about_page():
    return render_template("about.html")

@app.route("/auth/login")
def login_page():
    return render_template("login.html")

@app.route("/auth/register")
def register_page():
    return render_template("register.html")

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template("500.html"), 500

@app.route("/health")
def health_check():
    return {"status": "online", "gpu": "available" if True else "cpu_mode"}

if __name__ == "__main__":
    app.run(debug=True, port=5500)
