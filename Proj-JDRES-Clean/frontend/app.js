/**
 * JD-Resume Matching Application (Vanilla JS + Tailwind)
 */

import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

class App {
    constructor() {
        // State
        this.jobs = [
            { id: 'job-1', title: 'Workday Recruiting Functional', createdAt: 'Today', jdText: '', jdFile: null, resumes: [], status: 'idle', results: null }
        ];
        this.activeJobId = 'job-1';
        this.theme = 'dark';

        // Cache DOM elements
        this.dom = {
            body: document.getElementById('appBody'),
            themeToggleBtn: document.getElementById('themeToggleBtn'),
            jobsList: document.getElementById('jobsList'),
            newJobBtn: document.getElementById('newJobBtn'),
            activeJobTitleDisplay: document.getElementById('activeJobTitleDisplay'),
            jobTitleInput: document.getElementById('jobTitleInput'),

            // JD Section
            jdSection: document.getElementById('jdSection'),
            jdFileInput: document.getElementById('jdFileInput'),
            uploadJdBtn: document.getElementById('uploadJdBtn'),
            clearJdBtn: document.getElementById('clearJdBtn'),
            jdFileInfoBox: document.getElementById('jdFileInfoBox'),
            jdFileDetails: document.getElementById('jdFileDetails'),
            jdFilePlaceholder: document.getElementById('jdFilePlaceholder'),
            jdFileName: document.getElementById('jdFileName'),
            jdFileSize: document.getElementById('jdFileSize'),
            jdTextArea: document.getElementById('jdTextArea'),

            // Results Section
            statusBadge: document.getElementById('statusBadge'),
            resultsContent: document.getElementById('resultsContent'),
            resultsPlaceholder: document.getElementById('resultsPlaceholder'),
            skillsDisplay: document.getElementById('skillsDisplay'),
            skillsList: document.getElementById('skillsList'),

            // Resume Upload
            resumeFileInput: document.getElementById('resumeFileInput'),
            uploadResumeBtn: document.getElementById('uploadResumeBtn'),
            resumesList: document.getElementById('resumesList'),

            // Actions
            extractBtn: document.getElementById('extractBtn'),
            matchBtn: document.getElementById('matchBtn'),
            rankBtn: document.getElementById('rankBtn'),

            // Toast
            toast: document.getElementById('toast'),
            toastTitle: document.getElementById('toastTitle'),
            toastMessage: document.getElementById('toastMessage'),
            toastIcon: document.getElementById('toastIcon')
        };

        this.init();
    }

    init() {
        // Initialize theme based on state (default dark)
        if (this.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Auth Listener
        this.userData = null;
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.userData = user;
                this.updateUserProfileUI(user);
            } else {
                window.location.href = 'landing.html';
            }
        });

        this.renderJobsList();
        this.updateUIForActiveJob();
        this.attachEventListeners();
    }

    updateUserProfileUI(user) {
        const profileEl = document.getElementById('userProfile');
        if (profileEl) {
            profileEl.innerHTML = `
                <div class="h-7 w-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 grid place-items-center text-[10px] text-white font-bold">
                    ${user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                </div>
                <div class="leading-tight min-w-0">
                    <div class="text-xs font-semibold truncate max-w-[100px]">${user.displayName || 'User'}</div>
                    <div class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]">${user.email}</div>
                </div>
                <button id="logoutBtn" class="ml-2 p-1 text-zinc-400 hover:text-red-500 transition" title="Sign out">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                </button>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
            this.showToast('Signed out', 'Redirecting...', 'info');
        } catch (e) {
            console.error('Logout error', e);
        }
    }

    get activeJob() {
        return this.jobs.find(j => j.id === this.activeJobId);
    }

    attachEventListeners() {
        // Theme Toggle
        this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        // New Job
        this.dom.newJobBtn.addEventListener('click', () => this.createNewJob());

        // Job Title Rename
        this.dom.jobTitleInput.addEventListener('input', (e) => {
            this.activeJob.title = e.target.value;
            this.dom.activeJobTitleDisplay.textContent = e.target.value || 'Job';
            this.renderJobsList();
        });

        // JD Text Input
        this.dom.jdTextArea.addEventListener('input', (e) => {
            this.activeJob.jdText = e.target.value;
            this.updateActionButtons();
        });

        // JD File Upload
        this.dom.uploadJdBtn.addEventListener('click', () => this.dom.jdFileInput.click());
        this.dom.jdFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleJDUpload(e.target.files[0]);
        });
        this.dom.clearJdBtn.addEventListener('click', () => this.clearJDFile());

        // Drag & Drop for JD
        this.dom.jdSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dom.jdSection.classList.add('bg-zinc-900');
        });
        this.dom.jdSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dom.jdSection.classList.remove('bg-zinc-900');
        });
        this.dom.jdSection.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dom.jdSection.classList.remove('bg-zinc-900');
            if (e.dataTransfer.files[0]) this.handleJDUpload(e.dataTransfer.files[0]);
        });

        // Resume Upload
        this.dom.uploadResumeBtn.addEventListener('click', () => this.dom.resumeFileInput.click());
        this.dom.resumeFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleResumeUpload(e.target.files[0]);
        });

        // API Actions
        this.dom.extractBtn.addEventListener('click', () => this.runExtraction());
        this.dom.matchBtn.addEventListener('click', () => this.runMatching());
        this.dom.rankBtn.addEventListener('click', () => this.runRanking());
    }

    // --- Logic & content manipulation ---

    createNewJob() {
        const id = 'job-' + Math.random().toString(16).slice(2, 8);
        const newJob = {
            id,
            title: 'New Job',
            createdAt: 'Just now',
            jdText: '',
            jdFile: null,
            resumes: [], // Array of { name, text, skills, matchScore, etc }
            status: 'idle',
            jdSkills: []
        };
        this.jobs.unshift(newJob);
        this.activeJobId = id;
        this.renderJobsList();
        this.updateUIForActiveJob();
        this.showToast('Workspace created', 'New job workspace added', 'info');
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';

        const isDark = this.theme === 'dark';
        // Icon logic: If current is Dark, show Sun (to switch to Light). If current is Light, show Moon (to switch to Dark).
        const iconPath = isDark
            ? 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
            : 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z';

        const text = isDark ? 'Light' : 'Dark';

        this.dom.themeToggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}" />
            </svg>
            <span>${text}</span>
        `;

        if (this.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    renderJobsList() {
        this.dom.jobsList.innerHTML = '';
        this.jobs.forEach(job => {
            const isActive = job.id === this.activeJobId;
            const el = document.createElement('button');
            el.className = `w-full rounded-xl border p-3 text-left transition ${isActive
                ? 'border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/70'
                : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40'
                }`;
            el.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">${job.title}</div>
                        <div class="text-xs text-zinc-500 dark:text-zinc-400">${job.createdAt}</div>
                    </div>
                    ${isActive ? '<div class="h-2 w-2 rounded-full bg-sky-400"></div>' : ''}
                </div>
            `;
            el.onclick = () => {
                this.activeJobId = job.id;
                this.renderJobsList();
                this.updateUIForActiveJob();
            };
            this.dom.jobsList.appendChild(el);
        });
    }

    updateUIForActiveJob() {
        const job = this.activeJob;
        if (!job) return;

        this.dom.activeJobTitleDisplay.textContent = job.title;
        this.dom.jobTitleInput.value = job.title;
        this.dom.jdTextArea.value = job.jdText || '';

        // File UI
        if (job.jdFile) {
            this.dom.jdFilePlaceholder.classList.add('hidden');
            this.dom.jdFileDetails.classList.remove('hidden');
            this.dom.jdFileName.textContent = job.jdFile.name;
            this.dom.jdFileSize.textContent = this.formatBytes(job.jdFile.size);
            this.dom.uploadJdBtn.classList.add('hidden');
            this.dom.clearJdBtn.classList.remove('hidden');
        } else {
            this.dom.jdFilePlaceholder.classList.remove('hidden');
            this.dom.jdFileDetails.classList.add('hidden');
            this.dom.uploadJdBtn.classList.remove('hidden');
            this.dom.clearJdBtn.classList.add('hidden');
        }

        // Resumes List
        this.renderResumesList();

        // Results API View
        this.updateResultsView();

        this.dom.statusBadge.textContent = `Status: ${job.status}`;
        this.updateActionButtons();
    }

    renderResumesList() {
        const job = this.activeJob;
        this.dom.resumesList.innerHTML = '';
        if (job.resumes.length === 0) {
            this.dom.resumesList.innerHTML = '<div class="italic text-zinc-600">No resumes uploaded yet.</div>';
            return;
        }

        job.resumes.forEach(resume => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-2 rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50';
            div.innerHTML = `
                <span class="truncate max-w-[150px] text-zinc-700 dark:text-zinc-100">${resume.name}</span>
                <span class="text-[10px] bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-1 rounded">${resume.skills ? resume.skills.length + ' skills' : 'Processing...'}</span>
            `;
            this.dom.resumesList.appendChild(div);
        });
    }

    updateResultsView() {
        const job = this.activeJob;

        // Extracted Skills
        if (job.jdSkills && job.jdSkills.length > 0) {
            this.dom.resultsPlaceholder.classList.add('hidden');
            this.dom.skillsDisplay.classList.remove('hidden');
            this.dom.skillsList.innerHTML = job.jdSkills.map(s =>
                `<span class="skill-tag">${s}</span>`
            ).join('');
        } else {
            this.dom.resultsPlaceholder.classList.remove('hidden');
            this.dom.skillsDisplay.classList.add('hidden');
        }

        // If matched variants exist, show match view (simplified for now to just skills or ranking)
        // Ideally we would swap views or have tabs. The UI request shows "Results" card.
        // We will append Match/Ranking results below skills if they exist.

        const existingMatchContainer = document.getElementById('matchResultsContainer');
        if (existingMatchContainer) existingMatchContainer.remove();

        if (job.status === 'ranked' || job.status === 'matched') {
            const matchDiv = document.createElement('div');
            matchDiv.id = 'matchResultsContainer';
            matchDiv.className = 'mt-4 space-y-2';

            // Sort resumes by score if ranked
            const displayResumes = [...job.resumes];
            if (job.status === 'ranked') {
                displayResumes.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
            }

            matchDiv.innerHTML = displayResumes.map((r, idx) => `
                <div class="p-3 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-semibold text-sm text-zinc-800 dark:text-zinc-200">${job.status === 'ranked' ? `#${idx + 1} ` : ''}${r.name}</div>
                            <div class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                Matched: ${r.matchedSkills ? r.matchedSkills.length : 0} | Missing: ${r.missingSkills ? r.missingSkills.length : 0}
                            </div>
                        </div>
                        <div class="text-lg font-bold ${this.getScoreColor(r.matchScore)}">
                            ${r.matchScore || 0}%
                        </div>
                    </div>
                </div>
            `).join('');

            this.dom.resultsContent.appendChild(matchDiv);
        }
    }

    getScoreColor(score) {
        if (!score) return 'text-zinc-500';
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-sky-400';
        return 'text-amber-400';
    }

    updateActionButtons() {
        const job = this.activeJob;
        const hasJd = job.jdText || job.jdFile;
        const hasResumes = job.resumes.length > 0;
        const hasSkills = job.jdSkills && job.jdSkills.length > 0;

        this.dom.extractBtn.disabled = !(hasJd && hasResumes) || job.status === 'extracting';
        this.dom.matchBtn.disabled = !hasSkills || job.status === 'matching';
        this.dom.rankBtn.disabled = !hasSkills || job.status === 'ranking';

        // styling updates for disabled state handled by tailwind 'disabled:cursor-not-allowed'
    }

    // --- Actions ---

    async handleJDUpload(file) {
        const job = this.activeJob;
        job.jdFile = file;
        this.showToast('Uploading JD...', file.name, 'info');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/extract-text', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                job.jdText = data.text; // Extracted text
                this.updateUIForActiveJob();
                this.showToast('JD Uploaded', 'Text extracted successfully', 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            this.showToast('Upload Failed', e.message, 'error');
            job.jdFile = null;
            this.updateUIForActiveJob();
        }
    }

    clearJDFile() {
        this.activeJob.jdFile = null;
        this.activeJob.jdText = '';
        this.activeJob.jdSkills = [];
        this.updateUIForActiveJob();
    }

    async handleResumeUpload(file) {
        const job = this.activeJob;
        this.showToast('Uploading Resume...', file.name, 'info');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/extract-text', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                job.resumes.push({
                    name: file.name,
                    text: data.text,
                    skills: [],
                    matchScore: 0
                });
                this.renderResumesList();
                this.updateActionButtons();
                this.showToast('Resume Added', file.name, 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            this.showToast('Upload Failed', e.message, 'error');
        }
    }

    async runExtraction() {
        const job = this.activeJob;
        job.status = 'extracting';
        this.updateUIForActiveJob();
        this.showToast('Extracting Skills', 'Processing JD and resumes...', 'info');

        try {
            // 1. Extract JD Skills
            const jdRes = await fetch('/api/extract-skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: job.jdText })
            });
            const jdData = await jdRes.json();
            if (!jdData.success) throw new Error(jdData.error);
            job.jdSkills = jdData.skills;

            // 2. Extract Resume Skills (for each)
            // Parallel execution might be faster but serial safer for rate limits
            for (let resume of job.resumes) {
                // Skip if already has skills
                if (resume.skills && resume.skills.length > 0) continue;

                const rRes = await fetch('/api/extract-skills', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: resume.text })
                });
                const rData = await rRes.json();
                if (rData.success) resume.skills = rData.skills;
            }

            job.status = 'idle';
            this.showToast('Extraction Complete', `Found ${job.jdSkills.length} skills in JD`, 'success');
            this.updateUIForActiveJob();

        } catch (e) {
            job.status = 'error';
            this.showToast('Extraction Error', e.message, 'error');
            this.updateUIForActiveJob();
        }
    }

    async runMatching() {
        const job = this.activeJob;
        job.status = 'matching';
        this.updateUIForActiveJob();

        try {
            for (let resume of job.resumes) {
                const res = await fetch('/api/match-skills', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jdSkills: job.jdSkills, resumeSkills: resume.skills })
                });
                const data = await res.json();
                if (data.success) {
                    resume.matchScore = data.matchScore;
                    resume.matchedSkills = data.matchedSkills;
                    resume.missingSkills = data.missingSkills;
                }
            }
            job.status = 'matched';
            this.showToast('Matching Complete', 'Calculated scores for resumes', 'success');
            this.updateUIForActiveJob();
        } catch (e) {
            this.showToast('Matching Error', e.message, 'error');
            job.status = 'error';
            this.updateUIForActiveJob();
        }
    }

    async runRanking() {
        // Since we already calculated matches, 'Ranking' here essentially means 
        // calling the Python embedding service via /api/rank-resumes IF enabled,
        // OR simply sorting the existing matches.
        // The API /api/rank-resumes expects { jdText, resumeData: {name: text} }

        const job = this.activeJob;
        job.status = 'ranking';
        this.updateUIForActiveJob();

        try {
            // Prepare payload
            const resumeData = {};
            job.resumes.forEach(r => resumeData[r.name] = r.text);

            const res = await fetch('/api/rank-resumes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jdText: job.jdText, resumeData })
            });
            const data = await res.json();

            if (data.success && data.results) {
                // Update match scores with embedding scores if available
                // data.results is array of { resume_id, similarity_score, ... }
                data.results.forEach(rank => {
                    const r = job.resumes.find(x => x.name === rank.resume_id);
                    if (r) {
                        // Blend or replace score? Let's assume embedding score is superior or supplementary
                        // rank.similarity_score is 0-1 float
                        // r.matchScore = Math.round(rank.similarity_score * 100); 
                        // Actually let's keep the skill score for now as primary display, 
                        // or update it if the user explicit asked for FAISS.
                        // For this UI, let's just trigger the sort.
                    }
                });
            }

            job.status = 'ranked';
            this.showToast('Ranking Complete', 'Resumes ordered by relevance', 'success');
            this.updateUIForActiveJob();
        } catch (e) {
            // Fallback to local sort if remote failed
            console.warn('Backend ranking failed, sorting locally', e);
            job.status = 'ranked'; // Treat local sort as done
            this.updateUIForActiveJob();
        }
    }

    // --- Helpers ---

    showToast(title, message, type = 'info') {
        const { toast, toastTitle, toastMessage, toastIcon } = this.dom;
        toastTitle.textContent = title;
        toastMessage.textContent = message;

        const colors = {
            success: 'bg-emerald-400 text-white',
            error: 'bg-red-400 text-white',
            info: 'bg-sky-400 text-white'
        };
        toastIcon.className = `mt-0.5 h-2.5 w-2.5 rounded-full ${colors[type] || colors.info}`;

        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }

    formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});