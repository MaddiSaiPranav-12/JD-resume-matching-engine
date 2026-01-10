class MatchingApp {
    constructor() {
        this.jdText = '';
        this.jdSkills = [];
        this.resumeFiles = new Map(); // filename -> {text, skills, processed}
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // JD Text Input
        document.getElementById('submitJDTextBtn').addEventListener('click', () => {
            this.handleJDTextSubmit();
        });

        // JD Upload
        document.getElementById('uploadJDBtn').addEventListener('click', () => {
            document.getElementById('jdFile').click();
        });

        document.getElementById('jdFile').addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleJDFileUpload(e.target.files[0]);
        });

        // Resume Upload
        document.getElementById('uploadResumeBtn').addEventListener('click', () => {
            document.getElementById('resumeFile').click();
        });

        document.getElementById('addMoreResumeBtn').addEventListener('click', () => {
            document.getElementById('resumeFile').click();
        });

        document.getElementById('resumeFile').addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleResumeFileUpload(e.target.files[0]);
        });

        // Action buttons
        document.getElementById('extractBtn').addEventListener('click', () => this.extractSkills());
        document.getElementById('matchBtn').addEventListener('click', () => this.calculateMatches());
        document.getElementById('rankBtn').addEventListener('click', () => this.rankResumes());
    }

    async handleJDFileUpload(file) {
        this.showLoading(true);
        this.showStatus('Uploading JD file...', 'info');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/extract-text', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.jdText = result.text;
                this.jdSkills = []; // Reset skills when new JD uploaded
                document.getElementById('jdFileInfo').innerHTML = `✓ ${file.name}`;
                document.getElementById('jdTextInput').value = ''; // Clear textarea when file uploaded
                this.showStatus('JD uploaded successfully', 'success');
                this.updateButtonStates();
            } else {
                throw new Error(result.error || 'Failed to upload JD');
            }
        } catch (error) {
            this.showStatus(`Error uploading JD: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleJDTextSubmit() {
        const textArea = document.getElementById('jdTextInput');
        const text = textArea.value.trim();

        if (!text) {
            this.showStatus('Please enter a job description', 'error');
            return;
        }

        if (text.length < 50) {
            this.showStatus('Job description seems too short. Please provide more details.', 'error');
            return;
        }

        this.jdText = text;
        this.jdSkills = []; // Reset skills when new JD submitted
        document.getElementById('jdFileInfo').innerHTML = `✓ JD entered manually (${text.length} characters)`;
        this.showStatus('Job description submitted successfully', 'success');
        this.updateButtonStates();

        // Clear file input if any file was previously selected
        document.getElementById('jdFile').value = '';
    }

    async handleResumeFileUpload(file) {
        // Check if file already exists
        if (this.resumeFiles.has(file.name)) {
            this.showStatus('File already uploaded', 'error');
            return;
        }

        this.showLoading(true);
        this.showStatus('Uploading resume...', 'info');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/extract-text', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Store file data
                this.resumeFiles.set(file.name, {
                    text: result.text,
                    skills: [],
                    processed: false
                });

                this.updateUploadedFilesList();
                this.showStatus('Resume uploaded successfully', 'success');
                this.updateButtonStates();

                // Show "Add More" button
                document.getElementById('addMoreResumeBtn').style.display = 'inline-block';
            } else {
                throw new Error(result.error || 'Failed to upload resume');
            }
        } catch (error) {
            this.showStatus(`Error uploading resume: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateUploadedFilesList() {
        const container = document.getElementById('uploadedFiles');
        const fileNames = Array.from(this.resumeFiles.keys());

        container.innerHTML = `
            <h4>Uploaded Resumes (${fileNames.length}):</h4>
            ${fileNames.map(name => `<div class="file-item">📄 ${name}</div>`).join('')}
        `;
    }

    async extractSkills() {
        if (!this.jdText) {
            this.showStatus('Please enter or upload a Job Description first', 'error');
            return;
        }

        if (this.resumeFiles.size === 0) {
            this.showStatus('Please upload at least one resume', 'error');
            return;
        }

        this.showLoading(true);
        this.showStatus('Extracting skills...', 'info');

        try {
            // Extract JD skills if not already done
            if (this.jdSkills.length === 0) {
                const jdResponse = await fetch('/api/extract-skills', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: this.jdText, type: 'jd' })
                });
                const jdResult = await jdResponse.json();
                this.jdSkills = jdResult.skills || [];
            }

            // Extract skills only from unprocessed resumes
            for (let [filename, fileData] of this.resumeFiles) {
                if (!fileData.processed) {
                    const resumeResponse = await fetch('/api/extract-skills', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: fileData.text, type: 'resume' })
                    });
                    const resumeResult = await resumeResponse.json();
                    fileData.skills = Array.from(resumeResult.skills || []);
                    fileData.processed = true;
                }
            }

            this.displaySkillResults();
            this.showStatus('Skills extracted successfully', 'success');
            this.updateButtonStates();

        } catch (error) {
            this.showStatus(`Error extracting skills: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async calculateMatches() {
        if (this.jdSkills.length === 0) {
            this.showStatus('Please extract skills first', 'error');
            return;
        }

        this.showLoading(true);
        this.showStatus('Calculating matches...', 'info');

        try {
            const matchResults = [];

            for (let [filename, fileData] of this.resumeFiles) {
                if (fileData.skills.length > 0) {
                    const response = await fetch('/api/match-skills', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jdSkills: [...this.jdSkills],
                            resumeSkills: [...fileData.skills]
                        })
                    });
                    const result = await response.json();
                    matchResults.push({
                        filename,
                        ...result
                    });
                }
            }

            this.displayMatchResults(matchResults);
            this.showStatus('Match calculation completed', 'success');

        } catch (error) {
            this.showStatus(`Error calculating matches: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async rankResumes() {
        if (this.jdSkills.length === 0) {
            this.showStatus('Please extract skills and calculate matches first', 'error');
            return;
        }

        this.showLoading(true);
        this.showStatus('Ranking resumes by match scores...', 'info');

        try {
            const rankingResults = [];

            // Get match results for all resumes
            for (let [filename, fileData] of this.resumeFiles) {
                if (fileData.skills.length > 0) {
                    const response = await fetch('/api/match-skills', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jdSkills: [...this.jdSkills],
                            resumeSkills: [...fileData.skills]
                        })
                    });
                    const result = await response.json();

                    rankingResults.push({
                        resume_id: filename,
                        similarity_score: result.matchScore / 100, // Convert percentage to decimal
                        resume_text: fileData.text.substring(0, 200) + '...',
                        matchScore: result.matchScore,
                        matchedSkills: result.matchedSkills,
                        missingSkills: result.missingSkills
                    });
                }
            }

            // Sort by match score (highest first)
            rankingResults.sort((a, b) => b.similarity_score - a.similarity_score);

            // Add ranks
            rankingResults.forEach((result, index) => {
                result.rank = index + 1;
            });

            const rankingData = {
                results: rankingResults,
                total_found: rankingResults.length,
                algorithm: 'Skill-based Match Score Ranking'
            };

            this.displayRankingResults(rankingData);
            this.showStatus('Resume ranking completed', 'success');

        } catch (error) {
            this.showStatus(`Error ranking resumes: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displaySkillResults() {
        const container = document.getElementById('skillsContainer');

        let html = `
            <div class="skill-group">
                <h4>Job Description Skills</h4>
                <div class="skill-list">
                    ${this.jdSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        `;

        for (let [filename, fileData] of this.resumeFiles) {
            if (fileData.skills.length > 0) {
                html += `
                    <div class="skill-group">
                        <h4>${filename} Skills</h4>
                        <div class="skill-list">
                            ${fileData.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        }

        container.innerHTML = html;
        document.getElementById('skillResults').style.display = 'block';
    }

    displayMatchResults(matchResults) {
        const container = document.getElementById('matchContainer');

        const html = matchResults.map(match => `
            <div class="match-item">
                <h4>${match.filename}</h4>
                <div class="match-score">Match Score: ${match.matchScore}%</div>
                <div class="skill-breakdown">
                    <div class="matched-skills">
                        <strong>Matched Skills (${match.matchedSkills.length}):</strong>
                        ${match.matchedSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                    <div class="missing-skills">
                        <strong>Missing Skills (${match.missingSkills.length}):</strong>
                        ${match.missingSkills.map(skill => `<span class="skill-tag missing">${skill}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        document.getElementById('matchResults').style.display = 'block';
    }

    displayRankingResults(rankingData) {
        const container = document.getElementById('rankedResumesList');

        const html = rankingData.results.map(resume => `
            <div class="resume-item">
                <div class="resume-info">
                    <h4>Rank ${resume.rank}: ${resume.resume_id}</h4>
                    <p>${resume.resume_text.substring(0, 200)}...</p>
                </div>
                <div class="resume-score">${(resume.similarity_score * 100).toFixed(1)}%</div>
            </div>
        `).join('');

        container.innerHTML = html;
        document.getElementById('rankingResults').style.display = 'block';
    }

    updateButtonStates() {
        const hasJD = this.jdText.length > 0;
        const hasResumes = this.resumeFiles.size > 0;
        const hasSkills = this.jdSkills.length > 0 && Array.from(this.resumeFiles.values()).some(f => f.skills.length > 0);

        document.getElementById('extractBtn').disabled = !hasJD || !hasResumes;
        document.getElementById('matchBtn').disabled = !hasSkills;
        document.getElementById('rankBtn').disabled = !hasSkills;
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        if (type === 'success') setTimeout(() => statusDiv.textContent = '', 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => new MatchingApp());