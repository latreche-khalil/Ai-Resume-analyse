# Design Document: AI Resume Analyzer & Career Mentor Platform

## Overview

The AI Resume Analyzer & Career Mentor is a privacy-first, AI-powered platform that analyzes resumes, matches candidates with job descriptions, identifies skill gaps, and provides career coaching. The system implements a mandatory Privacy Gateway that detects and masks PII before any external LLM processing, ensuring GDPR and EU AI Act compliance.

### Key Design Principles

1. **Privacy by Design**: All documents pass through PII detection and masking before external processing
2. **Multi-Agent Architecture**: Specialized AI agents handle different aspects of analysis
3. **Async-First**: Heavy processing tasks run asynchronously to maintain API responsiveness
4. **Multilingual Support**: Native support for Arabic, English, and French
5. **Explainability**: SHAP-based explanations for all AI decisions
6. **Scalability**: Horizontal scaling through containerization and task queues
7. **Security**: End-to-end encryption, RBAC, and comprehensive audit trails

### Technology Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, ShadcnUI, 21st.dev, UI/UX Pro Max, Framer Motion, Lucide React
- **Backend**: FastAPI, Python 3.11, AsyncIO, Pydantic
- **Database**: PostgreSQL 15 (relational data), ChromaDB (vector embeddings)
- **Cache/Queue**: Redis (caching + Celery broker)
- **Task Queue**: Celery with Redis backend
- **Security**: ClamAV (antivirus), Presidio (PII detection), bcrypt (password hashing)
- **NLP**: spaCy (ar_core_news_lg, en_core_web_lg, fr_core_news_lg)
- **LLM**: Google Gemini 1.5 Pro (matching/analysis), Gemini 1.5 Flash (coaching)
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2
- **OCR**: Tesseract
- **Document Processing**: PyMuPDF (PDF), python-docx (DOCX)
- **Explainability**: SHAP
- **Monitoring**: Prometheus, Sentry, Loguru
- **Deployment**: Docker Compose (7 services)


## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Next.js Frontend]
    end
    
    subgraph "API Layer"
        API[FastAPI Backend]
    end
    
    subgraph "Processing Layer"
        CELERY[Celery Workers]
        PG[Privacy Gateway]
        MA[Multi-Agent System]
    end
    
    subgraph "Data Layer"
        PG_DB[(PostgreSQL)]
        REDIS[(Redis)]
        CHROMA[(ChromaDB)]
    end
    
    subgraph "Security Layer"
        CLAM[ClamAV]
    end
    
    subgraph "External Services"
        GEMINI[Google Gemini API]
    end
    
    WEB -->|HTTPS| API
    API -->|Queue Tasks| REDIS
    API -->|Read/Write| PG_DB
    API -->|Scan Files| CLAM
    
    CELERY -->|Consume Tasks| REDIS
    CELERY -->|Process Documents| PG
    CELERY -->|AI Analysis| MA
    CELERY -->|Store Data| PG_DB
    CELERY -->|Store Embeddings| CHROMA
    
    PG -->|Detect PII| PG
    PG -->|Mask & Store| PG_DB
    
    MA -->|Masked Data Only| GEMINI
    MA -->|Retrieve Context| CHROMA
    MA -->|Local NLP| MA
    
    API -->|Cache| REDIS
```

### Docker Services Architecture

The platform consists of 7 Docker services orchestrated via Docker Compose:

1. **frontend** (Next.js 14)
   - Port: 3000
   - Serves the web UI
   - Communicates with backend via REST API
   - Implements SSR for SEO and performance

2. **backend** (FastAPI)
   - Port: 8000
   - REST API endpoints
   - Authentication and authorization
   - Request validation and routing
   - Synchronous operations only

3. **celery-worker** (Celery)
   - No exposed port
   - Processes async tasks from Redis queue
   - Handles CV processing, matching, gap analysis
   - Scales horizontally for load distribution

4. **postgres** (PostgreSQL 15)
   - Port: 5432
   - Stores relational data (users, documents, analysis records)
   - Encrypted PII mappings
   - Audit trails

5. **redis** (Redis 7)
   - Port: 6379
   - Celery task broker (DB 0)
   - Celery result backend (DB 1)
   - Application cache (DB 2)

6. **chromadb** (ChromaDB)
   - Port: 8001
   - Vector database for document embeddings
   - Semantic search capabilities
   - Persistent storage

7. **clamav** (ClamAV)
   - Port: 3310
   - Antivirus scanning for uploaded files
   - Real-time malware detection
   - Automatic signature updates

### Request Flow Patterns

#### Synchronous Flow (User Profile)
```
Client → API → PostgreSQL → API → Client
```

#### Asynchronous Flow (CV Upload & Analysis)
```
Client → API → Redis Queue → Client (task_id)
Client → API (poll status) → Redis → Client (status)

Background:
Celery Worker → Privacy Gateway → Extraction Agent → RAG Pipeline → PostgreSQL/ChromaDB
```

#### AI Analysis Flow (CV-JD Matching)
```
Celery Worker → Privacy Gateway (mask PII) → RAG Pipeline (retrieve context) 
→ Matching Agent → Gemini API (masked data) → Gap Agent → XAI Agent 
→ PostgreSQL (store results) → Webhook notification
```


## Components and Interfaces

### 1. Privacy Gateway

The Privacy Gateway is the most critical component, ensuring no PII reaches external LLM services.

#### Components

**PII Detector** (`services/privacy/pii_detector.py`)
- Uses Microsoft Presidio for entity recognition
- Integrates spaCy NER models (ar_core_news_lg, en_core_web_lg, fr_core_news_lg)
- Detects: NAME, EMAIL, PHONE, ADDRESS, ID_NUMBER, DATE_OF_BIRTH
- Returns confidence scores (0.0-1.0) for each detection
- Flags low-confidence detections (<0.7) for manual review

**Tokenizer** (`services/privacy/tokenizer.py`)
- Replaces PII with reversible masked tokens
- Token format: `{ENTITY_TYPE}_{SEQUENCE_NUMBER}` (e.g., NAME_1, EMAIL_2)
- Maintains token consistency across documents from same user
- Stores encrypted mappings in `pii_mappings` table

**Audit Trail** (`services/privacy/audit_trail.py`)
- Logs all PII detection, masking, and unmasking operations
- Immutable append-only log
- Retention: 2 years
- Fields: timestamp, user_id, operation, entity_type, confidence, legal_basis

#### Interface

```python
class PrivacyGateway:
    async def detect_pii(self, text: str, language: str) -> List[PIIEntity]:
        """Detect PII entities in text"""
        
    async def mask_pii(self, text: str, entities: List[PIIEntity], user_id: UUID) -> MaskedDocument:
        """Replace PII with masked tokens and store mappings"""
        
    async def unmask_pii(self, masked_text: str, user_id: UUID, legal_basis: str) -> str:
        """Restore original PII from masked tokens (requires legal basis)"""
        
    async def audit_log(self, operation: str, user_id: UUID, metadata: dict) -> None:
        """Log PII operation to audit trail"""
```

#### Privacy Gateway Flow

```mermaid
sequenceDiagram
    participant CV as CV Document
    participant PG as Privacy Gateway
    participant DB as PostgreSQL
    participant LLM as External LLM
    
    CV->>PG: Raw text
    PG->>PG: Detect PII (Presidio + spaCy)
    PG->>DB: Store encrypted PII mappings
    PG->>DB: Log to audit trail
    PG->>LLM: Masked text only
    LLM->>PG: Analysis result (with tokens)
    PG->>PG: Unmask if authorized
    PG->>DB: Log unmask operation
```


### 2. Multi-Agent System

The Multi-Agent System coordinates specialized AI agents for different analysis tasks.

#### Agent Architecture

```mermaid
graph LR
    ORCH[Orchestrator] --> EXTRACT[Extraction Agent]
    ORCH --> RAG[RAG Pipeline]
    ORCH --> MATCH[Matching Agent]
    ORCH --> GAP[Gap Agent]
    ORCH --> XAI[XAI Agent]
    
    EXTRACT -->|Structured Data| DB[(Database)]
    RAG -->|Embeddings| CHROMA[(ChromaDB)]
    MATCH -->|Match Scores| DB
    GAP -->|Gap Reports| DB
    XAI -->|Explanations| DB
    
    MATCH -->|Masked Data| GEMINI[Gemini API]
    GAP -->|Masked Data| GEMINI
```

#### Orchestrator (`services/intelligence/orchestrator.py`)

Coordinates agent execution with dependency management:

```python
class MultiAgentOrchestrator:
    async def process_cv_document(self, document_id: UUID) -> AnalysisRecord:
        """
        Orchestrates CV processing pipeline:
        1. Privacy Gateway (mask PII)
        2. Extraction Agent (local NLP)
        3. RAG Pipeline (embed and store)
        4. Return structured data
        """
        
    async def match_cv_to_jd(self, cv_id: UUID, jd_id: UUID) -> MatchResult:
        """
        Orchestrates matching pipeline:
        1. Retrieve masked CV and JD
        2. RAG Pipeline (retrieve relevant chunks)
        3. Matching Agent (semantic similarity via Gemini)
        4. Gap Agent (identify missing skills)
        5. XAI Agent (generate explanations)
        6. Store and return results
        """
```

#### Extraction Agent (`services/intelligence/extraction_agent.py`)

Local NLP processing using spaCy (no external API calls):

- **Skills Extraction**: Matches against 5000+ skill taxonomy
- **Job Titles**: Normalizes to O*NET classifications
- **Companies**: Extracts employer names
- **Education**: Identifies degrees (High School, Bachelor, Master, PhD)
- **Certifications**: Extracts professional certifications
- **Dates**: Normalizes to ISO 8601 format
- **Duration**: Calculates employment duration in months

```python
class ExtractionAgent:
    def __init__(self):
        self.nlp_ar = spacy.load("ar_core_news_lg")
        self.nlp_en = spacy.load("en_core_web_lg")
        self.nlp_fr = spacy.load("fr_core_news_lg")
        self.skill_taxonomy = load_skill_taxonomy()  # 5000+ skills
        
    async def extract_structured_data(self, masked_text: str, language: str) -> SkillReport:
        """Extract skills, experience, education from masked CV"""
```


#### RAG Pipeline (`services/intelligence/rag_pipeline.py`)

Implements Retrieval-Augmented Generation for semantic search:

- **Chunking**: Splits documents into 512-token chunks with 50-token overlap
- **Embedding**: Uses sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
- **Storage**: ChromaDB with metadata (document_id, chunk_index, language)
- **Retrieval**: Cosine similarity with 0.7 threshold, returns top 5 chunks

```python
class RAGPipeline:
    def __init__(self):
        self.embedder = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.chroma_client = chromadb.HttpClient(host="chromadb", port=8000)
        
    async def chunk_and_embed(self, document_id: UUID, text: str, language: str) -> None:
        """Chunk document, generate embeddings, store in ChromaDB"""
        
    async def semantic_search(self, query: str, top_k: int = 5) -> List[Chunk]:
        """Retrieve most relevant chunks for query"""
```

#### Matching Agent (`services/intelligence/matching_agent.py`)

Performs semantic CV-JD matching via Gemini API (masked data only):

- Retrieves relevant CV chunks via RAG Pipeline
- Sends masked CV + masked JD to Gemini 1.5 Pro
- Calculates match score (0.0-1.0)
- Identifies matching skills, missing skills, transferable skills
- Caches results for 24 hours

```python
class MatchingAgent:
    async def match(self, masked_cv: str, masked_jd: str, cv_chunks: List[Chunk]) -> MatchResult:
        """
        Semantic matching between CV and JD
        Returns: match_score, matching_skills, missing_skills, transferable_skills
        """
```

#### Gap Agent (`services/intelligence/gap_agent.py`)

Identifies skill gaps and generates learning roadmaps:

- Categorizes gaps: Critical, Important, Nice-to-Have
- Estimates time-to-acquire (weeks)
- Recommends courses, certifications, resources
- Identifies transferable skills

```python
class GapAgent:
    async def analyze_gaps(self, match_result: MatchResult, skill_report: SkillReport) -> GapReport:
        """
        Identify skill gaps and generate learning roadmap
        Returns: gaps (categorized), learning_roadmap, time_estimates
        """
```

#### XAI Agent (`services/intelligence/xai_agent.py`)

Generates explainability reports using Gemini LLM (not local SHAP):

- Uses Gemini 1.5 Pro to generate human-readable explanations
- Prompts LLM to provide SHAP-like feature importance analysis
- Identifies top 10 features contributing to match score
- Provides positive/negative contribution scores
- Generates counterfactual examples ("If you had X skill, your score would be Y")
- Complies with EU AI Act transparency requirements
- All data sent to Gemini is masked (no PII)

```python
class XAIAgent:
    def __init__(self):
        self.gemini_client = GeminiClient(model="gemini-1.5-pro")
        
    async def explain(self, match_result: MatchResult, cv_features: dict, jd_features: dict) -> XAIReport:
        """
        Generate LLM-based explanation for match score using Gemini API
        
        Prompt structure:
        - Provide masked CV features and JD requirements
        - Ask LLM to explain match score like SHAP analysis
        - Request feature importance ranking (top 10)
        - Request positive/negative contributions
        - Request counterfactual scenarios
        
        Returns: feature_importance, counterfactuals, visual_explanations
        """
        
        prompt = f"""
        You are an AI explainability expert. Analyze this CV-JD match and provide a SHAP-style explanation.
        
        Match Score: {match_result.match_score}
        CV Features: {cv_features}
        JD Requirements: {jd_features}
        
        Provide:
        1. Top 10 features that influenced the match score (with importance weights)
        2. Positive contributions (features that increased the score)
        3. Negative contributions (features that decreased the score)
        4. Counterfactual examples (e.g., "If the candidate had Python experience, the score would increase by 0.15")
        
        Format as JSON.
        """
        
        response = await self.gemini_client.generate(prompt)
        return self._parse_xai_response(response)
```


### 3. Document Processing Pipeline

Handles file upload, validation, text extraction, and OCR.

#### Document Ingestion (`services/document/ingestion.py`)

```python
class DocumentIngestionService:
    async def upload_cv(self, file: UploadFile, user_id: UUID) -> CVDocument:
        """
        1. Validate file size (<10MB) and format (PDF/DOCX/JPG/PNG)
        2. Scan with ClamAV
        3. Store original file
        4. Queue extraction task
        5. Return document_id
        """
```

#### Text Extraction (`services/document/extraction.py`)

```python
class TextExtractionService:
    async def extract_text(self, document_id: UUID) -> str:
        """
        Extract text based on file type:
        - PDF: PyMuPDF (10s timeout)
        - DOCX: python-docx (5s timeout)
        - Image: Tesseract OCR (60s timeout)
        
        Detect language: ar/en/fr (95% accuracy)
        Validate: minimum 50 words
        """
```

#### File Validation (`services/document/validation.py`)

```python
class FileValidationService:
    async def scan_virus(self, file_path: str) -> bool:
        """Scan file with ClamAV, return True if clean"""
        
    async def validate_format(self, file: UploadFile) -> bool:
        """Validate file format and size"""
```

### 4. Coaching Engine

AI-powered career coaching with chat and interview simulation.

#### Chat Engine (`services/coaching/chat_engine.py`)

```python
class ChatEngine:
    async def chat(self, user_id: UUID, message: str, session_id: UUID) -> ChatResponse:
        """
        Conversational AI using Gemini 1.5 Flash
        - Maintains context (20 messages)
        - Provides career advice based on Skill_Report and Gap_Report
        - Supports AR/EN/FR
        - Response time: <3s
        """
```

#### Interview Simulator (`services/coaching/interview_sim.py`)

```python
class InterviewSimulator:
    async def start_simulation(self, user_id: UUID, jd_id: UUID) -> SimulationSession:
        """Generate 5-10 role-specific questions"""
        
    async def evaluate_answer(self, session_id: UUID, question_id: UUID, answer: str) -> Evaluation:
        """
        Evaluate answer on:
        - Relevance (0.0-1.0)
        - Completeness (0.0-1.0)
        - Communication clarity (0.0-1.0)
        
        Provide feedback and improvement suggestions
        """
        
    async def generate_report(self, session_id: UUID) -> InterviewReport:
        """Generate final performance report with overall score"""
```


### 5. Recruiter Services

Tools for talent pool management, ranking, and export.

#### Ranking Service (`services/recruiter/ranking.py`)

```python
class RankingService:
    async def rank_candidates(self, jd_id: UUID, filters: RankingFilters) -> List[RankedCandidate]:
        """
        Rank candidates by match score
        Support filters: min_score, required_skills, experience_level, education
        Pagination: 20 per page
        """
```

#### Export Service (`services/recruiter/export.py`)

```python
class ExportService:
    async def export_pdf(self, jd_id: UUID, candidate_ids: List[UUID], anonymize: bool) -> bytes:
        """Generate PDF report with match scores, skills, XAI summaries"""
        
    async def export_csv(self, jd_id: UUID, candidate_ids: List[UUID], fields: List[str]) -> bytes:
        """Generate CSV with selected fields"""
```

### 6. Authentication and Authorization

#### JWT Authentication (`core/security.py`)

```python
class SecurityService:
    def create_access_token(self, user_id: UUID, role: UserRole) -> str:
        """Generate JWT token valid for 24 hours"""
        
    def verify_token(self, token: str) -> TokenPayload:
        """Verify and decode JWT token"""
        
    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt (cost factor 12)"""
        
    def verify_password(self, plain: str, hashed: str) -> bool:
        """Verify password against hash"""
```

#### Role-Based Access Control

- **Candidate Role**: Upload CVs, view own analysis, access coaching, export own data
- **Recruiter Role**: Create JDs, upload bulk CVs, view talent pools, export reports, unmask PII (with legal basis)
- **Admin Role**: System configuration, user management, audit trail access

#### Permission Matrix

| Resource | Candidate | Recruiter | Admin |
|----------|-----------|-----------|-------|
| Upload CV | Own | Bulk | All |
| View Analysis | Own | All | All |
| Create JD | No | Yes | Yes |
| Unmask PII | Own | With Legal Basis | Yes |
| Export Data | Own | Talent Pool | All |
| View Audit Logs | No | No | Yes |
| View System Metrics | No | No | Yes |
| Manage Users | No | No | Yes |


## Data Models

### Database Schema

```mermaid
erDiagram
    User ||--o{ CVDocument : uploads
    User ||--o{ JobDescription : creates
    User ||--o{ ChatSession : has
    User ||--o{ AuditLog : generates
    
    CVDocument ||--|| SkillReport : has
    CVDocument ||--o{ PIIMapping : contains
    CVDocument ||--o{ AnalysisRecord : analyzed_in
    
    JobDescription ||--o{ AnalysisRecord : matches
    
    AnalysisRecord ||--|| MatchResult : has
    AnalysisRecord ||--|| GapReport : has
    AnalysisRecord ||--|| XAIReport : has
    
    ChatSession ||--o{ ChatMessage : contains
    
    User ||--o{ InterviewSession : participates
    InterviewSession ||--o{ InterviewQuestion : contains
    InterviewQuestion ||--o{ InterviewAnswer : has
```

### Core Tables

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'recruiter', 'admin')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    preferred_language VARCHAR(2) DEFAULT 'en' CHECK (preferred_language IN ('ar', 'en', 'fr')),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### cv_documents
```sql
CREATE TABLE cv_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('pdf', 'docx', 'jpg', 'png')),
    extracted_text TEXT,
    masked_text TEXT,
    detected_language VARCHAR(2) CHECK (detected_language IN ('ar', 'en', 'fr')),
    word_count INTEGER,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected')),
    virus_scan_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
    
    CONSTRAINT file_size_limit CHECK (file_size_bytes <= 10485760),
    CONSTRAINT word_count_minimum CHECK (word_count IS NULL OR word_count >= 50)
);

CREATE INDEX idx_cv_documents_user_id ON cv_documents(user_id);
CREATE INDEX idx_cv_documents_status ON cv_documents(processing_status);
CREATE INDEX idx_cv_documents_created_at ON cv_documents(created_at);
CREATE INDEX idx_cv_documents_retention ON cv_documents(retention_until) WHERE deleted_at IS NULL;
```


#### pii_mappings
```sql
CREATE TABLE pii_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES cv_documents(id) ON DELETE CASCADE,
    masked_token VARCHAR(50) NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('NAME', 'EMAIL', 'PHONE', 'ADDRESS', 'ID_NUMBER', 'DATE_OF_BIRTH')),
    encrypted_value BYTEA NOT NULL,
    encryption_key_id VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.00 AND 1.00),
    flagged_for_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
    
    CONSTRAINT unique_masked_token_per_user UNIQUE (user_id, masked_token)
);

CREATE INDEX idx_pii_mappings_user_id ON pii_mappings(user_id);
CREATE INDEX idx_pii_mappings_document_id ON pii_mappings(document_id);
CREATE INDEX idx_pii_mappings_token ON pii_mappings(masked_token);
CREATE INDEX idx_pii_mappings_flagged ON pii_mappings(flagged_for_review) WHERE flagged_for_review = TRUE;
```

#### skill_reports
```sql
CREATE TABLE skill_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID UNIQUE NOT NULL REFERENCES cv_documents(id) ON DELETE CASCADE,
    skills JSONB NOT NULL DEFAULT '[]',
    job_titles JSONB NOT NULL DEFAULT '[]',
    companies JSONB NOT NULL DEFAULT '[]',
    education JSONB NOT NULL DEFAULT '[]',
    certifications JSONB NOT NULL DEFAULT '[]',
    total_experience_months INTEGER,
    extraction_confidence DECIMAL(3,2),
    flagged_for_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_skill_reports_document_id ON skill_reports(document_id);
CREATE INDEX idx_skill_reports_skills ON skill_reports USING GIN (skills);
```

#### job_descriptions
```sql
CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    required_skills JSONB NOT NULL DEFAULT '[]',
    preferred_skills JSONB NOT NULL DEFAULT '[]',
    experience_level VARCHAR(20) CHECK (experience_level IN ('entry', 'mid', 'senior', 'expert')),
    education_requirements JSONB,
    work_arrangement VARCHAR(20) CHECK (work_arrangement IN ('remote', 'hybrid', 'onsite')),
    salary_range_min INTEGER,
    salary_range_max INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT description_length CHECK (LENGTH(description) >= 100)
);

CREATE INDEX idx_job_descriptions_recruiter_id ON job_descriptions(recruiter_id);
CREATE INDEX idx_job_descriptions_active ON job_descriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_job_descriptions_created_at ON job_descriptions(created_at);
CREATE INDEX idx_job_descriptions_required_skills ON job_descriptions USING GIN (required_skills);
```


#### analysis_records
```sql
CREATE TABLE analysis_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_document_id UUID NOT NULL REFERENCES cv_documents(id) ON DELETE CASCADE,
    job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    match_score DECIMAL(3,2) NOT NULL CHECK (match_score BETWEEN 0.00 AND 1.00),
    matching_skills JSONB NOT NULL DEFAULT '[]',
    missing_skills JSONB NOT NULL DEFAULT '[]',
    transferable_skills JSONB NOT NULL DEFAULT '[]',
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_cv_jd_pair UNIQUE (cv_document_id, job_description_id)
);

CREATE INDEX idx_analysis_records_cv_id ON analysis_records(cv_document_id);
CREATE INDEX idx_analysis_records_jd_id ON analysis_records(job_description_id);
CREATE INDEX idx_analysis_records_match_score ON analysis_records(match_score DESC);
CREATE INDEX idx_analysis_records_status ON analysis_records(processing_status);
```

#### gap_reports
```sql
CREATE TABLE gap_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_record_id UUID UNIQUE NOT NULL REFERENCES analysis_records(id) ON DELETE CASCADE,
    critical_gaps JSONB NOT NULL DEFAULT '[]',
    important_gaps JSONB NOT NULL DEFAULT '[]',
    nice_to_have_gaps JSONB NOT NULL DEFAULT '[]',
    learning_roadmap JSONB NOT NULL DEFAULT '[]',
    estimated_time_weeks INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gap_reports_analysis_id ON gap_reports(analysis_record_id);
```

#### xai_reports
```sql
CREATE TABLE xai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_record_id UUID UNIQUE NOT NULL REFERENCES analysis_records(id) ON DELETE CASCADE,
    feature_importance JSONB NOT NULL DEFAULT '[]',
    positive_contributions JSONB NOT NULL DEFAULT '[]',
    negative_contributions JSONB NOT NULL DEFAULT '[]',
    counterfactuals JSONB NOT NULL DEFAULT '[]',
    visual_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_xai_reports_analysis_id ON xai_reports(analysis_record_id);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operation VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    entity_type VARCHAR(20),
    confidence_score DECIMAL(3,2),
    legal_basis VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT retention_period CHECK (created_at >= NOW() - INTERVAL '2 years')
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```


#### chat_sessions
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    context_data JSONB,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT message_limit CHECK (message_count <= 20)
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_active ON chat_sessions(is_active) WHERE is_active = TRUE;
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

#### interview_sessions
```sql
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
    overall_score DECIMAL(3,2) CHECK (overall_score BETWEEN 0.00 AND 1.00),
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
```

#### interview_questions
```sql
CREATE TABLE interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) CHECK (question_type IN ('behavioral', 'technical', 'situational')),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interview_questions_session_id ON interview_questions(session_id);
```

#### interview_answers
```sql
CREATE TABLE interview_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID UNIQUE NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    relevance_score DECIMAL(3,2) CHECK (relevance_score BETWEEN 0.00 AND 1.00),
    completeness_score DECIMAL(3,2) CHECK (completeness_score BETWEEN 0.00 AND 1.00),
    clarity_score DECIMAL(3,2) CHECK (clarity_score BETWEEN 0.00 AND 1.00),
    feedback TEXT,
    strengths JSONB DEFAULT '[]',
    improvements JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interview_answers_question_id ON interview_answers(question_id);
```


#### celery_tasks
```sql
CREATE TABLE celery_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) UNIQUE NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY')),
    priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('HIGH', 'NORMAL', 'LOW')),
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_celery_tasks_task_id ON celery_tasks(task_id);
CREATE INDEX idx_celery_tasks_status ON celery_tasks(status);
CREATE INDEX idx_celery_tasks_user_id ON celery_tasks(user_id);
CREATE INDEX idx_celery_tasks_priority ON celery_tasks(priority, created_at);
```

#### dead_letter_queue
```sql
CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    retry_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

CREATE INDEX idx_dlq_created_at ON dead_letter_queue(created_at);
CREATE INDEX idx_dlq_resolved ON dead_letter_queue(resolved_at) WHERE resolved_at IS NULL;
```

#### feedback
```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_record_id UUID REFERENCES analysis_records(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    feedback_type VARCHAR(20) CHECK (feedback_type IN ('accuracy', 'extraction', 'matching', 'general')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_analysis_id ON feedback(analysis_record_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);
```

### ChromaDB Collections

ChromaDB stores document embeddings for semantic search:

**Collection: cv_embeddings**
- **id**: `{document_id}_{chunk_index}`
- **embedding**: 384-dimensional vector
- **metadata**:
  - `document_id`: UUID
  - `user_id`: UUID
  - `chunk_index`: integer
  - `language`: ar/en/fr
  - `chunk_text`: masked text
  - `created_at`: timestamp

**Collection: jd_embeddings**
- **id**: `{jd_id}_{chunk_index}`
- **embedding**: 384-dimensional vector
- **metadata**:
  - `jd_id`: UUID
  - `recruiter_id`: UUID
  - `chunk_index`: integer
  - `chunk_text`: text
  - `created_at`: timestamp


### Pydantic Schemas

#### User Schemas
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])')
    role: Literal['candidate', 'recruiter']
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    preferred_language: Literal['ar', 'en', 'fr'] = 'en'

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    first_name: Optional[str]
    last_name: Optional[str]
    preferred_language: str
    email_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400
```

#### Document Schemas
```python
class CVDocumentCreate(BaseModel):
    original_filename: str
    file_size_bytes: int = Field(..., le=10485760)
    file_format: Literal['pdf', 'docx', 'jpg', 'png']

class CVDocumentResponse(BaseModel):
    id: UUID
    user_id: UUID
    original_filename: str
    file_format: str
    detected_language: Optional[str]
    word_count: Optional[int]
    processing_status: str
    virus_scan_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SkillReportResponse(BaseModel):
    id: UUID
    document_id: UUID
    skills: List[dict]
    job_titles: List[dict]
    companies: List[dict]
    education: List[dict]
    certifications: List[dict]
    total_experience_months: Optional[int]
    extraction_confidence: Optional[float]
    
    class Config:
        from_attributes = True
```

#### Analysis Schemas
```python
class AnalysisRecordResponse(BaseModel):
    id: UUID
    cv_document_id: UUID
    job_description_id: UUID
    match_score: float
    matching_skills: List[dict]
    missing_skills: List[dict]
    transferable_skills: List[dict]
    processing_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class GapReportResponse(BaseModel):
    id: UUID
    analysis_record_id: UUID
    critical_gaps: List[dict]
    important_gaps: List[dict]
    nice_to_have_gaps: List[dict]
    learning_roadmap: List[dict]
    estimated_time_weeks: Optional[int]
    
    class Config:
        from_attributes = True

class XAIReportResponse(BaseModel):
    id: UUID
    analysis_record_id: UUID
    feature_importance: List[dict]
    positive_contributions: List[dict]
    negative_contributions: List[dict]
    counterfactuals: List[dict]
    
    class Config:
        from_attributes = True
```


#### Task Schemas
```python
class TaskResponse(BaseModel):
    task_id: str
    status: Literal['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']
    result: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class BulkUploadResponse(BaseModel):
    task_id: str
    total_files: int
    queued_files: int
    failed_files: List[dict]
```

#### Coaching Schemas
```python
class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class ChatMessageResponse(BaseModel):
    id: UUID
    role: Literal['user', 'assistant']
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class InterviewSimulationStart(BaseModel):
    job_description_id: UUID

class InterviewAnswerSubmit(BaseModel):
    question_id: UUID
    answer: str = Field(..., min_length=10)

class InterviewEvaluationResponse(BaseModel):
    relevance_score: float
    completeness_score: float
    clarity_score: float
    feedback: str
    strengths: List[str]
    improvements: List[str]
```

#### Recruiter Schemas
```python
class JobDescriptionCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=100)
    required_skills: List[str]
    preferred_skills: Optional[List[str]] = []
    experience_level: Literal['entry', 'mid', 'senior', 'expert']
    education_requirements: Optional[dict] = None
    work_arrangement: Optional[Literal['remote', 'hybrid', 'onsite']] = None

class RankingFilters(BaseModel):
    min_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    required_skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    education: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

class RankedCandidateResponse(BaseModel):
    cv_document_id: UUID
    user_id: UUID
    match_score: float
    matching_skills: List[dict]
    missing_skills: List[dict]
    key_highlights: List[str]
    
class ExportRequest(BaseModel):
    candidate_ids: List[UUID]
    format: Literal['pdf', 'csv']
    anonymize: bool = False
    fields: Optional[List[str]] = None
```


## API Design

### Base URL
```
Production: https://api.ai-resume-analyzer.com/v1
Development: http://localhost:8000/v1
```

### Authentication
All endpoints except `/auth/register` and `/auth/login` require JWT authentication via `Authorization: Bearer <token>` header.

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  }
}
```

### API Endpoints

#### 1. Authentication Module

**POST /auth/register**
```
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "candidate",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "en"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": { UserResponse },
    "message": "Verification email sent"
  }
}

Errors:
- 400: Email already exists
- 400: Password does not meet requirements
- 422: Validation error
```

**POST /auth/login**
```
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": { UserResponse }
  }
}

Errors:
- 401: Invalid credentials (500ms delay)
- 422: Validation error
```

**POST /auth/logout**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Logged out successfully"
}
```

**POST /auth/refresh**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "expires_in": 86400
  }
}
```


#### 2. User Profile Module

**GET /users/me**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": { UserResponse }
}
```

**PATCH /users/me**
```
Headers: Authorization: Bearer <token>

Request:
{
  "first_name": "Jane",
  "preferred_language": "fr"
}

Response: 200 OK
{
  "success": true,
  "data": { UserResponse }
}
```

**DELETE /users/me**
```
Headers: Authorization: Bearer <token>

Response: 202 Accepted
{
  "success": true,
  "message": "Account deletion scheduled. Data will be permanently deleted within 30 days."
}
```

**GET /users/me/export**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
Content-Type: application/json
Content-Disposition: attachment; filename="user_data.json"

{
  "user": { ... },
  "cv_documents": [ ... ],
  "analysis_records": [ ... ],
  "chat_sessions": [ ... ]
}

Processing Time: <5 minutes
```

#### 3. CV Document Module

**POST /documents/upload**
```
Headers: 
  Authorization: Bearer <token>
  Content-Type: multipart/form-data

Request:
  file: <binary>

Response: 202 Accepted
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "task_id": "task_uuid",
    "status": "PENDING"
  }
}

Errors:
- 400: File size exceeds 10MB
- 400: Unsupported file format
- 400: Virus detected
- 413: Payload too large
```

**GET /documents/{document_id}**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": { CVDocumentResponse }
}

Errors:
- 404: Document not found
- 403: Access denied
```

**GET /documents**
```
Headers: Authorization: Bearer <token>

Query Parameters:
  - page: integer (default: 1)
  - page_size: integer (default: 20, max: 100)
  - status: string (pending|processing|completed|failed)

Response: 200 OK
{
  "success": true,
  "data": {
    "documents": [ CVDocumentResponse ],
    "total": 45,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```

**DELETE /documents/{document_id}**
```
Headers: Authorization: Bearer <token>

Response: 204 No Content

Errors:
- 404: Document not found
- 403: Access denied
```

**GET /documents/{document_id}/skill-report**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": { SkillReportResponse }
}

Errors:
- 404: Document or skill report not found
- 403: Access denied
```


#### 4. Job Description Module (Recruiter Only)

**POST /job-descriptions**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Request:
{
  "title": "Senior Full Stack Developer",
  "description": "We are seeking...",
  "required_skills": ["Python", "React", "PostgreSQL"],
  "preferred_skills": ["Docker", "AWS"],
  "experience_level": "senior",
  "work_arrangement": "hybrid"
}

Response: 201 Created
{
  "success": true,
  "data": { JobDescriptionResponse }
}

Errors:
- 403: Forbidden (not a recruiter)
- 400: Description too short (<100 words)
```

**GET /job-descriptions/{jd_id}**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Response: 200 OK
{
  "success": true,
  "data": { JobDescriptionResponse }
}
```

**GET /job-descriptions**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Query Parameters:
  - page: integer
  - page_size: integer
  - is_active: boolean
  - is_archived: boolean

Response: 200 OK
{
  "success": true,
  "data": {
    "job_descriptions": [ JobDescriptionResponse ],
    "total": 25,
    "page": 1,
    "page_size": 20
  }
}
```

**PATCH /job-descriptions/{jd_id}**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Request:
{
  "title": "Updated Title",
  "required_skills": ["Python", "React", "PostgreSQL", "Redis"]
}

Response: 200 OK
{
  "success": true,
  "data": { JobDescriptionResponse },
  "message": "Job description updated. Re-matching triggered for associated candidates."
}
```

**DELETE /job-descriptions/{jd_id}**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Response: 204 No Content
```

**POST /job-descriptions/{jd_id}/archive**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Response: 200 OK
{
  "success": true,
  "message": "Job description archived"
}
```


#### 5. Analysis Module

**POST /analysis/match**
```
Headers: Authorization: Bearer <token>

Request:
{
  "cv_document_id": "uuid",
  "job_description_id": "uuid"
}

Response: 202 Accepted
{
  "success": true,
  "data": {
    "analysis_id": "uuid",
    "task_id": "task_uuid",
    "status": "PENDING",
    "estimated_time_seconds": 30
  }
}

Errors:
- 404: CV or JD not found
- 403: Access denied
- 409: Analysis already exists (returns existing analysis_id)
```

**GET /analysis/{analysis_id}**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "analysis": { AnalysisRecordResponse },
    "gap_report": { GapReportResponse },
    "xai_report": { XAIReportResponse }
  }
}

Errors:
- 404: Analysis not found
- 403: Access denied
- 202: Still processing (returns task status)
```

**GET /analysis**
```
Headers: Authorization: Bearer <token>

Query Parameters:
  - cv_document_id: UUID (optional)
  - job_description_id: UUID (optional)
  - min_score: float (optional)
  - page: integer
  - page_size: integer

Response: 200 OK
{
  "success": true,
  "data": {
    "analyses": [ AnalysisRecordResponse ],
    "total": 15,
    "page": 1,
    "page_size": 20
  }
}
```

**DELETE /analysis/{analysis_id}**
```
Headers: Authorization: Bearer <token>

Response: 204 No Content
```

#### 6. Coaching Module

**POST /coaching/chat/sessions**
```
Headers: Authorization: Bearer <token>
Role: candidate

Request:
{
  "title": "Career Path Discussion"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "title": "Career Path Discussion",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**POST /coaching/chat/sessions/{session_id}/messages**
```
Headers: Authorization: Bearer <token>
Role: candidate

Request:
{
  "message": "What skills should I focus on to become a senior developer?"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user_message": { ChatMessageResponse },
    "assistant_message": { ChatMessageResponse }
  }
}

Response Time: <3 seconds

Errors:
- 400: Session message limit reached (20 messages)
- 404: Session not found
```

**GET /coaching/chat/sessions/{session_id}/messages**
```
Headers: Authorization: Bearer <token>
Role: candidate

Response: 200 OK
{
  "success": true,
  "data": {
    "messages": [ ChatMessageResponse ],
    "total": 12
  }
}
```


**POST /coaching/interview/start**
```
Headers: Authorization: Bearer <token>
Role: candidate

Request:
{
  "job_description_id": "uuid"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "questions": [
      {
        "id": "uuid",
        "question_text": "Tell me about a time when...",
        "question_type": "behavioral",
        "difficulty_level": 3,
        "sequence_number": 1
      }
    ],
    "total_questions": 7
  }
}
```

**POST /coaching/interview/sessions/{session_id}/answer**
```
Headers: Authorization: Bearer <token>
Role: candidate

Request:
{
  "question_id": "uuid",
  "answer": "In my previous role, I..."
}

Response: 200 OK
{
  "success": true,
  "data": {
    "evaluation": {
      "relevance_score": 0.85,
      "completeness_score": 0.78,
      "clarity_score": 0.92,
      "feedback": "Your answer demonstrates...",
      "strengths": ["Clear structure", "Specific examples"],
      "improvements": ["Could elaborate on outcomes"]
    },
    "next_question": { InterviewQuestionResponse } | null
  }
}

Response Time: <5 seconds
```

**GET /coaching/interview/sessions/{session_id}/report**
```
Headers: Authorization: Bearer <token>
Role: candidate

Response: 200 OK
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "overall_score": 0.82,
    "questions_answered": 7,
    "average_relevance": 0.85,
    "average_completeness": 0.78,
    "average_clarity": 0.83,
    "strengths": ["Strong communication", "Good examples"],
    "areas_for_improvement": ["Technical depth", "Quantify results"],
    "completed_at": "2024-01-15T11:30:00Z"
  }
}
```

#### 7. Recruiter Talent Pool Module

**POST /recruiter/bulk-upload**
```
Headers: 
  Authorization: Bearer <token>
  Content-Type: multipart/form-data
Role: recruiter

Request:
  files: <binary[]> (max 50 files)

Response: 202 Accepted
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "total_files": 45,
    "queued_files": 45,
    "failed_files": []
  }
}

Errors:
- 400: Too many files (>50)
- 400: Some files exceed size limit
```

**GET /recruiter/bulk-upload/{task_id}/status**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Response: 200 OK
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "status": "PROCESSING",
    "total_files": 45,
    "processed": 32,
    "successful": 30,
    "failed": 2,
    "failed_files": [
      {"filename": "resume1.pdf", "error": "Virus detected"},
      {"filename": "resume2.pdf", "error": "Insufficient text"}
    ]
  }
}
```


**POST /recruiter/talent-pool/rank**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Request:
{
  "job_description_id": "uuid",
  "filters": {
    "min_score": 0.7,
    "required_skills": ["Python", "React"],
    "experience_level": "senior",
    "page": 1,
    "page_size": 20
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "candidates": [
      {
        "cv_document_id": "uuid",
        "user_id": "uuid",
        "match_score": 0.92,
        "matching_skills": [
          {"skill": "Python", "confidence": 0.95},
          {"skill": "React", "confidence": 0.88}
        ],
        "missing_skills": [
          {"skill": "Docker", "severity": "important"}
        ],
        "key_highlights": [
          "10 years experience",
          "Led team of 5 developers"
        ]
      }
    ],
    "total": 45,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```

**GET /recruiter/candidates/{cv_document_id}/details**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Query Parameters:
  - job_description_id: UUID (required)
  - unmask_pii: boolean (default: false)
  - legal_basis: string (required if unmask_pii=true)

Response: 200 OK
{
  "success": true,
  "data": {
    "cv_document": { CVDocumentResponse },
    "skill_report": { SkillReportResponse },
    "analysis": { AnalysisRecordResponse },
    "gap_report": { GapReportResponse },
    "xai_report": { XAIReportResponse },
    "pii_unmasked": false
  }
}

Errors:
- 403: Legal basis required for PII unmasking
- 404: Candidate or analysis not found
```

**POST /recruiter/export**
```
Headers: Authorization: Bearer <token>
Role: recruiter

Request:
{
  "job_description_id": "uuid",
  "candidate_ids": ["uuid1", "uuid2"],
  "format": "pdf",
  "anonymize": false,
  "fields": ["match_score", "skills", "experience", "xai_summary"]
}

Response: 200 OK
Content-Type: application/pdf | text/csv
Content-Disposition: attachment; filename="talent_pool_export.pdf"

<binary data>

Processing Time: <30 seconds for 100 candidates

Errors:
- 400: Too many candidates (>100)
- 400: Invalid format
```

#### 8. Task Status Module

**GET /tasks/{task_id}**
```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "task_name": "process_cv_document",
    "status": "COMPLETED",
    "result": { ... },
    "created_at": "2024-01-15T10:00:00Z",
    "completed_at": "2024-01-15T10:00:45Z"
  }
}

Status Values:
- PENDING: Task queued
- PROCESSING: Task in progress
- COMPLETED: Task finished successfully
- FAILED: Task failed (check error_message)
- RETRY: Task being retried

Errors:
- 404: Task not found
- 403: Access denied
```


#### 9. Feedback Module

**POST /feedback**
```
Headers: Authorization: Bearer <token>

Request:
{
  "analysis_record_id": "uuid",
  "rating": 4,
  "feedback_text": "The skill extraction was accurate but missed one certification",
  "feedback_type": "extraction"
}

Response: 201 Created
{
  "success": true,
  "message": "Thank you for your feedback"
}
```

**GET /feedback/stats**
```
Headers: Authorization: Bearer <token>
Role: admin

Response: 200 OK
{
  "success": true,
  "data": {
    "average_rating": 4.2,
    "total_feedback": 1250,
    "by_type": {
      "accuracy": 450,
      "extraction": 380,
      "matching": 320,
      "general": 100
    },
    "false_positive_rate": 0.03,
    "false_negative_rate": 0.05
  }
}
```

#### 10. Admin Module (Admin Only)

**GET /admin/audit-logs**
```
Headers: Authorization: Bearer <token>
Role: admin

Query Parameters:
  - user_id: UUID (optional)
  - operation: string (optional)
  - resource_type: string (optional)
  - start_date: ISO 8601 datetime (optional)
  - end_date: ISO 8601 datetime (optional)
  - page: integer (default: 1)
  - page_size: integer (default: 50, max: 100)

Response: 200 OK
{
  "success": true,
  "data": {
    "audit_logs": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "operation": "PII_UNMASK",
        "resource_type": "cv_document",
        "resource_id": "uuid",
        "entity_type": "EMAIL",
        "confidence_score": 0.95,
        "legal_basis": "Recruitment process - candidate consent",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "metadata": {
          "masked_token": "EMAIL_1",
          "unmasked_value_hash": "sha256_hash"
        },
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1250,
    "page": 1,
    "page_size": 50,
    "total_pages": 25
  }
}

Errors:
- 403: Forbidden (not an admin)
```

**GET /admin/audit-logs/{log_id}**
```
Headers: Authorization: Bearer <token>
Role: admin

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "user_email": "recruiter@example.com",
    "operation": "PII_UNMASK",
    "resource_type": "cv_document",
    "resource_id": "uuid",
    "entity_type": "EMAIL",
    "confidence_score": 0.95,
    "legal_basis": "Recruitment process - candidate consent",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "metadata": {
      "masked_token": "EMAIL_1",
      "document_filename": "john_doe_cv.pdf"
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
}

Errors:
- 404: Audit log not found
- 403: Forbidden (not an admin)
```

**GET /admin/audit-logs/export**
```
Headers: Authorization: Bearer <token>
Role: admin

Query Parameters:
  - format: string (csv|json) (default: csv)
  - start_date: ISO 8601 datetime (required)
  - end_date: ISO 8601 datetime (required)
  - operations: comma-separated list (optional)

Response: 200 OK
Content-Type: text/csv | application/json
Content-Disposition: attachment; filename="audit_logs_20240115.csv"

<audit log data>

Processing Time: <30 seconds for 10,000 logs

Errors:
- 400: Date range exceeds 90 days
- 403: Forbidden (not an admin)
```

**GET /admin/users**
```
Headers: Authorization: Bearer <token>
Role: admin

Query Parameters:
  - role: string (candidate|recruiter|admin) (optional)
  - is_active: boolean (optional)
  - email_verified: boolean (optional)
  - search: string (search by email or name) (optional)
  - page: integer (default: 1)
  - page_size: integer (default: 50, max: 100)

Response: 200 OK
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "role": "candidate",
        "first_name": "John",
        "last_name": "Doe",
        "email_verified": true,
        "is_active": true,
        "created_at": "2024-01-10T08:00:00Z",
        "last_login_at": "2024-01-15T09:30:00Z",
        "cv_count": 3,
        "analysis_count": 5
      }
    ],
    "total": 1500,
    "page": 1,
    "page_size": 50,
    "total_pages": 30
  }
}

Errors:
- 403: Forbidden (not an admin)
```

**PATCH /admin/users/{user_id}**
```
Headers: Authorization: Bearer <token>
Role: admin

Request:
{
  "is_active": false,
  "email_verified": true
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "is_active": false,
    "email_verified": true,
    "updated_at": "2024-01-15T10:45:00Z"
  },
  "message": "User updated successfully"
}

Errors:
- 404: User not found
- 403: Forbidden (not an admin)
- 400: Cannot deactivate admin users
```

**GET /admin/system/stats**
```
Headers: Authorization: Bearer <token>
Role: admin

Response: 200 OK
{
  "success": true,
  "data": {
    "users": {
      "total": 1500,
      "candidates": 1200,
      "recruiters": 295,
      "admins": 5,
      "active_last_30_days": 850
    },
    "documents": {
      "total_cvs": 3500,
      "processed": 3450,
      "pending": 30,
      "failed": 20
    },
    "analyses": {
      "total": 8500,
      "last_24_hours": 120,
      "average_match_score": 0.68
    },
    "storage": {
      "total_files_size_gb": 45.2,
      "database_size_gb": 12.8,
      "embeddings_count": 125000
    },
    "performance": {
      "average_api_response_ms": 185,
      "average_cv_processing_seconds": 42,
      "average_matching_seconds": 28,
      "celery_queue_length": 15
    }
  }
}

Errors:
- 403: Forbidden (not an admin)
```

#### 10. Health and Monitoring

**GET /health**
```
No authentication required

Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "services": {
    "database": "up",
    "redis": "up",
    "chromadb": "up",
    "clamav": "up"
  }
}

Response: 503 Service Unavailable (if any service is down)
```

**GET /ready**
```
No authentication required

Response: 200 OK
{
  "ready": true,
  "checks": {
    "database_migrations": "ok",
    "redis_connection": "ok",
    "chromadb_connection": "ok"
  }
}
```

**GET /metrics**
```
Headers: Authorization: Bearer <admin_token>
Role: admin

Response: 200 OK
Content-Type: text/plain

# Prometheus metrics format
http_requests_total{method="GET",endpoint="/documents",status="200"} 1250
http_request_duration_seconds{method="POST",endpoint="/analysis/match"} 2.5
celery_task_queue_length{queue="default"} 15
...
```

### Rate Limiting

All endpoints are rate-limited to 100 requests per minute per user:

```
Response Headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315200

Response: 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 seconds.",
    "retry_after": 45
  }
}
```


## Error Handling

### Error Response Structure

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "reason": "detailed explanation"
    },
    "request_id": "uuid",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST creating resource |
| 202 | Accepted | Async task queued |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 413 | Payload Too Large | File size exceeds limit |
| 422 | Unprocessable Entity | Semantic validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | External service down |

### Error Codes

**Authentication Errors:**
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: JWT token expired
- `AUTH_TOKEN_INVALID`: Malformed or invalid token
- `AUTH_EMAIL_NOT_VERIFIED`: Email verification required

**Validation Errors:**
- `VALIDATION_ERROR`: General validation failure
- `VALIDATION_FILE_SIZE`: File exceeds 10MB limit
- `VALIDATION_FILE_FORMAT`: Unsupported file format
- `VALIDATION_PASSWORD_WEAK`: Password doesn't meet requirements
- `VALIDATION_EMAIL_FORMAT`: Invalid email format

**Resource Errors:**
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RESOURCE_ALREADY_EXISTS`: Duplicate resource
- `RESOURCE_DELETED`: Resource has been soft-deleted

**Processing Errors:**
- `PROCESSING_VIRUS_DETECTED`: File contains malware
- `PROCESSING_INSUFFICIENT_TEXT`: CV has <50 words
- `PROCESSING_EXTRACTION_FAILED`: Text extraction failed
- `PROCESSING_TIMEOUT`: Operation exceeded timeout
- `PROCESSING_QUEUE_FULL`: Task queue at capacity

**Permission Errors:**
- `PERMISSION_DENIED`: Insufficient permissions
- `PERMISSION_ROLE_REQUIRED`: Specific role required
- `PERMISSION_LEGAL_BASIS_REQUIRED`: Legal basis needed for PII access

**External Service Errors:**
- `EXTERNAL_API_UNAVAILABLE`: Gemini API unavailable
- `EXTERNAL_API_RATE_LIMIT`: API rate limit exceeded
- `EXTERNAL_SERVICE_TIMEOUT`: External service timeout

### Circuit Breaker Pattern

For external API calls (Gemini API), implement circuit breaker:

```python
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        
    async def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise ServiceUnavailableError("Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            raise
```

### Graceful Degradation

If XAI Agent fails, still return match results without explanations:

```python
try:
    xai_report = await xai_agent.explain(match_result)
except Exception as e:
    logger.error(f"XAI generation failed: {e}")
    xai_report = None  # Continue without XAI
    
return {
    "analysis": analysis_record,
    "gap_report": gap_report,
    "xai_report": xai_report  # May be None
}
```

### Retry Strategy

Celery tasks retry with exponential backoff:

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(TemporaryError,)
)
def process_cv_document(self, document_id: str):
    try:
        # Processing logic
        pass
    except TemporaryError as e:
        # Exponential backoff: 60s, 120s, 240s
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
    except PermanentError as e:
        # Move to DLQ
        log_to_dlq(self.request.id, str(e))
        raise
```


## Security Design

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    participant Redis
    
    Client->>API: POST /auth/login
    API->>DB: Verify credentials
    DB-->>API: User data
    API->>API: Generate JWT (24h expiry)
    API->>Redis: Store session metadata
    API-->>Client: JWT token
    
    Client->>API: GET /documents (with JWT)
    API->>API: Verify JWT signature
    API->>Redis: Check session validity
    API->>DB: Fetch documents
    API-->>Client: Documents
```

### JWT Token Structure

```json
{
  "sub": "user_uuid",
  "role": "candidate",
  "email": "user@example.com",
  "iat": 1705315200,
  "exp": 1705401600,
  "jti": "token_uuid"
}
```

### Password Security

- **Hashing**: bcrypt with cost factor 12
- **Requirements**: 
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 digit
  - At least 1 special character (@$!%*?&)
- **Storage**: Never store plaintext passwords
- **Timing Attack Prevention**: 500ms delay on failed login

### PII Encryption

PII mappings are encrypted using AES-256-GCM:

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

class PIIEncryption:
    def __init__(self, key_id: str):
        self.key = self._get_key(key_id)  # From key management service
        self.aesgcm = AESGCM(self.key)
        
    def encrypt(self, plaintext: str) -> tuple[bytes, bytes]:
        nonce = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode(), None)
        return nonce, ciphertext
        
    def decrypt(self, nonce: bytes, ciphertext: bytes) -> str:
        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode()
```

### TLS Configuration

All communication uses TLS 1.3:

```nginx
ssl_protocols TLSv1.3;
ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384';
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_stapling on;
ssl_stapling_verify on;
```

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.ai-resume-analyzer.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600
)
```

### Input Validation

All inputs validated using Pydantic:

```python
from pydantic import BaseModel, validator, Field

class CVUpload(BaseModel):
    file_size: int = Field(..., le=10485760)
    file_format: str
    
    @validator('file_format')
    def validate_format(cls, v):
        allowed = ['pdf', 'docx', 'jpg', 'png']
        if v.lower() not in allowed:
            raise ValueError(f'Format must be one of {allowed}')
        return v.lower()
```

### SQL Injection Prevention

Use parameterized queries with SQLAlchemy:

```python
# SAFE - Parameterized query
result = await db.execute(
    select(User).where(User.email == email)
)

# UNSAFE - Never do this
result = await db.execute(
    f"SELECT * FROM users WHERE email = '{email}'"
)
```

### XSS Prevention

- Sanitize all user inputs before storage
- Use Content-Security-Policy headers
- Escape output in frontend

```python
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### File Upload Security

1. **Virus Scanning**: All files scanned with ClamAV
2. **Size Limits**: Maximum 10MB
3. **Format Validation**: Check magic bytes, not just extension
4. **Isolated Storage**: Store uploads in separate volume
5. **No Execution**: Uploads stored with no-execute permissions

```python
import magic

def validate_file_type(file_path: str, expected_type: str) -> bool:
    mime = magic.from_file(file_path, mime=True)
    allowed_mimes = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'jpg': 'image/jpeg',
        'png': 'image/png'
    }
    return mime == allowed_mimes.get(expected_type)
```

### Audit Trail

All sensitive operations logged:

```python
async def audit_log(
    user_id: UUID,
    operation: str,
    resource_type: str,
    resource_id: UUID,
    metadata: dict,
    request: Request
):
    await db.execute(
        insert(AuditLog).values(
            user_id=user_id,
            operation=operation,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            metadata=metadata,
            created_at=datetime.utcnow()
        )
    )
```

### Session Management

- **Timeout**: 30 minutes of inactivity
- **Token Expiry**: 24 hours
- **Refresh**: Automatic token refresh before expiry
- **Logout**: Invalidate token in Redis

```python
async def invalidate_session(token: str):
    token_id = decode_token(token)['jti']
    await redis.setex(
        f"blacklist:{token_id}",
        86400,  # 24 hours
        "1"
    )
```


## Performance Design

### Caching Strategy

**Redis Cache Layers:**

1. **API Response Cache** (DB 2)
   - User profiles: 1 hour TTL
   - Job descriptions: 1 hour TTL
   - Skill reports: 24 hours TTL
   - Match results: 24 hours TTL

2. **Session Cache** (DB 2)
   - Active sessions: 30 minutes TTL
   - Token blacklist: 24 hours TTL

3. **Rate Limiting** (DB 2)
   - Request counters: 1 minute TTL
   - Per-user: 100 requests/minute

```python
from redis import asyncio as aioredis

class CacheService:
    def __init__(self):
        self.redis = aioredis.from_url("redis://redis:6379/2")
        
    async def get_or_set(self, key: str, factory, ttl: int = 3600):
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        value = await factory()
        await self.redis.setex(key, ttl, json.dumps(value))
        return value
        
    async def invalidate(self, pattern: str):
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)
```

### Database Optimization

**Connection Pooling:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=50,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

**Indexes:**
- All foreign keys indexed
- Frequently queried fields indexed (email, created_at, status)
- Composite indexes for common query patterns
- GIN indexes for JSONB columns (skills, metadata)

**Query Optimization:**
```python
# Use select_in_loading for relationships
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(CVDocument)
    .options(selectinload(CVDocument.skill_report))
    .where(CVDocument.user_id == user_id)
)
```

### Async Processing

**Celery Task Priorities:**
```python
# High priority: User-initiated actions
@celery_app.task(priority=9)
def process_single_cv(document_id: str):
    pass

# Normal priority: Bulk operations
@celery_app.task(priority=5)
def process_bulk_cv(document_ids: List[str]):
    pass

# Low priority: Background maintenance
@celery_app.task(priority=1)
def cleanup_old_data():
    pass
```

**Celery Configuration:**
```python
celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)
```

### API Response Compression

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### Pagination

All list endpoints use cursor-based pagination:

```python
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

async def paginate(query, page: int, page_size: int):
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    offset = (page - 1) * page_size
    
    results = await db.execute(
        query.offset(offset).limit(page_size)
    )
    
    return {
        "items": results.scalars().all(),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }
```

### Horizontal Scaling

**Stateless API Servers:**
- No local state stored
- All sessions in Redis
- Load balanced via nginx

**Celery Workers:**
- Scale workers independently
- Auto-scaling based on queue length
- Separate queues for different task types

```yaml
# docker-compose.scale.yml
services:
  celery-worker:
    deploy:
      replicas: 5
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

### Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| API Response (GET) | <200ms | 95th percentile |
| API Response (POST) | <500ms | 95th percentile |
| CV Upload | <2s | Return task_id |
| CV Processing | <60s | Full pipeline |
| CV-JD Matching | <30s | Including XAI |
| Chat Response | <3s | Gemini Flash |
| Interview Evaluation | <5s | Gemini Flash |
| Bulk Upload (50 CVs) | <10min | Complete processing |
| Database Query | <50ms | 95th percentile |
| Cache Hit Ratio | >80% | For repeated queries |

### Monitoring Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

# Task metrics
celery_task_duration = Histogram(
    'celery_task_duration_seconds',
    'Celery task duration',
    ['task_name']
)

celery_queue_length = Gauge(
    'celery_queue_length',
    'Number of tasks in queue',
    ['queue']
)

# Business metrics
cv_uploads_total = Counter('cv_uploads_total', 'Total CV uploads')
analysis_requests_total = Counter('analysis_requests_total', 'Total analysis requests')
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: User Registration Creates Account

For any valid registration data (email, password, role), when a user submits registration, the system should create a new user account with matching credentials.

**Validates: Requirements 1.1**

### Property 2: Email Validation Accepts Only RFC 5322 Compliant Emails

For any string, the system should accept it as an email if and only if it conforms to RFC 5322 format.

**Validates: Requirements 1.2**

### Property 3: Password Validation Enforces Complexity Requirements

For any string, the system should accept it as a password if and only if it contains at least 8 characters with one uppercase, one lowercase, one digit, and one special character.

**Validates: Requirements 1.3**

### Property 4: Duplicate Email Registration Fails

For any email that already exists in the system, attempting to register with that email should fail without creating a duplicate account.

**Validates: Requirements 1.4**

### Property 5: Passwords Are Stored as Bcrypt Hashes

For any user account, the stored password should be a bcrypt hash (not plaintext) and should verify against the original password.

**Validates: Requirements 1.5**

### Property 6: Valid Login Returns JWT Token

For any valid user credentials, submitting login should return a JWT token that is valid for 24 hours and contains the correct user information.

**Validates: Requirements 1.7**

### Property 7: Invalid Login Fails with Timing Protection

For any invalid credentials, login should fail and take at least 500ms to prevent timing attacks.

**Validates: Requirements 1.8**

### Property 8: Account Deletion Removes All User Data

For any user account, when deletion is requested, all associated data (CVs, analyses, sessions) should be removed from the system.

**Validates: Requirements 2.3**

### Property 9: File Size Validation Rejects Large Files

For any file larger than 10MB, the system should reject the upload with a descriptive error message.

**Validates: Requirements 3.2**

### Property 10: Insufficient Text Rejection

For any CV document with fewer than 50 words of extracted text, the system should reject it as insufficient.

**Validates: Requirements 3.9**

### Property 11: No Unmasked PII Sent to External APIs

For any text sent to external LLM services, it should contain only masked tokens and no original PII.

**Validates: Requirements 4.10**

### Property 12: PII Masking Replaces All Detected Entities

For any text with detected PII, the masked version should have all PII instances replaced with unique masked tokens.

**Validates: Requirements 5.1**

### Property 13: PII Masking Round-Trip Property

For any text with PII, masking then unmasking should return text equivalent to the original (preserving PII values).

**Validates: Requirements 5.6**

### Property 14: Duplicate PII Gets Same Token

For any text where the same PII value appears multiple times, all instances should be replaced with the same masked token.

**Validates: Requirements 5.8**

### Property 15: RAG Chunking Produces Correct Sizes

For any document text, when split into chunks, each chunk should contain approximately 512 tokens (±10%) and consecutive chunks should overlap by approximately 50 tokens.

**Validates: Requirements 7.1**

### Property 16: Match Score Range Validation

For any CV-JD matching operation, the resulting match score should be between 0.0 and 1.0 inclusive.

**Validates: Requirements 8.3**

### Property 17: Job Description Length Validation

For any job description with fewer than 100 words, the system should reject it with a validation error.

**Validates: Requirements 11.10**

### Property 18: Task Retry Limit

For any failed task, the system should retry it at most 3 times before moving it to the dead letter queue.

**Validates: Requirements 19.6**

### Property 19: User Data Export Completeness

For any user, the data export should include all user data: profile, CV documents, analysis records, and chat sessions.

**Validates: Requirements 20.2**

### Property 20: PII Encryption at Rest

For any PII stored in the pii_mappings table, the encrypted_value field should be encrypted (not plaintext) and should decrypt to the original value.

**Validates: Requirements 20.7**

### Property 21: CV Parser Round-Trip Property

For any valid CV_Object, parsing it to text then parsing back should produce an equivalent CV_Object with the same structured data.

**Validates: Requirements 26.5**

### Property 22: Job Description Parser Round-Trip Property

For any valid JD_Object, parsing it to text then parsing back should produce an equivalent JD_Object with the same structured data.

**Validates: Requirements 27.5**


## Testing Strategy

### Dual Testing Approach

The platform requires both unit testing and property-based testing for comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property Tests**: Verify universal properties across all inputs through randomization

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide input space.

### Property-Based Testing

**Library Selection:**
- **Python Backend**: Hypothesis (https://hypothesis.readthedocs.io/)
- **TypeScript Frontend**: fast-check (https://github.com/dubzzz/fast-check)

**Configuration:**
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `# Feature: ai-resume-analyzer-platform, Property {number}: {property_text}`

**Example Property Test:**

```python
from hypothesis import given, strategies as st
import pytest

# Feature: ai-resume-analyzer-platform, Property 2: Email Validation Accepts Only RFC 5322 Compliant Emails
@given(email=st.emails())
@pytest.mark.property_test
def test_valid_email_acceptance(email):
    """For any RFC 5322 compliant email, the system should accept it"""
    result = validate_email(email)
    assert result.is_valid is True

# Feature: ai-resume-analyzer-platform, Property 2: Email Validation Accepts Only RFC 5322 Compliant Emails
@given(invalid_email=st.text().filter(lambda x: '@' not in x))
@pytest.mark.property_test
def test_invalid_email_rejection(invalid_email):
    """For any string without @, the system should reject it as invalid email"""
    result = validate_email(invalid_email)
    assert result.is_valid is False
```

**Property Test Coverage:**

Each correctness property must be implemented by a single property-based test:

| Property | Test Implementation |
|----------|-------------------|
| Property 1 | Generate random valid registration data, verify account creation |
| Property 2 | Generate random emails (valid/invalid), verify validation |
| Property 3 | Generate random passwords, verify complexity requirements |
| Property 4 | Create user, attempt duplicate registration, verify failure |
| Property 5 | Generate random passwords, verify bcrypt storage |
| Property 6 | Generate random valid credentials, verify JWT generation |
| Property 7 | Generate random invalid credentials, verify timing |
| Property 8 | Create user with data, delete, verify all data removed |
| Property 9 | Generate files of various sizes, verify >10MB rejected |
| Property 10 | Generate CVs with varying word counts, verify <50 rejected |
| Property 11 | Generate text with PII, verify external API calls contain only tokens |
| Property 12 | Generate text with PII, verify all instances masked |
| Property 13 | Generate text with PII, verify mask→unmask round-trip |
| Property 14 | Generate text with duplicate PII, verify same token used |
| Property 15 | Generate documents, verify chunk sizes and overlaps |
| Property 16 | Generate CV-JD pairs, verify match scores in [0.0, 1.0] |
| Property 17 | Generate JDs with varying lengths, verify <100 words rejected |
| Property 18 | Generate failing tasks, verify retry count ≤3 |
| Property 19 | Generate user data, export, verify completeness |
| Property 20 | Generate PII, store, verify encryption |
| Property 21 | Generate CV_Objects, verify parse→print→parse round-trip |
| Property 22 | Generate JD_Objects, verify parse→print→parse round-trip |

### Unit Testing

**Unit Test Focus Areas:**

1. **Specific Examples**
   - User registration with specific email formats
   - CV upload with specific file types
   - Matching with specific skill sets

2. **Edge Cases**
   - Empty inputs
   - Boundary values (exactly 10MB, exactly 50 words)
   - Special characters in text
   - Multi-language content

3. **Error Conditions**
   - Network failures
   - Database connection errors
   - External API timeouts
   - Invalid file formats

4. **Integration Points**
   - API endpoint integration
   - Database transactions
   - Celery task execution
   - Redis caching

**Example Unit Tests:**

```python
import pytest
from fastapi.testclient import TestClient

def test_user_registration_success(client: TestClient):
    """Test successful user registration with valid data"""
    response = client.post("/v1/auth/register", json={
        "email": "test@example.com",
        "password": "SecurePass123!",
        "role": "candidate"
    })
    assert response.status_code == 201
    assert "access_token" not in response.json()  # Token sent via email

def test_cv_upload_pdf(client: TestClient, auth_headers):
    """Test CV upload with PDF file"""
    with open("tests/fixtures/sample_cv.pdf", "rb") as f:
        response = client.post(
            "/v1/documents/upload",
            files={"file": ("cv.pdf", f, "application/pdf")},
            headers=auth_headers
        )
    assert response.status_code == 202
    assert "document_id" in response.json()["data"]

def test_pii_masking_email(privacy_gateway):
    """Test that email addresses are properly masked"""
    text = "Contact me at john.doe@example.com"
    masked = privacy_gateway.mask_pii(text, "en")
    assert "john.doe@example.com" not in masked
    assert "EMAIL_" in masked

@pytest.mark.asyncio
async def test_celery_task_retry(celery_app):
    """Test that failed tasks are retried"""
    task = failing_task.apply_async()
    await asyncio.sleep(5)
    
    task_record = await get_task_record(task.id)
    assert task_record.retry_count <= 3
```

### Test Organization

```
backend/tests/
├── conftest.py                 # Pytest fixtures
├── test_api/
│   ├── test_auth.py           # Authentication endpoints
│   ├── test_documents.py      # Document endpoints
│   ├── test_analysis.py       # Analysis endpoints
│   └── test_coaching.py       # Coaching endpoints
├── test_services/
│   ├── test_privacy_gateway.py
│   ├── test_extraction_agent.py
│   ├── test_rag_pipeline.py
│   └── test_matching_agent.py
├── test_models/
│   ├── test_user.py
│   ├── test_document.py
│   └── test_analysis.py
├── test_properties/           # Property-based tests
│   ├── test_validation_properties.py
│   ├── test_privacy_properties.py
│   ├── test_parser_properties.py
│   └── test_security_properties.py
└── fixtures/
    ├── sample_cv.pdf
    ├── sample_cv.docx
    └── sample_jd.json
```

### Test Coverage Goals

- **Line Coverage**: Minimum 80%
- **Branch Coverage**: Minimum 75%
- **Critical Paths**: 100% (authentication, PII masking, payment processing)

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
      redis:
        image: redis:7
      chromadb:
        image: chromadb/chroma:latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov hypothesis
      
      - name: Run unit tests
        run: pytest tests/ -v --cov=app --cov-report=xml
      
      - name: Run property tests
        run: pytest tests/test_properties/ -v --hypothesis-profile=ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Performance Testing

Use Locust for load testing:

```python
from locust import HttpUser, task, between

class ResumeAnalyzerUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/v1/auth/login", json={
            "email": "test@example.com",
            "password": "SecurePass123!"
        })
        self.token = response.json()["data"]["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def get_documents(self):
        self.client.get("/v1/documents", headers=self.headers)
    
    @task(1)
    def upload_cv(self):
        with open("sample_cv.pdf", "rb") as f:
            self.client.post(
                "/v1/documents/upload",
                files={"file": f},
                headers=self.headers
            )
```

**Load Test Scenarios:**
- 100 concurrent users
- 1000 requests per minute
- Sustained load for 10 minutes
- Verify 95th percentile response time <500ms


## Deployment Architecture

### Docker Compose Production Configuration

```yaml
version: '3.8'

services:
  frontend:
    image: ai-resume-frontend:latest
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.ai-resume-analyzer.com
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 2G

  backend:
    image: ai-resume-backend:latest
    restart: always
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - SENTRY_DSN=${SENTRY_DSN}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G

  celery-worker:
    image: ai-resume-backend:latest
    restart: always
    command: celery -A app.core.celery_app worker --loglevel=info --concurrency=4
    deploy:
      replicas: 5
      resources:
        limits:
          cpus: '2'
          memory: 4G

  postgres:
    image: postgres:15-alpine
    restart: always
    volumes:
      - postgres-data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 8G

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data

  chromadb:
    image: chromadb/chroma:latest
    restart: always
    volumes:
      - chromadb-data:/chroma/chroma
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  clamav:
    image: clamav/clamav:latest
    restart: always
    volumes:
      - clamav-data:/var/lib/clamav

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

### Environment Variables

```bash
# .env.production
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/ai_resume_db

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# External Services
GEMINI_API_KEY=your_gemini_api_key
CHROMADB_HOST=chromadb
CHROMADB_PORT=8000
CLAMAV_HOST=clamav
CLAMAV_PORT=3310

# Security
JWT_SECRET_KEY=your_jwt_secret_key_min_32_chars
ENCRYPTION_KEY=your_encryption_key_32_bytes

# Monitoring
SENTRY_DSN=your_sentry_dsn
PROMETHEUS_ENABLED=true

# Performance
WORKER_CONCURRENCY=4
MAX_UPLOAD_SIZE=10485760
CACHE_TTL=3600
```

### Nginx Configuration

```nginx
upstream backend {
    least_conn;
    server backend:8000 max_fails=3 fail_timeout=30s;
}

upstream frontend {
    least_conn;
    server frontend:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name ai-resume-analyzer.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ai-resume-analyzer.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API endpoints
    location /v1/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://backend/health;
    }
}
```

### Database Migrations

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Rollback migration
docker-compose exec backend alembic downgrade -1
```

### Monitoring and Alerting

**Prometheus Scrape Configuration:**

```yaml
scrape_configs:
  - job_name: 'ai-resume-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

**Grafana Dashboards:**
- API Performance: Request rates, latencies, error rates
- Celery Tasks: Queue lengths, task durations, failure rates
- Database: Connection pool, query performance, slow queries
- System Resources: CPU, memory, disk usage

**Sentry Error Tracking:**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    integrations=[
        FastApiIntegration(),
        CeleryIntegration(),
    ],
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
)
```

### Backup Strategy

**Database Backups:**
```bash
# Daily automated backup
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres ai_resume_db | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

**File Storage Backups:**
```bash
# Daily backup of uploaded files
0 3 * * * tar -czf /backups/uploads_$(date +\%Y\%m\%d).tar.gz /var/lib/docker/volumes/uploaded-files

# Retention: 90 days
find /backups -name "uploads_*.tar.gz" -mtime +90 -delete
```

### Disaster Recovery

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 24 hours

**Recovery Procedure:**
1. Restore database from latest backup
2. Restore uploaded files from latest backup
3. Restart all services
4. Verify health checks
5. Run smoke tests
6. Resume traffic

### Scaling Strategy

**Horizontal Scaling:**
- Frontend: Scale to 5 replicas during peak hours
- Backend: Scale to 10 replicas during peak hours
- Celery Workers: Scale to 20 replicas during bulk upload operations

**Vertical Scaling:**
- Database: Upgrade to 16GB RAM, 4 CPUs for >10,000 users
- Redis: Upgrade to 8GB RAM for >100,000 cached items
- ChromaDB: Upgrade to 8GB RAM for >1M embeddings

**Auto-scaling Configuration:**
```yaml
deploy:
  replicas: 3
  update_config:
    parallelism: 1
    delay: 10s
  restart_policy:
    condition: on-failure
    max_attempts: 3
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

---

## Summary

This design document provides a comprehensive architecture for the AI Resume Analyzer & Career Mentor platform. The system implements:

1. **Privacy-First Architecture**: Mandatory PII detection and masking before external processing
2. **Multi-Agent Intelligence**: Specialized agents for extraction, matching, gap analysis, and explainability
3. **Scalable Infrastructure**: 7 Docker services with horizontal scaling capabilities
4. **Comprehensive Security**: End-to-end encryption, RBAC, audit trails, and GDPR compliance
5. **Property-Based Testing**: 22 correctness properties ensuring system reliability
6. **Performance Optimization**: Caching, async processing, and database optimization
7. **Production-Ready Deployment**: Docker Compose, monitoring, backups, and disaster recovery

The design ensures compliance with GDPR and EU AI Act requirements while providing a robust, scalable, and maintainable platform for AI-powered resume analysis and career coaching.
