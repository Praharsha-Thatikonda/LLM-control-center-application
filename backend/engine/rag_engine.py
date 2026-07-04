
import os
import json
import torch
import numpy as np
from typing import List, Dict, Any
from transformers import AutoTokenizer, AutoModel

class RAGEngine:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", persistence_dir: str = "data/vector_db"):
        self.model_name = model_name
        self.persistence_dir = persistence_dir
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Ensure persistence directory exists
        os.makedirs(self.persistence_dir, exist_ok=True)
        
        self.index_file = os.path.join(self.persistence_dir, "index.json")
        self.vectors_file = os.path.join(self.persistence_dir, "vectors.npy")
        
        # Load index if exists
        self.documents = []
        self.embeddings = None
        # self._load_index() # Lazy load on first request to avoid slow startup

    def _load_model(self):
        if self.model is None:
            print(f"Loading RAG model: {self.model_name}")
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModel.from_pretrained(self.model_name).to(self.device)
            except Exception as e:
                print(f"Failed to load RAG model: {e}")
                # Fallback to absolute basics if HF fails? 
                # For now let's hope it works or user has cached models.
                raise e

    def _mean_pooling(self, model_output, attention_mask):
        token_embeddings = model_output[0] 
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

    def encode(self, texts: List[str]) -> np.ndarray:
        self._load_model()
        encoded_input = self.tokenizer(texts, padding=True, truncation=True, return_tensors='pt').to(self.device)
        
        with torch.no_grad():
            model_output = self.model(**encoded_input)
        
        sentence_embeddings = self._mean_pooling(model_output, encoded_input['attention_mask'])
        # Normalize embeddings
        sentence_embeddings = torch.nn.functional.normalize(sentence_embeddings, p=2, dim=1)
        return sentence_embeddings.cpu().numpy()

    def add_document(self, doc_id: str, content: str, metadata: Dict[str, Any] = None):
        # 1. Encode content
        # Break content into chunks if needed, for now treat as one chunk
        vec = self.encode([content])[0]
        
        # 2. Update in-memory
        doc_entry = {
            "id": doc_id,
            "content": content,
            "metadata": metadata or {}
        }
        
        # Check if we need to initialize embeddings array
        if self.embeddings is None:
            # Try loading first
            if not self._load_index():
                self.embeddings = np.array([vec])
                self.documents = [doc_entry]
            else:
                self.embeddings = np.vstack([self.embeddings, vec])
                self.documents.append(doc_entry)
        else:
            self.embeddings = np.vstack([self.embeddings, vec])
            self.documents.append(doc_entry)
            
        # 3. Save
        self._save_index()

    def search(self, query: str, k: int = 3) -> List[Dict]:
        if self.embeddings is None:
            if not self._load_index():
                return []
        
        query_vec = self.encode([query])[0]
        
        # Cosine similarity (since normalized)
        scores = np.dot(self.embeddings, query_vec)
        
        # Get top k
        top_k_indices = np.argsort(scores)[::-1][:k]
        
        results = []
        for idx in top_k_indices:
            results.append({
                "score": float(scores[idx]),
                "document": self.documents[idx]
            })
        
        return results

    def _save_index(self):
        with open(self.index_file, 'w') as f:
            json.dump(self.documents, f)
        np.save(self.vectors_file, self.embeddings)

    def _load_index(self) -> bool:
        if os.path.exists(self.index_file) and os.path.exists(self.vectors_file):
            with open(self.index_file, 'r') as f:
                self.documents = json.load(f)
            self.embeddings = np.load(self.vectors_file)
            return True
        return False
        
# Singleton instance
rag_engine = RAGEngine()
