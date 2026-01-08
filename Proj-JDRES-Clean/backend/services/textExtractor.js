/**
 * Text Extraction Service
 * Handles file upload and text extraction from various formats
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');

class TextExtractor {
    constructor() {
        console.log('=== INITIALIZING TEXT EXTRACTOR ===');
        // Configure multer for file uploads
        this.upload = multer({
            dest: 'uploads/',
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB per file
                files: 20 // Allow up to 20 files
            },
            fileFilter: (req, file, cb) => {
                console.log('Multer fileFilter called for:', file.originalname, file.mimetype);
                const allowedTypes = ['.pdf', '.txt', '.docx'];
                const ext = path.extname(file.originalname).toLowerCase();
                
                if (allowedTypes.includes(ext)) {
                    console.log('File accepted:', file.originalname);
                    cb(null, true);
                } else {
                    console.log('File rejected:', file.originalname, 'Extension:', ext);
                    cb(new Error(`Unsupported file type: ${ext}`));
                }
            }
        });
        console.log('Multer configured successfully');
    }

    /**
     * Extract text from uploaded file
     * @param {string} filePath - Path to uploaded file
     * @param {string} originalName - Original filename
     * @returns {Promise<string>} - Extracted text
     */
    async extractText(filePath, originalName) {
        const ext = path.extname(originalName).toLowerCase();
        
        try {
            switch (ext) {
                case '.pdf':
                    return await this._extractFromPDF(filePath);
                case '.txt':
                    return await this._extractFromTXT(filePath);
                case '.docx':
                    return await this._extractFromDOCX(filePath);
                default:
                    throw new Error(`Unsupported file type: ${ext}`);
            }
        } finally {
            // Clean up uploaded file
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.warn(`Failed to delete temp file: ${filePath}`);
            }
        }
    }

    /**
     * Extract text from multiple files
     * @param {Array} files - Array of uploaded files
     * @returns {Promise<Object>} - Object with filename as key and text as value
     */
    async extractMultipleTexts(files) {
        const results = {};
        
        for (const file of files) {
            try {
                const text = await this.extractText(file.path, file.originalname);
                results[file.originalname] = text;
            } catch (error) {
                console.error(`Failed to extract ${file.originalname}:`, error.message);
                results[file.originalname] = null;
            }
        }
        
        return results;
    }

    /**
     * Extract text from PDF file
     * @private
     */
    async _extractFromPDF(filePath) {
        const buffer = await fs.readFile(filePath);
        const data = await pdfParse(buffer);
        return data.text;
    }

    /**
     * Extract text from TXT file
     * @private
     */
    async _extractFromTXT(filePath) {
        return await fs.readFile(filePath, 'utf-8');
    }

    /**
     * Extract text from DOCX file
     * @private
     */
    async _extractFromDOCX(filePath) {
        try {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({path: filePath});
            return result.value;
        } catch (error) {
            console.warn('Mammoth not installed, using fallback for DOCX');
            return 'DOCX extraction requires mammoth package. Install with: npm install mammoth';
        }
    }

    /**
     * Get multer middleware for single file upload
     */
    getSingleUpload(fieldName = 'file') {
        return this.upload.single(fieldName);
    }

    /**
     * Get multer middleware for multiple file upload
     */
    getMultipleUpload(fieldName = 'files', maxCount = 20) {
        return this.upload.array(fieldName, maxCount);
    }
}

module.exports = TextExtractor;