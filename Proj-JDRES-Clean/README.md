# Automated Google Drive Resume Import & Matching Architecture

This document outlines the detailed design, workflow, and security model for the **Automated Drive Resume Import** feature. This system allows recruiters to simply paste a Google Drive link, and the system automatically ingests, processes, and stores resumes while maintaining data privacy between different recruiters.

---

## 1. System Architecture

The system follows a **Microservices-based architecture** to separate concerns:

1.  **Frontend (UI)**: React/HTML Interface where recruiters log in and paste Drive links.
2.  **Spring Boot Backend (Gatekeeper)**: Handles User Authentication, Security, and forwards requests to the Python Service.
3.  **Python Microservice (The Worker)**: Handles Google Drive connection, PDF Parsing, and AI Processing.
4.  **MongoDB (Shared Storage)**: Stores unstructured resume data, metadata, and link associations.

```mermaid
graph TD
    A[Recruiter (Frontend)] -->|1. Paste Drive Link| B(Spring Boot Backend)
    B -->|2. Authorize & Forward request with RecruiterID| C(Python Extraction Service)
    C -->|3. Connect via System Creds| D[Google Drive API]
    C -->|4. Check Duplicates & Store| E[(MongoDB)]
    A -->|5. View My Resumes| B
    B -->|6. Fetch filtered by RecruiterID| E
```

---

## 2. The Workflow (Step-by-Step)

### Phase 1: Authentication & Drive Access
*   **The Problem**: We don't want every recruiter to have to set up their own Google Cloud Console project or login repeatedly.
*   **The Solution (System Account)**:
    *   The Python Service uses a "Master" Google Account (e.g., `krish23306@gmail.com`) via a saved `token.json`.
    *   Recruiters simply "Share" their resume folder with this Master Email (or just provide a public link if the organization allows).
    *   The system uses the Master credentials to read the provided link.

### Phase 2: Duplicate Prevention (Incremental Sync)
*   **Goal**: If a recruiter adds 10 new resumes to an old folder, we should only process the 10 new ones.
*   **Logic**:
    1.  The Python Service lists all File IDs in the given Drive Folder.
    2.  It queries MongoDB: `db.resumes.find({ fileId: { $in: [list_of_drive_ids] } })`.
    3.  It compares the two lists.
    4.  **Action**: It *skips* any ID that already exists in the DB and downloads *only* the new files.

### Phase 3: Extraction & Parsing
*   **Tooling**: `PyPDF2` (for text) and `pdfminer`.
*   **Process**:
    1.  Download PDF stream (in-memory, no disk save required).
    2.  Extract raw text.
    3.  (Future) Send raw text to OpenAI to structure it (Skills, Experience, formatting).

### Phase 4: Storage schema (Multi-Tenancy)
*   **Goal**: Recruiter A must NOT see Recruiter B's resumes.
*   **Strategy**: Every document in MongoDB is "tagged" with the `recruiter_id` (from their login session).

**MongoDB Schema (`resumes` collection):**
```json
{
  "_id": "ObjectId(...)",
  "recruiterId": "user_12345",       // <<CRITICAL: Links resume to specific user
  "fileId": "1A2B3C4D...",           // Google Drive File ID (for deduplication)
  "fileName": "John_Doe_Resume.pdf",
  "driveLink": "https://drive.google...", 
  "extractedText": "Experienced Java Developer...",
  "skills": ["Java", "Spring", "MongoDB"], // Populated by AI later
  "source": "google_drive",
  "importedAt": "2026-01-13T10:00:00Z"
}
```

---

## 3. How Multi-Tenancy / Privacy Works

This is the most important security aspect. We handle this at the **Query Level**.

1.  **Importing**:
    *   When Recruiter A (ID: `user_123`) pastes a link, the Frontend sends this ID to the Python Service.
    *   The Service saves the resume with `"recruiterId": "user_123"`.

2.  **Viewing**:
    *   When Recruiter A goes to their dashboard, the API calls:
        `db.resumes.find({ "recruiterId": "user_123" })`
    *   This guarantees they **never** return resumes belonging to `user_456`.

---

## 4. Implementation Details

### Stack
*   **Database**: MongoDB (Community Edition). High performance, schema-less.
*   **Python Service**: Flask API.
*   **Google Auth**: OAuth2 with `drive.readonly` scope.
*   **Text Processing**: Python ecosystem (unmatched for NLP/AI).

### Why Python + MongoDB?
*   Resumes are unstructured. SQL tables require 50 joins to store skills, schools, jobs, projects. MongoDB stores it as one JSON document.
*   Python is the native language of AI. Integrating "Rank this candidate" or "Extract Skills" using LLMs is trivial in Python compared to Java.

---

## 5. Security Checklist
- [ ] **API Gateway**: The Python service should *not* be publicly accessible. It should only accept requests from the Spring Boot Backend (Verified IP/Secret Key).
- [ ] **Token Storage**: `token.json` and `client_secrets.json` must be stored in secure environment variables in Production, not committed to Git.
- [ ] **Rate Limiting**: Ensure one recruiter cannot flood the system requests, hitting Google API limits for everyone.

---

## 6. Future Roadmap
1.  **AI Parsing**: Integrate OpenAI API to convert the `extractedText` string into structured JSON (Skills, Years of Exp).
2.  **Webhooks**: Instead of manual "Sync", use Drive Webhooks to auto-import when a file is dropped in a folder.
3.  **Vector Search**: Store resume embeddings in MongoDB Atlas Vector Search for semantic matching (e.g., matching "ML Engineer" with "Data Scientist" resumes).
