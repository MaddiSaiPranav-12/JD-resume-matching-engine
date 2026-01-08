"""
Embedding engine using SentenceTransformers all-mpnet-base-v2 model.
"""
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Union


class EmbeddingEngine:
    """Generate embeddings using SentenceTransformers."""
    
    def __init__(self, model_name: str = "all-mpnet-base-v2"):
        """Initialize the embedding model."""
        self.model_name = model_name
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the SentenceTransformer model."""
        try:
            self.model = SentenceTransformer(self.model_name)
        except Exception as e:
            raise Exception(f"Error loading model {self.model_name}: {str(e)}")
    
    def encode(self, text: Union[str, List[str]]) -> np.ndarray:
        """Encode text into embeddings."""
        if not self.model:
            raise Exception("Model not loaded")
        
        try:
            embeddings = self.model.encode(text)
            return embeddings
        except Exception as e:
            raise Exception(f"Error encoding text: {str(e)}")
    
    def encode_single(self, text: str) -> np.ndarray:
        """Encode a single text string."""
        return self.encode(text)
    
    def encode_batch(self, texts: List[str]) -> np.ndarray:
        """Encode multiple texts at once."""
        return self.encode(texts)