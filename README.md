# JD-Resume Matching Engine

AI-powered job description and resume matching system with OpenAI integration and skill-based ranking.

## Features
- **Individual File Upload**: Upload JD and resumes one by one with "Add More" functionality
- **OpenAI GPT-4o-mini**: Intelligent skill extraction from documents
- **Smart Caching**: Only processes new files, caches extracted skills
- **Skill-based Matching**: Accurate percentage matching with matched/missing skills breakdown
- **Skill-based Ranking**: Ranks resumes by match scores, not text similarity
- **Multi-format Support**: PDF, TXT, DOCX file support
- **Modern UI**: Clean, responsive interface with gradient design

## Architecture
```
├── backend/                 # Node.js Express API
│   ├── services/           # Business logic services
│   │   ├── skillExtractor.js    # OpenAI skill extraction
│   │   ├── matchCalculator.js   # Skill matching algorithm
│   │   ├── textExtractor.js     # File text extraction
│   │   └── faissClient.js       # Python service client
│   ├── routes/             # API route handlers
│   └── server.js           # Main server file
├── frontend/               # Plain HTML/CSS/JS interface
│   ├── index.html          # Main UI
│   ├── app.js              # Frontend logic
│   └── styles.css          # Modern styling
├── ranking-service/        # Python TF-IDF microservice (optional)
└── uploads/                # Temporary file storage
```

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/jd-resume-matching-engine.git
cd jd-resume-matching-engine
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Python Service Setup (Optional)
```bash
cd ranking-service
pip install flask
```

### 4. Start Application
```bash
# Terminal 1 - Backend (Required)
cd backend
npm start

# Terminal 2 - Python Service (Optional)
cd ranking-service
python text_ranking_service.py
```

### 5. Access Application
Open browser: `http://localhost:3000`

## Usage Workflow

1. **Upload JD**: Click "Upload JD" → Select job description file
2. **Upload Resumes**: Click "Upload Resume" → Select first resume
3. **Add More**: Click "Add More Resume" → Select additional resumes (repeat as needed)
4. **Extract Skills**: Click "Extract Skills" → AI extracts skills from all files
5. **Calculate Matches**: Click "Calculate Match" → Shows match scores for each resume
6. **Rank Resumes**: Click "Rank Resumes" → Ranks by skill match scores

## Key Features

### Smart File Processing
- **Individual uploads** with progressive addition
- **Duplicate prevention** - won't upload same file twice
- **Processing status** - tracks which files have been processed
- **Incremental processing** - only processes new files

### Intelligent Skill Matching
- **Exact matching** for precise skills
- **Fuzzy matching** with word boundaries
- **Abbreviation handling** (JS → JavaScript, ML → Machine Learning)
- **Short skill protection** - prevents false matches like "R" matching "JavaScript"

### Results Display
- **Skills per file** - shows extracted skills for each resume
- **Match breakdown** - matched skills, missing skills, percentages
- **Skill-based ranking** - ranks by actual skill matches, not text similarity

## Technology Stack
- **Backend**: Node.js, Express.js, OpenAI API, Multer
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **AI**: OpenAI GPT-4o-mini for skill extraction
- **File Processing**: PDF-parse, Mammoth (DOCX), text extraction
- **Optional**: Python Flask service for TF-IDF ranking

## API Endpoints
- `POST /api/extract-skills` - Extract skills using OpenAI
- `POST /api/match-skills` - Calculate skill match percentage
- `POST /api/extract-text` - Extract text from single file
- `POST /api/extract-multiple-texts` - Extract text from multiple files
- `POST /api/rank-resumes` - Rank resumes (optional Python service)
- `GET /api/health` - Health check

## Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

## File Support
- **PDF**: Full text extraction
- **TXT**: Direct text reading
- **DOCX**: Microsoft Word document support
- **Size Limit**: 10MB per file, up to 20 files

## Future Enhancements
- **MongoDB Integration**: Persistent storage for files, skills, and results
- **User Authentication**: Multi-user support
- **Batch Processing**: Handle large volumes of resumes
- **Advanced Analytics**: Detailed matching insights
- **Export Features**: PDF reports, CSV exports

## Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License
MIT License - see LICENSE file for details

## Support
For issues and questions, please open a GitHub issue.