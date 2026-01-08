"""
Similarity and matching module for computing cosine similarity.
"""
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Union
from embedding_engine import EmbeddingEngine


class SimilarityMatcher:
    """Compute similarity between embeddings."""
    
    def __init__(self):
        """Initialize the similarity matcher."""
        self.embedding_engine = EmbeddingEngine()
    
    @staticmethod
    def cosine_similarity_score(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings."""
        if embedding1.ndim == 1:
            embedding1 = embedding1.reshape(1, -1)
        if embedding2.ndim == 1:
            embedding2 = embedding2.reshape(1, -1)
        
        similarity = cosine_similarity(embedding1, embedding2)[0][0]
        return float(similarity)
    
    def match_texts(self, text1: str, text2: str) -> float:
        """Compute similarity between two text strings."""
        embedding1 = self.embedding_engine.encode_single(text1)
        embedding2 = self.embedding_engine.encode_single(text2)
        return self.cosine_similarity_score(embedding1, embedding2)
    
    def match_jd_resume(self, jd_text: str, resume_text: str) -> float:
        """Compute similarity between job description and resume."""
        return self.match_texts(jd_text, resume_text)


def demo_matching():
    """Demonstrate matching two sample strings."""
    matcher = SimilarityMatcher()
    
    sample_jd = "Software engineer with Python experience and machine learning skills"
    sample_resume = "Python developer with 3 years experience in ML and data science"
    
    score = matcher.match_texts(sample_jd, sample_resume)
    print(f"Similarity score: {score:.4f}")
    return score


if __name__ == "__main__":
    demo_matching()