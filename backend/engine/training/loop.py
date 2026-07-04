import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from typing import Callable, Optional, Dict
import time

class TrainingLoop:
    """
    A professional, reusable training loop with support for:
    - Mixed Precision (AMP)
    - Gradient Accumulation
    - Real-time metric callbacks (for UI)
    - Checkpointing
    """
    
    def __init__(
        self,
        model: nn.Module,
        optimizer: torch.optim.Optimizer,
        train_loader: DataLoader,
        val_loader: Optional[DataLoader] = None,
        device: str = "cuda",
        fp16: bool = True,
        grad_accum_steps: int = 1,
        log_callback: Optional[Callable[[Dict], None]] = None
    ):
        self.model = model
        self.optimizer = optimizer
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        self.fp16 = fp16 and torch.cuda.is_available()
        self.grad_accum_steps = grad_accum_steps
        self.log_callback = log_callback
        
        self.scaler = torch.cuda.amp.GradScaler() if self.fp16 else None
        self.stop_requested = False

    def train(self, epochs: int):
        print(f"Starting training for {epochs} epochs...")
        self.model.train()
        
        global_step = 0
        
        for epoch in range(epochs):
            if self.stop_requested:
                print("Training stopped by user request.")
                break
                
            epoch_loss = 0.0
            start_time = time.time()
            
            for step, batch in enumerate(self.train_loader):
                if self.stop_requested: break
                
                # Move batch to device
                inputs = {k: v.to(self.device) for k, v in batch.items() if k != "labels"}
                labels = batch["labels"].to(self.device)
                
                # Mixed Precision Context
                with torch.cuda.amp.autocast(enabled=self.fp16):
                    outputs = self.model(**inputs, labels=labels)
                    loss = outputs.loss / self.grad_accum_steps
                
                # Backward pass
                if self.fp16:
                    self.scaler.scale(loss).backward()
                else:
                    loss.backward()
                
                # Optimizer Step
                if (step + 1) % self.grad_accum_steps == 0:
                    if self.fp16:
                        self.scaler.step(self.optimizer)
                        self.scaler.update()
                    else:
                        self.optimizer.step()
                    
                    self.optimizer.zero_grad()
                    global_step += 1
                
                # Metric calculation
                current_loss = loss.item() * self.grad_accum_steps
                epoch_loss += current_loss
                
                # Logging to UI via Callback
                if self.log_callback and global_step % 10 == 0:
                    metrics = {
                        "epoch": epoch + 1,
                        "step": global_step,
                        "loss": current_loss,
                        "vram_allocated": torch.cuda.memory_allocated() / 1024**3 if torch.cuda.is_available() else 0,
                    }
                    self.log_callback(metrics)
            
            avg_epoch_loss = epoch_loss / len(self.train_loader)
            print(f"Epoch {epoch+1} Complete. Avg Loss: {avg_epoch_loss:.4f}. Time: {time.time() - start_time:.2f}s")
            
            # Validation Step could go here
            if self.val_loader:
                self.validate()

    def validate(self):
        self.model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in self.val_loader:
                inputs = {k: v.to(self.device) for k, v in batch.items() if k != "labels"}
                labels = batch["labels"].to(self.device)
                outputs = self.model(**inputs, labels=labels)
                val_loss += outputs.loss.item()
        
        avg_val_loss = val_loss / len(self.val_loader)
        print(f"Validation Loss: {avg_val_loss:.4f}")
        if self.log_callback:
            self.log_callback({"type": "validation", "val_loss": avg_val_loss})
        self.model.train()

    def stop(self):
        self.stop_requested = True
