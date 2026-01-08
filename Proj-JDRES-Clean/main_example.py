"""
Example usage of the JD-Resume matching backend system.
"""
from resume_source_selector import ResumeSourceSelector
from similarity_matcher import SimilarityMatcher
from embedding_engine import EmbeddingEngine


def main():
    """Example usage of the matching system."""
    
    # Initialize components
    resume_selector = ResumeSourceSelector()
    matcher = SimilarityMatcher()
    
    # Example: Scan local folder for resumes
    folder_path = input("Enter path to resume folder: ").strip()
    
    try:
        # Extract all resumes from folder
        resumes = resume_selector.extract_resumes_from_folder(folder_path)
        print(f"Found {len(resumes)} resumes")
        
        # Example job description
        jd_text = input("Enter job description: ").strip()
        
        # Match JD against all resumes
        results = []
        for filename, resume_text in resumes.items():
            score = matcher.match_jd_resume(jd_text, resume_text)
            results.append((filename, score))
        
        # Sort by similarity score (highest first)
        results.sort(key=lambda x: x[1], reverse=True)
        
        # Display results
        print("\nMatching Results:")
        for filename, score in results:
            print(f"{filename}: {score:.4f}")
            
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    main()