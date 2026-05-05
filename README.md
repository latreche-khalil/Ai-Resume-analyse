# AI Resume Analyzer & Career Mentor

A state-of-the-art, **Privacy-by-Design** platform for AI-powered resume analysis, semantic matching, and career coaching. Built with a robust multi-agent architecture and enterprise-grade security.

## 🚀 Key Features

- **Privacy-by-Design**: Integrated PII (Personally Identifiable Information) masking using Microsoft Presidio. Sensitive data never leaves the local environment unmasked.
- **Multi-Agent Orchestration**: Specialized AI agents for CV-JD matching, Gap Analysis, and Explainable AI (XAI).
- **Semantic Matching**: Beyond keyword matching—understands intent, seniority, and transferable skills.
- **Learning Roadmap**: Automatically generates personalized learning paths to bridge detected skill gaps.
- **Enterprise-Ready**: Includes audit trails, rate limiting, circuit breakers, and comprehensive logging.

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **AI/NLP**: OpenRouter (Llama 3.1/405B), Microsoft Presidio, Docling, EasyOCR
- **Database**: PostgreSQL (SQLAlchemy 2.0), Redis (Caching), ChromaDB (Vector Search)
- **Monitoring**: Sentry, Prometheus, Loguru

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Framer Motion (Animations)
- **UI Components**: Shadcn UI / Custom Premium Components
- **State Management**: React Hooks & Context API

## 🏁 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+

### Quick Setup (Docker)
1. Clone the repository
2. Create a `.env` file based on `.env.example`
3. Run `docker-compose up --build`

### Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔒 Security & Privacy

This project implements a **Dual Privacy Gateway**:
1. **Local Detection**: PII is detected locally using Regex and NER.
2. **Masking & Tokenization**: Sensitive data is replaced with secure tokens before being sent to external LLM APIs.
3. **Owner Decryption**: Only the document owner can see the unmasked data.

## 📄 License

This project is private and intended for university project submission.

---
Created with ❤️ by Latreche Khalil
