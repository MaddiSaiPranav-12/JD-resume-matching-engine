"""
Text-based Resume Ranking Service
Uses TF-IDF and cosine similarity for ranking resumes
"""


import math
from collections import Counter
from flask import Flask, request, jsonify
from typing import List, Dict
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

class TextRanker:
    """Text-based ranker using TF-IDF and cosine similarity"""
    # Add this method to TextRanker class:
    
    def __init__(self):
        self.resume_texts = []
        self.resume_ids = []
    
    def get_words(self, text):
        """Extract words from text"""
        return text.lower().split()
    
    def calculate_tf(self, text):
        """Calculate term frequency"""
        words = self.get_words(text)
        word_count = len(words)
        tf_dict = Counter(words)
        # Normalize by total words
        for word in tf_dict:
            tf_dict[word] = tf_dict[word] / word_count
        return tf_dict
    
    def calculate_idf(self, documents):
        """Calculate inverse document frequency"""
        N = len(documents)
        idf_dict = {}
        all_words = set(word for doc in documents for word in self.get_words(doc))
        
        for word in all_words:
            containing_docs = sum(1 for doc in documents if word in self.get_words(doc))
            idf_dict[word] = math.log(N / containing_docs) if containing_docs > 0 else 0
        return idf_dict
    
    def cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors"""
        intersection = set(vec1.keys()) & set(vec2.keys())
        numerator = sum([vec1[x] * vec2[x] for x in intersection])
        
        sum1 = sum([vec1[x]**2 for x in vec1.keys()])
        sum2 = sum([vec2[x]**2 for x in vec2.keys()])
        denominator = math.sqrt(sum1) * math.sqrt(sum2)
        
        return numerator / denominator if denominator != 0 else 0
    
    def calculate_similarities(self, jd_text, resume_texts):
        """Calculate TF-IDF cosine similarity between JD and resumes"""
        all_docs = [jd_text] + resume_texts
        idf = self.calculate_idf(all_docs)
        
        # Calculate JD TF-IDF
        jd_tf = self.calculate_tf(jd_text)
        jd_tfidf = {word: tf * idf[word] for word, tf in jd_tf.items()}
        
        similarities = []
        for resume_text in resume_texts:
            resume_tf = self.calculate_tf(resume_text)
            resume_tfidf = {word: tf * idf[word] for word, tf in resume_tf.items()}
            similarity = self.cosine_similarity(jd_tfidf, resume_tfidf)
            similarities.append(similarity)
        
        return similarities
    
    def build_index(self, resume_texts: List[str], resume_ids: List[str]):
        """Store resume texts and IDs"""
        if not resume_texts:
            raise ValueError("No resume texts provided")
            
        self.resume_texts = resume_texts
        self.resume_ids = resume_ids
        logging.info(f"Built text index with {len(resume_texts)} resumes")
    
    def search_similar_resumes(self, jd_text: str, top_k: int = 10) -> List[Dict]:
        """Search for similar resumes using TF-IDF"""
        if not self.resume_texts:
            raise ValueError("Index not built. Call build_index first.")
        
        similarities = self.calculate_similarities(jd_text, self.resume_texts)
        
        results = []
        for resume_id, resume_text, similarity in zip(self.resume_ids, self.resume_texts, similarities):
            results.append({
                'resume_id': resume_id,
                'similarity_score': similarity,
                'resume_text': resume_text[:500] + "..." if len(resume_text) > 500 else resume_text
            })
        
        # Sort by similarity and return top_k
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        # Add rank
        for i, result in enumerate(results[:top_k]):
            result['rank'] = i + 1
        
        return results[:top_k]

# Global ranker instance
ranker = TextRanker()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'service': 'text-ranker',
        'algorithm': 'TF-IDF Cosine Similarity'
    })

@app.route('/build-index', methods=['POST'])
def build_index():
    """Build text index from resume data"""
    try:
        data = request.json
        resume_texts = data.get('resume_texts', [])
        resume_ids = data.get('resume_ids', [])
        
        if not resume_texts or not resume_ids:
            return jsonify({'error': 'resume_texts and resume_ids required'}), 400
        
        if len(resume_texts) != len(resume_ids):
            return jsonify({'error': 'resume_texts and resume_ids length mismatch'}), 400
        
        ranker.build_index(resume_texts, resume_ids)
        
        return jsonify({
            'success': True,
            'message': f'Text index built with {len(resume_texts)} resumes',
            'algorithm': 'TF-IDF Cosine Similarity'
        })
        
    except Exception as e:
        logging.error(f"Error building index: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['POST'])
def search_resumes():
    """Search for similar resumes using TF-IDF"""
    try:
        data = request.json
        jd_text = data.get('jd_text', '')
        top_k = data.get('top_k', 10)
        
        if not jd_text:
            return jsonify({'error': 'jd_text required'}), 400
        
        results = ranker.search_similar_resumes(jd_text, top_k)
        
        return jsonify({
            'success': True,
            'results': results,
            'total_found': len(results),
            'algorithm': 'TF-IDF Cosine Similarity'
        })
        
    except Exception as e:
        logging.error(f"Error searching resumes: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("TEXT-BASED RESUME RANKING SERVICE")
    print("Algorithm: TF-IDF + Cosine Similarity")
    print("No external dependencies required!")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=False, load_dotenv=False)