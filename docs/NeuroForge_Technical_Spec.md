# NeuroForge Technical Specification and Implementation Plan

## 1. Executive Summary
NeuroForge is a desktop/web-hybrid application designed to democratize the entire lifecycle of Large Language Models (LLMs). Unlike simple inference runners (like Ollama), NeuroForge provides a comprehensive suite for Architecture Design, Training, Fine-tuning, Dataset Management, and Serving. It is built as a proprietary engine using Python and native libraries.

## 2. Technology Stack

### Backend & AI Engine
- **Language**: Python 3.11+
- **Web Framework**: Flask (or Django) - Serves both the API and the UI Templates.
- **ML Engine**: PyTorch & TensorFlow (Pluggable backend).
- **Inference Optimization**: Integration with `llama.cpp` and `CTransformers`.
- **Database**: 
    - **Metadata**: PostgreSQL (SQLAlchemy ORM)
    - **Vector Storage**: ChromaDB or FAISS.

### Frontend & UI
- **Technology**: Vanilla HTML, CSS, and JavaScript.
- **Templating**: Jinja2 (server-side rendering via Flask).
- **Styling**: Custom CSS (No Tailwind).
- **Visualization**: Chart.js for training metrics.


## 3. Architecture & Core Modules

### Module A: The Model Hub (Registry & Organization)
- **Responsibility**: File-system scanning, indexing, and organizing of model weights (`.gguf`, `.bin`, `.safetensors`).
- **Integration**: `huggingface_hub` library for searching and downloading.
- **Versioning**: Hashing (SHA256) to track model versions and quantization levels.

### Module B: The "Architect" (Model Design & Building)
- **Responsibility**: Visual node-based editor for defining model architectures.
- **Data Model**: Directed Acyclic Graph (DAG) representing layers.
- **Output**: Generates PyTorch `nn.Module` code dynamically.

### Module C: The "Refinery" (Preprocessing & Training)
- **Responsibility**: Dataset management and training execution.
- **Components**:
    - **Data Pipeline**: Text cleaning, tokenization preview, splitting.
    - **Trainer**: Custom training loop supporting LoRA/QLoRA (using `peft`), Mixed Precision (`torch.cuda.amp` or `bitsandbytes`).
    - **Monitoring**: Websocket streams for loss/accuracy and hardware stats.

### Module D: The Inference Engine
- **Responsibility**: High-performance chat and API serving.
- **Features**: 
    - OpenAI-compatible `v1/chat/completions` endpoint.
    - Dynamic hardware offloading (CPU/GPU split).

## 4. API Schema Definition
The backend exposes a RESTful API via FastAPI.

### Endpoints

#### Model Management
- `GET /v1/models` - List available models (Local & Hub).
- `POST /v1/models/download` - Trigger a model download from HF.
- `DELETE /v1/models/{model_id}` - Delete a model.

#### Training
- `POST /v1/training/jobs` - Create a new training job (config, dataset, model).
- `POST /v1/training/jobs/{job_id}/start` - Start the training loop.
- `POST /v1/training/jobs/{job_id}/stop` - Interrupt training.
- `GET /v1/training/jobs/{job_id}/metrics` - Stream real-time metrics (WebSocket preferred).

#### Inference (OpenAI Compatible)
- `POST /v1/chat/completions` - Standard chat completion.
    - Body: `{model: str, messages: List[dict], temperature: float, ...}`
- `POST /v1/completions` - Text completion.

#### System
- `GET /health` - System health (GPU, RAM, Disk).

## 5. UI/UX Design Specifications
**Theme**: "Clean Professional" (Light Mode)
- **Background**: White (`#ffffff`) or Off-White (`#f8f9fa`).
- **Text**: Dark Slate (`#2d3748`) for readability.
- **Accents**: 
    - Primary: Soft Blue (`#3182ce`) for actions.
    - Active/AI: Royal Purple (`#805ad5`).
- **Typography**: Inter or Roboto (System Fonts).

**Layout**:
- **Sidebar**: Light gray background, dark icons + labels.
- **Top Bar**: Clean white header, status indicators.
- **Main Area**: Card-based layout with soft shadows.

### Dashboard Mockup Description
- **Header**: "NeuroForge" (Dark Text) with status pills.
- **Widgets**:
    - **VRAM Gauge**: Smooth circular chart (Blue).
    - **Active Model Card**: White card with soft shadow, showcasing "Llama-3-8B".
    - **Recent Jobs**: Table with light headers and zebra striping.

## 6. Project Directory Structure
```
/ (Root)
├── backend
│   ├── api
│   │   ├── routers       # Flask Blueprints
│   │   └── schemas       # Data validation
│   ├── core              # Config, DB, Logging
│   ├── engine
│   │   ├── models        # Model definitions
│   │   ├── training      # Training loops
│   │   └── inference     # Inference engines
│   └── main.py           # Flask App Entry
├── frontend
│   ├── templates         # Jinja2 HTML Templates
│   │   └── index.html
│   └── static            # CSS, JS, Images
│       └── css
│           └── style.css
├── data
│   ├── models            # Model storage path
│   ├── datasets          # Dataset storage
│   └── vector_db         # ChromaDB persistence
└── docs                  # Documentation
```

## 7. Getting Started

### Prerequisites
- Python 3.11+
- Git

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application
To start the Flask development server:

```bash
python -m backend.main
```

The application will be available at `http://localhost:5500`.

