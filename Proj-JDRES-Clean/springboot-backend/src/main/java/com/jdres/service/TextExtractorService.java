package com.jdres.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Text Extraction Service
 * Handles file upload and text extraction from various formats (PDF, DOCX, TXT)
 */
@Service
public class TextExtractorService {

    @Value("${uploads.dir}")
    private String uploadsDir;

    /**
     * Extract text from uploaded file
     * 
     * @param file - Uploaded multipart file
     * @return Extracted text content
     */
    public String extractText(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("File name is required");
        }

        String ext = getFileExtension(originalFilename).toLowerCase();

        // Save file temporarily
        Path tempPath = saveTemporaryFile(file);

        try {
            return switch (ext) {
                case ".pdf" -> extractFromPDF(tempPath.toFile());
                case ".txt" -> extractFromTXT(tempPath);
                case ".docx" -> extractFromDOCX(tempPath.toFile());
                default -> throw new IllegalArgumentException("Unsupported file type: " + ext);
            };
        } finally {
            // Clean up temporary file
            Files.deleteIfExists(tempPath);
        }
    }

    /**
     * Extract text from multiple files
     * 
     * @param files - List of uploaded files
     * @return Map with filename as key and extracted text as value
     */
    public Map<String, String> extractMultipleTexts(List<MultipartFile> files) {
        Map<String, String> results = new HashMap<>();

        for (MultipartFile file : files) {
            String filename = file.getOriginalFilename();
            try {
                String text = extractText(file);
                results.put(filename, text);
            } catch (Exception e) {
                System.err.println("Failed to extract " + filename + ": " + e.getMessage());
                results.put(filename, null);
            }
        }

        return results;
    }

    /**
     * Save file to temporary location
     */
    private Path saveTemporaryFile(MultipartFile file) throws IOException {
        Path uploadsPath = Paths.get(uploadsDir);
        Files.createDirectories(uploadsPath);

        String uniqueFilename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path tempPath = uploadsPath.resolve(uniqueFilename);
        file.transferTo(tempPath);

        return tempPath;
    }

    /**
     * Extract text from PDF file
     */
    private String extractFromPDF(File file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    /**
     * Extract text from TXT file
     */
    private String extractFromTXT(Path filePath) throws IOException {
        return Files.readString(filePath);
    }

    /**
     * Extract text from DOCX file
     */
    private String extractFromDOCX(File file) throws IOException {
        try (FileInputStream fis = new FileInputStream(file);
                XWPFDocument document = new XWPFDocument(fis);
                XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    /**
     * Get file extension from filename
     */
    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1) {
            return "";
        }
        return filename.substring(lastDot);
    }

    /**
     * Check if file type is supported
     */
    public boolean isSupportedFileType(String filename) {
        String ext = getFileExtension(filename).toLowerCase();
        return ext.equals(".pdf") || ext.equals(".txt") || ext.equals(".docx");
    }
}
