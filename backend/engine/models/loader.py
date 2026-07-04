import os
import torch
from typing import Optional, Union, Dict, Any
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from huggingface_hub import snapshot_download

class ModelLoader:
    """
    Responsible for loading models into memory for either Training or Inference.
    Supports:
    - Hugging Face Transformers (SafeTensors/Bin)
    - GGUF (via optional integration, strictly file management here)
    """

    def __init__(self, model_storage_path: str = "data/models"):
        self.storage_path = model_storage_path
        os.makedirs(self.storage_path, exist_ok=True)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    async def download_model(self, repo_id: str, filename: Optional[str] = None):
        """
        Downloads a model from HuggingFace to the local storage.
        """
        print(f"Downloading {repo_id}...")
        try:
            # For GGUF, we might only want specific files
            if filename and filename.endswith(".gguf"):
                path = snapshot_download(repo_id=repo_id, allow_patterns=[filename], local_dir=os.path.join(self.storage_path, repo_id.replace("/", "_")))
            else:
                # Full model download for PyTorch
                path = snapshot_download(repo_id=repo_id, local_dir=os.path.join(self.storage_path, repo_id.replace("/", "_")))
            
            print(f"Download complete: {path}")
            return path
        except Exception as e:
            print(f"Error downloading model: {e}")
            raise e

    def load_for_training(self, model_path: str, use_qlora: bool = False, load_in_4bit: bool = False):
        """
        Loads a model specifically for training/refining.
        """
        print(f"Loading model for training from {model_path} on {self.device}")
        
        quantization_config = None
        if load_in_4bit:
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4"
            )

        try:
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                quantization_config=quantization_config,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" # Handles offloading automatically
            )
            
            # Prepare for LoRA if requested (Configuration usually happens in Trainer, but prep here)
            if use_qlora:
                from peft import prepare_model_for_kbit_training
                model = prepare_model_for_kbit_training(model)

            return model, tokenizer
        except Exception as e:
            print(f"Failed to load model: {e}")
            raise e

    def load_for_inference(self, model_path: str, backend: str = "pytorch"):
        """
        Loads a model for direct inference.
        """
        if backend == "pytorch":
            return self.load_for_training(model_path) # Re-use strict loading
        elif backend == "llama.cpp":
            # Draft: Integration with llama-cpp-python
            try:
                from llama_cpp import Llama
                # Assuming model_path points to a specific .gguf file
                llm = Llama(model_path=model_path, n_gpu_layers=-1, n_ctx=2048)
                return llm
            except ImportError:
                raise ImportError("llama-cpp-python is not installed.")
        else:
            raise ValueError(f"Unknown backend: {backend}")
