"""
Resume source selection module for local folder scanning.
"""
import os
from typing import Dict, List
from text_extractor import TextExtractor


class ResumeSourceSelector:
    """Select and process resumes from local folders."""
    
    SUPPORTED_EXTENSIONS = {'.pdf', '.txt', '.docx'}
    
    def __init__(self):
        """Initialize the resume source selector."""
        self.text_extractor = TextExtractor()
    
    def scan_local_folder(self, folder_path: str) -> List[str]:
        """Scan folder for resume files with supported extensions."""
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"Folder not found: {folder_path}")
        
        if not os.path.isdir(folder_path):
            raise ValueError(f"Path is not a directory: {folder_path}")
        
        resume_files = []
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                ext = os.path.splitext(filename)[1].lower()
                if ext in self.SUPPORTED_EXTENSIONS:
                    resume_files.append(file_path)
        
        return resume_files
    
    def extract_resumes_from_folder(self, folder_path: str) -> Dict[str, str]:
        """Extract text from all resume files in folder."""
        resume_files = self.scan_local_folder(folder_path)
        extracted_resumes = {}
        
        for file_path in resume_files:
            filename = os.path.basename(file_path)
            try:
                text = self.text_extractor.extract_text(file_path)
                extracted_resumes[filename] = text
            except Exception as e:
                print(f"Warning: Failed to extract {filename}: {str(e)}")
                continue
        
        return extracted_resumes
    
    def get_resume_count(self, folder_path: str) -> int:
        """Get count of resume files in folder."""
        return len(self.scan_local_folder(folder_path))