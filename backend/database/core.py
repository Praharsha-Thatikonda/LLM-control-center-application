import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'neuroforge.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    # Models Table
    c.execute('''CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        size TEXT,
        format TEXT,
        source TEXT,
        tags TEXT
    )''')
    
    # Prompts Table (VS Code Toolkit feature: Prompt Library)
    c.execute('''CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT
    )''')
    
    # Chat History
    c.execute('''CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    # Evaluation Tables
    c.execute('''CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dataset_id TEXT,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS evaluation_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluation_id TEXT,
        model_id TEXT,
        prompt TEXT,
        response TEXT,
        metrics TEXT, -- JSON string
        FOREIGN KEY(evaluation_id) REFERENCES evaluations(id)
    )''')

    # Monitoring Tables
    c.execute('''CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        trace_id TEXT,
        span_id TEXT,
        parent_span_id TEXT,
        operation_name TEXT,
        start_time DATETIME,
        end_time DATETIME,
        attributes TEXT -- JSON string
    )''')
    
    # Seed Data if empty
    c.execute('SELECT count(*) FROM models')
    if c.fetchone()[0] == 0:
        seed_models = [
            ("llama-3-8b-instruct", "Llama 3 8B", "5.2GB", "gguf", "local", "instruction,meta"),
            ("mistral-7b-v0.3", "Mistral 7B", "14GB", "safetensors", "local", "completion,mistral"),
            ("ollama-llama3", "llama3:latest", "4.7GB", "ollama", "ollama", "meta,ollama")
        ]
        c.executemany('INSERT INTO models VALUES (?,?,?,?,?,?)', seed_models)
        
        seed_prompts = [
            ("General Assistant", "You are a helpful AI assistant.", "general"),
            ("Code Expert", "You are an expert software engineer. Provide clean, efficient code.", "coding"),
            ("Creative Writer", "You are a creative writer. Use vivid imagery.", "creative")
        ]
        c.executemany('INSERT INTO prompts (name, content, tags) VALUES (?,?,?)', seed_prompts)

    conn.commit()
    conn.close()
