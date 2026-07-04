# 🧠 LLM Control Center Application

Welcome to the **LLM Control Center**, a comprehensive web application for managing, training, and interacting with Large Language Models (LLMs). Built with Flask and a powerful backend, this application provides an intuitive interface for model orchestration and MLOps workflows.

---

## ✨ Key Features

- **🗣️ Chat Inference**: Interact with your managed language models directly through the built-in chat UI.
- **📚 Model Management**: Seamlessly browse and manage registered models.
- **🛠️ Training & Fine-Tuning**: Monitor model training processes and configure training runs.
- **📊 Datasets & Prompts**: Manage datasets for fine-tuning and organize system prompts.
- **📈 Evaluation & Monitoring**: Evaluate model performance and monitor API endpoints.
- **⚙️ Configurable**: Settings menu to tweak GPU usage and deployment settings.

---

## 📸 Application Screenshots

Take a look at the Control Center in action:

<div align="center">
  <img src="Pics/Screenshot%202026-07-03%20123559.png" alt="LLM Control Center Screenshot 1" width="400"/>
  <img src="Pics/Screenshot%202026-07-03%20123627.png" alt="LLM Control Center Screenshot 2" width="400"/>
</div>

---

## 🏗️ Architecture

The backend is structured into clear modular components via Flask Blueprints:
- **API Routes**: Versioned API endpoints located at `/api/v1/...`
  - `/models` - Model lifecycle management
  - `/training` - Job scheduling and training hooks
  - `/chat` - Inference endpoints
  - `/datasets` - Dataset uploading and parsing
  - `/prompts` - Prompt template management
  - `/evaluation` & `/monitoring` - Analytics and metrics
- **Frontend**: HTML templates rendered via Flask for easy navigation.

---

## 🚀 Setup & Installation

### 1. Requirements
Ensure you have Python installed. It is highly recommended to use a virtual environment.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```
*Note: Includes dependencies like Flask, PyTorch, Transformers, PEFT, and Accelerate.*

### 3. Run the Application
Start the Flask backend:
```bash
cd backend
python main.py
```
The server will start on port `5500`.

### 4. Access the UI
Open your browser and navigate to:
```
http://127.0.0.1:5500
```

---

## 🌐 Navigating the UI

- **Dashboard**: `/`
- **Chat Interface**: `/chat`
- **Models Directory**: `/models`
- **Dataset Manager**: `/datasets`
- **Training Hub**: `/training`
- **Monitoring & Eval**: `/monitoring` & `/evaluation`
