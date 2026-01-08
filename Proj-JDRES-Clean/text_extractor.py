"""
Text extraction module for PDF, DOCX, and TXT files.
"""
import PyPDF2
from docx import Document
import os
from typing import Optional


class TextExtractor:
    """Extract text from various file formats."""
    
    @staticmethod
    def extract_from_pdf(file_path: str) -> str:
        """Extract text from PDF file."""
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting PDF {file_path}: {str(e)}")
    
    @staticmethod
    def extract_from_docx(file_path: str) -> str:
        """Extract text from DOCX file."""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Error extracting DOCX {file_path}: {str(e)}")
    
    @staticmethod
    def extract_from_txt(file_path: str) -> str:
        """Extract text from TXT file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except Exception as e:
            raise Exception(f"Error extracting TXT {file_path}: {str(e)}")
    
    @classmethod
    def extract_text(cls, file_path: str) -> str:
        """Extract text based on file extension."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            return cls.extract_from_pdf(file_path)
        elif ext == '.docx':
            return cls.extract_from_docx(file_path)
        elif ext == '.txt':
            return cls.extract_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")