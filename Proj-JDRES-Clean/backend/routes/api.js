/**
 * API Routes for JD-Resume Matching Engine
 */

const express = require('express');
const router = express.Router();

const SkillExtractor = require('../services/skillExtractor');
const MatchCalculator = require('../services/matchCalculator');
const TextRankingClient = require('../services/faissClient');
const TextExtractor = require('../services/textExtractor');

// Initialize services
const skillExtractor = new SkillExtractor();
const matchCalculator = new MatchCalculator();
const textRankingClient = new TextRankingClient();
const textExtractor = new TextExtractor();

/**
 * POST /extract-skills
 * Extract skills from text using placeholder LLM function
 */
router.post('/extract-skills', async (req, res) => {
    try {
        const { text, type } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const skills = await skillExtractor.extractSkills(text);
        
        res.json({
            success: true,
            type: type || 'unknown',
            skills,
            skillCount: skills.length
        });
    } catch (error) {
        console.error('Skill extraction error:', error);
        res.status(500).json({ error: 'Failed to extract skills' });
    }
});

/**
 * POST /match-skills
 * Calculate skill-based match percentage
 */
router.post('/match-skills', async (req, res) => {
    try {
        const { jdSkills, resumeSkills, weighted = false } = req.body;
        
        if (!jdSkills || !resumeSkills) {
            return res.status(400).json({ error: 'jdSkills and resumeSkills are required' });
        }

        let matchResult;
        
        if (weighted && Array.isArray(jdSkills) && jdSkills[0]?.skill) {
            // Weighted matching
            matchResult = matchCalculator.calculateWeightedMatch(jdSkills, resumeSkills);
        } else {
            // Simple skill matching
            matchResult = matchCalculator.calculateSkillMatch(jdSkills, resumeSkills);
        }

        res.json({
            success: true,
            ...matchResult
        });
    } catch (error) {
        console.error('Match calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate match' });
    }
});

/**
 * POST /rank-resumes
 * Rank resumes using FAISS-based similarity
 */
router.post('/rank-resumes', async (req, res) => {
    try {
        const { jdText, resumeData, topK = 10 } = req.body;
        
        if (!jdText || !resumeData) {
            return res.status(400).json({ error: 'jdText and resumeData are required' });
        }

        // Check if text ranking service is healthy
        const isHealthy = await textRankingClient.isHealthy();
        if (!isHealthy) {
            return res.status(503).json({ 
                error: 'Text ranking service unavailable. Please start the Python microservice.' 
            });
        }

        const results = await textRankingClient.rankResumes(jdText, resumeData, topK);
        
        res.json({
            success: true,
            ...results
        });
    } catch (error) {
        console.error('Resume ranking error:', error);
        res.status(500).json({ error: 'Failed to rank resumes' });
    }
});

/**
 * POST /extract-text
 * Extract text from uploaded files
 */
router.post('/extract-text', textExtractor.getSingleUpload('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const text = await textExtractor.extractText(req.file.path, req.file.originalname);
        
        res.json({
            success: true,
            filename: req.file.originalname,
            text,
            textLength: text.length
        });
    } catch (error) {
        console.error('Text extraction error:', error);
        res.status(500).json({ error: 'Failed to extract text from file' });
    }
});

/**
 * POST /extract-multiple-texts
 * Extract text from multiple uploaded files
 */
router.post('/extract-multiple-texts', (req, res, next) => {
    console.log('=== MULTIPLE TEXT EXTRACTION REQUEST ===');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.get('Content-Type'));
    next();
}, textExtractor.getMultipleUpload('files', 20), async (req, res) => {
    try {
        console.log('=== AFTER MULTER PROCESSING ===');
        console.log('req.files exists:', !!req.files);
        console.log('req.files type:', typeof req.files);
        console.log('req.files length:', req.files ? req.files.length : 'N/A');
        console.log('req.file exists:', !!req.file);
        console.log('req.body:', req.body);
        
        if (req.files) {
            console.log('Files received:');
            req.files.forEach((file, i) => {
                console.log(`  File ${i+1}:`, {
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: file.path
                });
            });
        }
        
        if (!req.files || req.files.length === 0) {
            console.log('ERROR: No files in request');
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log('Processing files:', req.files.map(f => f.originalname));
        const results = await textExtractor.extractMultipleTexts(req.files);
        
        const successCount = Object.values(results).filter(text => text !== null).length;
        console.log(`Extraction complete: ${successCount}/${req.files.length} successful`);
        
        res.json({
            success: true,
            results,
            totalFiles: req.files.length,
            successCount,
            failedCount: req.files.length - successCount
        });
    } catch (error) {
        console.error('Multiple text extraction error:', error);
        res.status(500).json({ error: 'Failed to extract texts from files' });
    }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    const rankingHealthy = await textRankingClient.isHealthy();
    
    res.json({
        success: true,
        services: {
            api: 'healthy',
            ranking: rankingHealthy ? 'healthy' : 'unavailable'
        }
    });
});

module.exports = router;