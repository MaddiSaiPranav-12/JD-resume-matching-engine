/**
 * Text Ranking Client Service
 * Node.js wrapper to communicate with Python text ranking microservice
 */

const axios = require('axios');

class TextRankingClient {
    constructor(baseUrl = 'http://localhost:5001') {
        this.baseUrl = baseUrl;
    }

    /**
     * Check if text ranking service is healthy
     * @returns {Promise<boolean>}
     */
    async isHealthy() {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                timeout: 5000
            });
            return response.data.status === 'healthy';
        } catch (error) {
            console.error('Text ranking service health check failed:', error.message);
            return false;
        }
    }

    /**
     * Build text index with resume data
     * @param {Array<string>} resumeTexts - Array of resume text content
     * @param {Array<string>} resumeIds - Array of resume identifiers
     * @returns {Promise<Object>} - Build result
     */
    async buildIndex(resumeTexts, resumeIds) {
        try {
            const response = await axios.post(`${this.baseUrl}/build-index`, {
                resume_texts: resumeTexts,
                resume_ids: resumeIds
            }, {
                timeout: 30000 // 30 seconds for index building
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to build text index: ${error.message}`);
        }
    }

    /**
     * Search for similar resumes using job description
     * @param {string} jdText - Job description text
     * @param {number} topK - Number of top results to return
     * @returns {Promise<Object>} - Search results
     */
    async searchSimilarResumes(jdText, topK = 10) {
        try {
            const response = await axios.post(`${this.baseUrl}/search`, {
                jd_text: jdText,
                top_k: topK
            }, {
                timeout: 15000 // 15 seconds for search
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to search resumes: ${error.message}`);
        }
    }

    /**
     * Batch process multiple resumes and rank them
     * @param {string} jdText - Job description text
     * @param {Object} resumeData - Object with resume filenames as keys and text as values
     * @param {number} topK - Number of top results to return
     * @returns {Promise<Object>} - Ranked results
     */
    async rankResumes(jdText, resumeData, topK = 10) {
        const resumeIds = Object.keys(resumeData);
        const resumeTexts = Object.values(resumeData);

        // Build index
        await this.buildIndex(resumeTexts, resumeIds);

        // Search for similar resumes
        const searchResults = await this.searchSimilarResumes(jdText, topK);

        return {
            ...searchResults,
            query: jdText,
            total_resumes: resumeIds.length
        };
    }
}

module.exports = TextRankingClient;