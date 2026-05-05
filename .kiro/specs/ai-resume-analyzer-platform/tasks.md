# Implementation Plan: AI Resume Analyzer & Career Mentor Platform

## Overview

This implementation plan breaks down the AI Resume Analyzer & Career Mentor Platform into manageable coding tasks. The platform is a privacy-first, AI-powered system that analyzes resumes, matches candidates with job descriptions, identifies skill gaps, and provides career coaching.

The implementation follows a phased approach:
1. Core infrastructure and database setup
2. Authentication and user management
3. Privacy Gateway (PII detection and masking)
4. Document processing pipeline
5. Multi-agent AI system (Extraction, RAG, Matching, Gap, XAI using LLM)
6. Coaching engine
7. Recruiter tools
8. Frontend implementation (including Admin dashboard)
9. Testing and quality assurance

Key Updates:
- XAI Agent uses Gemini 1.5 Pro to generate SHAP-like explanations (not local SHAP library)
- Frontend includes 21st.dev and UI/UX Pro Max design principles
- Admin role with audit log viewing and user management capabilities

## Tasks

- [x] 1. Database schema and core models
  - [x] 1.1 Create SQLAlchemy models for all database tables
    - Implement User, CVDocument, PIIMapping, SkillReport, JobDescription, AnalysisRecord, GapReport, XAIReport, AuditLog, ChatSession, ChatMessage, InterviewSession, InterviewQuestion, InterviewAnswer, CeleryTask, DeadLetterQueue, Feedback models
    - Add all constraints, indexes, and relationships as specified in design
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1, 19.1, 20.1, 23.1, 24.1, 26.1, 27.1_

  - [x] 1.2 Create Alembic migration for initial schema
    - Generate migration script for all tables
    - Include indexes, constraints, and triggers
    - Test migration up and down
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 1.3 Create Pydantic schemas for request/response validation
    - Implement UserCreate, UserResponse, TokenResponse, CVDocumentCreate, CVDocumentResponse, SkillReportResponse, AnalysisRecordResponse, GapReportResponse, XAIReportResponse, TaskResponse, ChatMessageCreate, ChatMessageResponse, InterviewSimulationStart, InterviewAnswerSubmit, JobDescriptionCreate, RankingFilters, RankedCandidateResponse, ExportRequest schemas
    - Add all validators and field constraints
    - _Requirements: 1.2, 1.3, 3.2, 8.3, 11.10, 17.10_


- [x] 2. Authentication and security infrastructure
  - [x] 2.1 Implement JWT authentication service
    - Create SecurityService with create_access_token, verify_token, hash_password, verify_password methods
    - Use bcrypt with cost factor 12 for password hashing
    - Generate JWT tokens with 24-hour expiry
    - _Requirements: 1.5, 1.7, 1.10, 20.8_

  - [ ]* 2.2 Write property test for password hashing
    - **Property 5: Passwords Are Stored as Bcrypt Hashes**
    - **Validates: Requirements 1.5**

  - [x] 2.3 Implement authentication endpoints
    - POST /auth/register with email validation (RFC 5322), password complexity validation, role selection
    - POST /auth/login with credential verification and 500ms delay on failure
    - POST /auth/logout with token invalidation
    - POST /auth/refresh for token renewal
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8_

  - [ ]* 2.4 Write property tests for authentication
    - **Property 1: User Registration Creates Account**
    - **Property 2: Email Validation Accepts Only RFC 5322 Compliant Emails**
    - **Property 3: Password Validation Enforces Complexity Requirements**
    - **Property 4: Duplicate Email Registration Fails**
    - **Property 6: Valid Login Returns JWT Token**
    - **Property 7: Invalid Login Fails with Timing Protection**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7, 1.8**

  - [x] 2.5 Implement role-based access control (RBAC) middleware
    - Create dependency for role verification (candidate, recruiter, admin)
    - Implement permission checks for endpoints
    - Add audit logging for access attempts
    - _Requirements: 20.9, 20.14_

  - [x] 2.6 Implement session management with Redis
    - Store session metadata in Redis with 30-minute TTL
    - Implement token blacklist for logout
    - Add session timeout handling
    - _Requirements: 20.15_

- [x] 3. User profile management
  - [x] 3.1 Implement user profile endpoints
    - GET /users/me to retrieve user profile
    - PATCH /users/me to update profile information
    - DELETE /users/me for account deletion (soft delete with 30-day grace period)
    - GET /users/me/export for GDPR data export
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 20.2, 20.3, 20.4, 20.5_

  - [ ]* 3.2 Write property test for account deletion
    - **Property 8: Account Deletion Removes All User Data**
    - **Validates: Requirements 2.3**

  - [ ]* 3.3 Write property test for data export completeness
    - **Property 19: User Data Export Completeness**
    - **Validates: Requirements 20.2**

  - [ ]* 3.4 Write unit tests for profile management
    - Test profile retrieval with valid token
    - Test profile update with partial data
    - Test account deletion with active analysis records
    - Test data export generation within 5 minutes
    - _Requirements: 2.1, 2.2, 2.3, 2.4_


- [x] 4. Privacy Gateway - PII detection and masking
  - [x] 4.1 Implement PII detection service using Presidio and spaCy
    - Install and configure Microsoft Presidio
    - Load spaCy models: ar_core_news_lg, en_core_web_lg, fr_core_news_lg
    - Create PIIDetector class with detect_pii method
    - Detect entity types: NAME, EMAIL, PHONE, ADDRESS, ID_NUMBER, DATE_OF_BIRTH
    - Return confidence scores (0.0-1.0) for each detection
    - Flag entities with confidence <0.7 for manual review
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 4.2 Implement PII masking and tokenization service
    - Create Tokenizer class with mask_pii and unmask_pii methods
    - Generate masked tokens in format: ENTITY_TYPE_SEQUENCE_NUMBER (e.g., NAME_1, EMAIL_2)
    - Store encrypted PII mappings using AES-256-GCM
    - Maintain token consistency across documents from same user
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 20.7_

  - [ ]* 4.3 Write property test for PII masking
    - **Property 11: No Unmasked PII Sent to External APIs**
    - **Property 12: PII Masking Replaces All Detected Entities**
    - **Property 13: PII Masking Round-Trip Property**
    - **Property 14: Duplicate PII Gets Same Token**
    - **Validates: Requirements 4.10, 5.1, 5.6, 5.8**

  - [ ]* 4.4 Write property test for PII encryption
    - **Property 20: PII Encryption at Rest**
    - **Validates: Requirements 20.7**

  - [x] 4.5 Implement audit trail for PII operations
    - Create AuditTrailService with log method
    - Log all PII detection, masking, and unmasking operations
    - Store logs with 2-year retention
    - _Requirements: 4.9, 5.9, 20.6, 20.14_

  - [x] 4.6 Implement Privacy Gateway orchestrator
    - Create PrivacyGateway class coordinating PIIDetector, Tokenizer, and AuditTrail
    - Implement detect_pii, mask_pii, unmask_pii, audit_log methods
    - Add legal basis verification for unmasking
    - Process 2-page CV within 5 seconds
    - _Requirements: 4.1, 4.8, 5.5, 5.6, 5.9_

  - [ ]* 4.7 Write unit tests for Privacy Gateway
    - Test PII detection accuracy with sample CVs
    - Test masking with multiple PII types
    - Test unmasking with legal basis verification
    - Test audit trail logging
    - _Requirements: 4.1, 4.4, 4.8, 5.1, 5.6_


- [x] 5. Document processing pipeline
  - [x] 5.1 Implement file validation service
    - Create FileValidationService with validate_format and validate_size methods
    - Check file size limit (10MB max)
    - Validate file formats: PDF, DOCX, JPG, PNG using magic bytes
    - _Requirements: 3.2, 3.1_

  - [ ]* 5.2 Write property test for file size validation
    - **Property 9: File Size Validation Rejects Large Files**
    - **Validates: Requirements 3.2**

  - [x] 5.3 Implement ClamAV virus scanning integration
    - Create VirusScannerService with scan_file method
    - Integrate with ClamAV service (clamav:3310)
    - Scan files within 30 seconds
    - Log incidents when malware detected
    - _Requirements: 3.3, 3.4, 20.10_

  - [x] 5.4 Implement text extraction service
    - Create TextExtractionService with extract_text method
    - Extract from PDF using PyMuPDF (10s timeout)
    - Extract from DOCX using python-docx (5s timeout)
    - Extract from images using Tesseract OCR (60s timeout)
    - Detect language: ar/en/fr with 95% accuracy
    - Validate minimum 50 words
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 21.2_

  - [ ]* 5.5 Write property test for insufficient text rejection
    - **Property 10: Insufficient Text Rejection**
    - **Validates: Requirements 3.9**

  - [x] 5.6 Implement document ingestion service
    - Create DocumentIngestionService with upload_cv method
    - Handle file upload, validation, virus scanning
    - Store original file in uploads volume
    - Queue extraction task in Celery
    - Return document_id within 2 seconds
    - _Requirements: 3.1, 3.2, 3.3, 3.10, 3.11_

  - [x] 5.7 Implement CV document endpoints
    - POST /documents/upload for file upload
    - GET /documents/{document_id} to retrieve document details
    - GET /documents for paginated list with filters
    - DELETE /documents/{document_id} for soft delete
    - GET /documents/{document_id}/skill-report to retrieve extracted skills
    - _Requirements: 3.1, 3.2, 3.11_

  - [ ]* 5.8 Write unit tests for document processing
    - Test PDF upload and text extraction
    - Test DOCX upload and text extraction
    - Test image upload and OCR
    - Test virus detection rejection
    - Test file size limit enforcement
    - Test language detection accuracy
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_


- [x] 6. Extraction Agent - Local NLP processing
  - [x] 6.1 Implement skill taxonomy loader
    - Load 5000+ skill taxonomy from JSON/CSV file
    - Create skill matching algorithm with fuzzy matching
    - Support multilingual skill names
    - _Requirements: 6.5_

  - [x] 6.2 Implement Extraction Agent service
    - Create ExtractionAgent class with extract_structured_data method
    - Load spaCy models: ar_core_news_lg, en_core_web_lg, fr_core_news_lg
    - Extract skills by matching against skill taxonomy
    - Extract job titles and normalize to O*NET classifications
    - Extract companies, education levels, certifications, dates
    - Calculate employment duration in months
    - Assign confidence scores to extracted entities
    - Process masked CV within 10 seconds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 6.3 Store extraction results in SkillReport table
    - Save skills, job_titles, companies, education, certifications, total_experience_months
    - Flag low-confidence extractions (<0.6) for manual review
    - _Requirements: 6.10, 6.11_

  - [ ]* 6.4 Write unit tests for Extraction Agent
    - Test skill extraction with sample CVs
    - Test job title normalization
    - Test education level identification
    - Test employment duration calculation
    - Test confidence score assignment
    - Test multilingual extraction (AR/EN/FR)
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 7. RAG Pipeline - Document chunking and embedding
  - [x] 7.1 Implement document chunking service
    - Create RAGPipeline class with chunk_and_embed method
    - Split documents into 512-token chunks with 50-token overlap
    - Store chunk metadata: document_id, chunk_index, language
    - _Requirements: 7.1_

  - [ ]* 7.2 Write property test for chunking
    - **Property 15: RAG Chunking Produces Correct Sizes**
    - **Validates: Requirements 7.1**

  - [x] 7.3 Implement embedding generation service
    - Use sentence-transformers/all-MiniLM-L6-v2 model
    - Generate 384-dimensional embeddings
    - Support multilingual embeddings (AR/EN/FR)
    - Process 2-page CV within 15 seconds
    - _Requirements: 7.2, 7.4, 7.5, 7.8_

  - [x] 7.4 Implement ChromaDB integration
    - Create ChromaDB client connecting to chromadb:8001
    - Store embeddings in cv_embeddings collection
    - Store metadata with each embedding
    - _Requirements: 7.3_

  - [x] 7.5 Implement semantic search service
    - Create semantic_search method in RAGPipeline
    - Use cosine similarity with 0.7 threshold
    - Return top 5 most relevant chunks within 500ms
    - _Requirements: 7.6, 7.7_

  - [x] 7.6 Implement embedding lifecycle management
    - Update embeddings when CV documents modified
    - Delete embeddings when CV documents deleted
    - _Requirements: 7.9, 7.10_

  - [ ]* 7.7 Write unit tests for RAG Pipeline
    - Test chunking with various document sizes
    - Test embedding generation
    - Test ChromaDB storage and retrieval
    - Test semantic search accuracy
    - Test embedding updates and deletions
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 7.9, 7.10_


- [x] 8. Matching Agent - Semantic CV-JD matching
  - [x] 8.1 Implement Gemini API integration
    - Create GeminiClient with rate limiting and circuit breaker
    - Configure Gemini 1.5 Pro for matching/analysis
    - Configure Gemini 1.5 Flash for coaching
    - Implement retry logic with exponential backoff
    - _Requirements: 8.9, 25.4_

  - [x] 8.2 Implement Matching Agent service
    - Create MatchingAgent class with match method
    - Send only masked CV and JD to Gemini API
    - Calculate match score (0.0-1.0)
    - Identify matching skills, missing skills, transferable skills
    - Process one CV-JD pair within 3 seconds
    - Cache results for 24 hours in Redis
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10, 8.11_

  - [ ]* 8.3 Write property test for match score range
    - **Property 16: Match Score Range Validation**
    - **Validates: Requirements 8.3**

  - [x] 8.3 Implement candidate ranking service
    - Create RankingService with rank_candidates method
    - Rank by match score in descending order
    - Support filtering by min_score, required_skills, experience_level, education
    - Implement pagination (20 per page)
    - _Requirements: 8.8, 15.1, 15.2, 15.3, 15.4, 15.5, 15.10_

  - [ ]* 8.4 Write unit tests for Matching Agent
    - Test semantic matching with sample CV-JD pairs
    - Test match score calculation
    - Test skill identification (matching, missing, transferable)
    - Test caching behavior
    - Test API rate limit handling
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10_

- [x] 9. Gap Agent - Skill gap analysis
  - [x] 9.1 Implement Gap Agent service
    - Create GapAgent class with analyze_gaps method
    - Identify skills in JD but missing from CV
    - Categorize gaps: Critical, Important, Nice-to-Have
    - Generate learning roadmap with courses, certifications, resources
    - Estimate time-to-acquire in weeks
    - Identify transferable skills
    - Process within 5 seconds after matching
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 9.2 Store gap analysis in GapReport table
    - Save critical_gaps, important_gaps, nice_to_have_gaps, learning_roadmap, estimated_time_weeks
    - Update when CV or JD changes
    - _Requirements: 9.8, 9.10_

  - [ ]* 9.3 Write unit tests for Gap Agent
    - Test gap identification with various skill sets
    - Test gap categorization logic
    - Test learning roadmap generation
    - Test time estimation accuracy
    - Test transferable skill identification
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_


- [x] 10. XAI Agent - Explainability using LLM
  - [x] 10.1 Implement XAI Agent service using Gemini LLM
    - Create XAIAgent class with explain method
    - Use Gemini 1.5 Pro to generate SHAP-like explanations
    - Prompt LLM to provide feature importance analysis
    - Identify top 10 contributing features
    - Calculate positive and negative contribution scores
    - Generate counterfactual examples via LLM
    - Process within 8 seconds
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 10.2 Store explainability results in XAIReport table
    - Save feature_importance, positive_contributions, negative_contributions, counterfactuals, visual_data
    - Support multilingual explanations (AR/EN/FR)
    - _Requirements: 10.8, 10.9_

  - [x] 10.3 Implement graceful degradation for XAI failures
    - Return match results even if XAI generation fails
    - Log XAI failures for monitoring
    - _Requirements: 25.7_

  - [ ]* 10.4 Write unit tests for XAI Agent
    - Test LLM-based explanation generation
    - Test feature importance ranking
    - Test counterfactual generation
    - Test multilingual explanation generation
    - Test graceful degradation on failure
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9_

- [x] 11. Multi-Agent Orchestrator
  - [x] 11.1 Implement Multi-Agent Orchestrator service
    - Create MultiAgentOrchestrator class coordinating all agents
    - Implement process_cv_document method: Privacy Gateway → Extraction Agent → RAG Pipeline
    - Implement match_cv_to_jd method: RAG retrieval → Matching Agent → Gap Agent → XAI Agent
    - Handle agent dependencies and error propagation
    - _Requirements: 4.1, 6.1, 7.1, 8.1, 9.1, 10.1_

  - [x] 11.2 Implement analysis endpoints
    - POST /analysis/match to initiate CV-JD matching
    - GET /analysis/{analysis_id} to retrieve complete analysis
    - GET /analysis for paginated list with filters
    - DELETE /analysis/{analysis_id} for soft delete
    - _Requirements: 8.1, 8.2, 9.1, 10.1_

  - [ ]* 11.3 Write integration tests for orchestrator
    - Test end-to-end CV processing pipeline
    - Test end-to-end matching pipeline
    - Test error handling and recovery
    - Test agent coordination
    - _Requirements: 4.1, 6.1, 7.1, 8.1, 9.1, 10.1_

- [ ] 12. Checkpoint - Core backend functionality complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 13. Job Description management
  - [x] 13.1 Implement Job Description endpoints (Recruiter only)
    - POST /job-descriptions to create JD with validation
    - GET /job-descriptions/{jd_id} to retrieve JD
    - GET /job-descriptions for paginated list with filters
    - PATCH /job-descriptions/{jd_id} to update JD (triggers re-matching)
    - DELETE /job-descriptions/{jd_id} for soft delete
    - POST /job-descriptions/{jd_id}/archive to archive JD
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ]* 13.2 Write property test for JD length validation
    - **Property 17: Job Description Length Validation**
    - **Validates: Requirements 11.10**

  - [x] 13.3 Implement JD skill extraction
    - Extract skills from JD text using Extraction Agent
    - Allow manual skill addition/removal
    - Support JD templates for common roles
    - _Requirements: 11.2, 11.3, 11.4_

  - [x] 13.4 Implement bulk JD import
    - Support CSV import for multiple JDs
    - Validate and queue processing
    - _Requirements: 11.9_

  - [ ]* 13.5 Write unit tests for JD management
    - Test JD creation with validation
    - Test skill extraction from JD text
    - Test JD update triggering re-matching
    - Test JD archiving
    - Test bulk import
    - _Requirements: 11.1, 11.2, 11.3, 11.6, 11.9, 11.10_

- [x] 14. Coaching Engine - Chat interface
  - [x] 14.1 Implement Chat Engine service
    - Create ChatEngine class with chat method
    - Use Gemini 1.5 Flash API for responses
    - Maintain conversation context (20 messages max)
    - Respond within 3 seconds
    - Provide career advice based on Skill_Report and Gap_Report
    - Support AR/EN/FR conversations
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.11_

  - [x] 14.2 Implement chat endpoints
    - POST /coaching/chat/sessions to create chat session
    - POST /coaching/chat/sessions/{session_id}/messages to send message
    - GET /coaching/chat/sessions/{session_id}/messages to retrieve history
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 14.3 Implement safety guardrails for chat
    - Avoid personal opinions or biased advice
    - Suggest human counselor when unable to answer
    - Log all conversations in audit trail
    - _Requirements: 12.8, 12.9, 12.10_

  - [ ]* 14.4 Write unit tests for Chat Engine
    - Test conversation context maintenance
    - Test response generation
    - Test multilingual support
    - Test message limit enforcement
    - Test safety guardrails
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.8, 12.9, 12.11_


- [x] 15. Coaching Engine - Interview simulation
  - [x] 15.1 Implement Interview Simulator service
    - Create InterviewSimulator class with start_simulation, evaluate_answer, generate_report methods
    - Generate 5-10 role-specific questions based on JD
    - Support behavioral, technical, and situational question types
    - Progressive difficulty increase
    - _Requirements: 13.1, 13.2, 13.10_

  - [x] 15.2 Implement answer evaluation
    - Evaluate answers on relevance, completeness, clarity (0.0-1.0 scores)
    - Provide feedback and improvement suggestions
    - Process evaluation within 5 seconds
    - _Requirements: 13.3, 13.4, 13.5, 13.9_

  - [x] 15.3 Implement interview report generation
    - Generate final performance report with overall score
    - Track performance improvement over multiple simulations
    - _Requirements: 13.6, 13.8_

  - [x] 15.4 Implement interview endpoints
    - POST /coaching/interview/start to begin simulation
    - POST /coaching/interview/sessions/{session_id}/answer to submit answer
    - GET /coaching/interview/sessions/{session_id}/report to get final report
    - _Requirements: 13.1, 13.3, 13.6_

  - [ ]* 15.5 Write unit tests for Interview Simulator
    - Test question generation
    - Test answer evaluation scoring
    - Test feedback generation
    - Test report generation
    - Test retry capability
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9_

- [x] 16. Recruiter tools - Bulk CV processing
  - [x] 16.1 Implement bulk CV upload service
    - Create BulkUploadService with process_bulk method
    - Accept up to 50 files simultaneously
    - Queue each CV for async processing
    - Provide real-time progress updates
    - Complete 50 CVs within 10 minutes
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 16.2 Implement bulk upload endpoints
    - POST /recruiter/bulk-upload for file upload
    - GET /recruiter/bulk-upload/{task_id}/status for progress tracking
    - _Requirements: 14.1, 14.2, 14.4_

  - [x] 16.3 Implement error handling for bulk uploads
    - Log failed files in DLQ
    - Continue processing remaining files on failure
    - Generate summary report
    - Support resuming interrupted uploads
    - _Requirements: 14.6, 14.7, 14.8, 14.9_

  - [ ]* 16.4 Write unit tests for bulk upload
    - Test bulk upload with 50 files
    - Test progress tracking
    - Test error handling and DLQ
    - Test file validation before queuing
    - Test resume capability
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 14.9, 14.10_


- [x] 17. Recruiter tools - Talent pool and export
  - [x] 17.1 Implement talent pool ranking endpoints
    - POST /recruiter/talent-pool/rank to rank candidates by match score
    - Support filtering by min_score, required_skills, experience_level, education
    - Implement pagination (20 per page)
    - Allow manual ranking adjustments
    - Provide side-by-side comparison (up to 5 candidates)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.8, 15.9_

  - [x] 17.2 Implement candidate details endpoint
    - GET /recruiter/candidates/{cv_document_id}/details with JD context
    - Display XAI report with feature importance
    - Show CV excerpts contributing to match score
    - Support PII unmasking with legal basis verification
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [x] 17.3 Implement export service
    - Create ExportService with export_pdf and export_csv methods
    - Support PDF and CSV formats
    - Include match scores, skills, XAI summaries
    - Support anonymized exports (exclude PII)
    - Allow field selection
    - Generate within 30 seconds for 100 candidates
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.9_

  - [x] 17.4 Implement export endpoints
    - POST /recruiter/export to generate export file
    - Support scheduled exports via email
    - Compress large exports into ZIP
    - _Requirements: 17.1, 17.2, 17.9, 17.10_

  - [x] 17.5 Log all export operations in audit trail
    - Track who exported what data and when
    - Include legal basis for PII access
    - _Requirements: 17.8_

  - [ ]* 17.6 Write unit tests for recruiter tools
    - Test candidate ranking with filters
    - Test side-by-side comparison
    - Test PII unmasking with legal basis
    - Test PDF export generation
    - Test CSV export generation
    - Test anonymized export
    - Test audit logging
    - _Requirements: 15.1, 15.2, 15.3, 16.1, 16.6, 17.1, 17.2, 17.3, 17.4, 17.8_

- [x] 18. Celery task queue and async processing
  - [x] 18.1 Configure Celery with Redis broker
    - Set up Celery app with Redis as broker and result backend
    - Configure task serialization, time limits, prefetch multiplier
    - Set up task priorities: HIGH, NORMAL, LOW
    - _Requirements: 19.1, 19.5_

  - [x] 18.2 Implement Celery tasks for CV processing
    - Create process_cv_document task: extraction → Privacy Gateway → RAG Pipeline
    - Create match_cv_to_jd task: Matching → Gap → XAI
    - Create bulk_process_cvs task for bulk uploads
    - _Requirements: 19.1, 19.2_

  - [x] 18.3 Implement task status tracking
    - Store task metadata in celery_tasks table
    - Support status values: PENDING, PROCESSING, COMPLETED, FAILED, RETRY
    - Implement GET /tasks/{task_id} endpoint
    - _Requirements: 19.2, 19.3, 19.4_

  - [x] 18.4 Implement retry logic with exponential backoff
    - Retry failed tasks up to 3 times
    - Use exponential backoff: 60s, 120s, 240s
    - Move to DLQ after 3 failures
    - _Requirements: 19.6, 19.7_

  - [ ]* 18.5 Write property test for task retry limit
    - **Property 18: Task Retry Limit**
    - **Validates: Requirements 19.6**

  - [x] 18.6 Implement webhook notifications for task completion
    - Send notifications when tasks complete
    - Support configurable webhook URLs
    - _Requirements: 19.10_

  - [x] 18.7 Implement task priority processing
    - Process HIGH priority within 1 minute
    - Process NORMAL priority within 5 minutes
    - Limit concurrent task execution
    - _Requirements: 19.8, 19.9, 19.11_

  - [ ]* 18.8 Write unit tests for async processing
    - Test task queuing and execution
    - Test status tracking
    - Test retry logic
    - Test DLQ handling
    - Test priority processing
    - Test webhook notifications
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8, 19.10_


- [x] 19. Feedback and trust mechanisms
  - [x] 19.1 Implement feedback endpoints
    - POST /feedback to submit accuracy ratings and text feedback
    - GET /feedback/stats for aggregate statistics (admin only)
    - _Requirements: 18.1, 18.2, 18.9_

  - [x] 19.2 Implement feedback processing
    - Store feedback in feedback table
    - Track false positive and false negative rates
    - Generate monthly quality reports
    - _Requirements: 18.3, 18.8, 18.9_

  - [x] 19.3 Implement human-in-the-loop corrections
    - Flag low-confidence extractions for review
    - Allow users to report incorrect PII detection
    - Support manual corrections
    - _Requirements: 18.6, 18.10_

  - [ ]* 19.4 Write unit tests for feedback system
    - Test feedback submission
    - Test statistics aggregation
    - Test quality report generation
    - Test human-in-the-loop workflow
    - _Requirements: 18.1, 18.2, 18.3, 18.6, 18.8, 18.9_

- [x] 20. Data retention and cleanup
  - [x] 20.1 Implement automated data retention service
    - Create DataRetentionService with cleanup methods
    - Delete CV documents after 90 days of inactivity
    - Delete PII mappings after 90 days
    - Delete audit logs older than 2 years
    - Anonymize analysis records after 1 year
    - _Requirements: 24.1, 24.2, 24.3, 24.6_

  - [x] 20.2 Implement retention notifications
    - Send email 7 days before automatic deletion
    - Allow users to extend retention for specific documents
    - _Requirements: 24.4, 24.5_

  - [x] 20.3 Implement soft delete with grace period
    - Soft delete with 30-day grace period before permanent deletion
    - Log all automated deletions in compliance log
    - _Requirements: 24.8, 24.10_

  - [x] 20.4 Schedule daily cleanup jobs
    - Run cleanup at 2:00 AM UTC daily
    - Allow admin configuration of retention periods
    - _Requirements: 24.7, 24.9_

  - [ ]* 20.5 Write unit tests for data retention
    - Test automated deletion after retention period
    - Test notification sending
    - Test retention extension
    - Test soft delete grace period
    - Test cleanup job execution
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.7, 24.8, 24.10_

- [x] 21. Checkpoint - Backend implementation complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 22. Error handling and resilience
  - [x] 22.1 Implement structured error responses
    - Create error response format with error_code, message, details, request_id, timestamp
    - Use correct HTTP status codes (400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
    - Define all error codes: AUTH_*, VALIDATION_*, RESOURCE_*, PROCESSING_*, PERMISSION_*, EXTERNAL_*
    - _Requirements: 25.1, 25.2, 25.5_

  - [x] 22.2 Implement circuit breaker for external APIs
    - Create CircuitBreaker class with CLOSED, OPEN, HALF_OPEN states
    - Set failure threshold to 5 failures
    - Set timeout to 60 seconds
    - _Requirements: 25.4_

  - [x] 22.3 Implement graceful degradation
    - Return match results even if XAI fails
    - Fall back to keyword matching if ChromaDB unavailable
    - _Requirements: 25.7, 25.11_

  - [x] 22.4 Implement request timeouts
    - 30 seconds for API requests
    - 5 minutes for background tasks
    - _Requirements: 25.9_

  - [x] 22.5 Implement retry logic for transient failures
    - Automatic retry with exponential backoff
    - Return 503 with retry-after header for unavailable services
    - _Requirements: 25.3, 25.10_

  - [x] 22.6 Implement input validation
    - Validate all user inputs with Pydantic
    - Return specific validation errors
    - _Requirements: 25.8_

  - [ ]* 22.7 Write unit tests for error handling
    - Test structured error responses
    - Test circuit breaker behavior
    - Test graceful degradation
    - Test timeout handling
    - Test retry logic
    - Test input validation
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.7, 25.8, 25.9, 25.10, 25.11_

- [x] 23. Monitoring and observability
  - [x] 23.1 Implement structured logging with Loguru
    - Configure JSON format logging
    - Set up log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
    - Log all API requests with timestamp, user_id, endpoint, status_code, response_time
    - _Requirements: 23.1, 23.2, 23.3_

  - [x] 23.2 Integrate Sentry for error tracking
    - Send ERROR and CRITICAL logs to Sentry
    - Configure Sentry DSN from environment
    - _Requirements: 23.4_

  - [x] 23.3 Implement Prometheus metrics
    - Expose /metrics endpoint
    - Track: request_count, request_duration, error_rate, task_queue_length
    - _Requirements: 23.5, 23.6_

  - [x] 23.4 Implement health check endpoints
    - GET /health to check all dependencies (database, redis, chromadb, clamav)
    - GET /ready to check readiness (migrations, connections)
    - Return 200 when healthy, 503 when unhealthy
    - _Requirements: 23.7, 23.8_

  - [x] 23.5 Implement distributed tracing
    - Add trace IDs to all requests
    - Track multi-service request flows
    - _Requirements: 23.9_

  - [x] 23.6 Configure log retention
    - Retain logs for 90 days
    - Alert when error rate exceeds 5% over 5-minute window
    - _Requirements: 23.10, 23.11_

  - [ ]* 23.7 Write unit tests for monitoring
    - Test structured logging
    - Test Prometheus metrics collection
    - Test health check endpoints
    - Test Sentry integration
    - _Requirements: 23.1, 23.2, 23.4, 23.5, 23.6, 23.7, 23.8_


- [x] 24. Performance optimization and caching
  - [x] 24.1 Implement Redis caching service
    - Create CacheService with get_or_set and invalidate methods
    - Configure cache layers: API responses (DB 2), sessions (DB 2), rate limiting (DB 2)
    - Set TTLs: user profiles (1h), JDs (1h), skill reports (24h), match results (24h)
    - _Requirements: 22.4_

  - [x] 24.2 Implement database connection pooling
    - Configure SQLAlchemy with pool_size=10, max_overflow=50
    - Enable pool_pre_ping and pool_recycle
    - _Requirements: 22.5_

  - [x] 24.3 Optimize database queries
    - Use selectinload for relationships
    - Ensure all foreign keys are indexed
    - Add composite indexes for common query patterns
    - _Requirements: 22.6_

  - [x] 24.4 Implement API response compression
    - Add GZip middleware for responses >1KB
    - _Requirements: 22.8_

  - [x] 24.5 Implement pagination for all list endpoints
    - Use cursor-based pagination
    - Maximum 100 items per page
    - _Requirements: 22.7_

  - [x] 24.6 Implement rate limiting
    - Limit to 100 requests per minute per user
    - Return 429 with retry-after header when exceeded
    - _Requirements: 20.11_

  - [ ]* 24.7 Write performance tests
    - Test API response times (<200ms for 95% of GET requests)
    - Test concurrent user handling (1000 users)
    - Test bulk CV processing (100 CVs per minute)
    - Test cache hit ratio (>80%)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.9_

- [x] 25. Multi-language support
  - [x] 25.1 Implement frontend localization
    - Set up i18n for Next.js with AR/EN/FR translations
    - Support RTL rendering for Arabic
    - _Requirements: 21.1, 21.3_

  - [x] 25.2 Implement language detection
    - Detect CV language automatically with 95% accuracy
    - Support mixed-language CVs
    - _Requirements: 21.2, 21.5_

  - [x] 25.3 Implement language-specific processing
    - Use appropriate spaCy models per language
    - Translate JDs to match CV language for semantic matching
    - Generate reports in user's preferred language
    - _Requirements: 21.4, 21.6, 21.7_

  - [x] 25.4 Configure Unicode UTF-8 encoding
    - Ensure all text storage uses UTF-8
    - Support language switching without data loss
    - _Requirements: 21.8, 21.9_

  - [ ]* 25.5 Write unit tests for multi-language support
    - Test language detection accuracy
    - Test RTL rendering
    - Test mixed-language CV processing
    - Test translation accuracy
    - Test language switching
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9_


- [x] 26. CV and JD parsers with round-trip property
  - [x] 26.1 Implement CV Parser
    - Create CVParser class with parse method
    - Parse CV into structured CV_Object: personal_info, experience, education, skills, certifications
    - Handle malformed CVs by extracting partial data
    - Validate CV_Object contains at least one of: experience, education, or skills
    - Preserve section ordering
    - Extract and normalize dates to ISO 8601
    - Handle multi-column layouts
    - _Requirements: 26.1, 26.2, 26.3, 26.6, 26.7, 26.8, 26.9_

  - [x] 26.2 Implement CV Pretty Printer
    - Create CVPrettyPrinter class with format method
    - Format CV_Object back to human-readable text
    - Generate output that passes CV_Parser validation
    - _Requirements: 26.4, 26.10_

  - [ ]* 26.3 Write property test for CV round-trip
    - **Property 21: CV Parser Round-Trip Property**
    - **Validates: Requirements 26.5**

  - [x] 26.4 Implement JD Parser
    - Create JDParser class with parse method
    - Parse JD into structured JD_Object: title, description, required_skills, preferred_skills, experience_level, education_requirements
    - Extract required skills (keywords: "required", "must have", "essential")
    - Extract preferred skills (keywords: "preferred", "nice to have", "bonus")
    - Normalize experience levels: Entry (0-2y), Mid (3-5y), Senior (6-10y), Expert (10+y)
    - Extract salary ranges and work arrangements
    - _Requirements: 27.1, 27.2, 27.3, 27.6, 27.7, 27.8, 27.9_

  - [x] 26.5 Implement JD Pretty Printer
    - Create JDPrettyPrinter class with format method
    - Format JD_Object back to structured text
    - Support recruiter-specified templates
    - _Requirements: 27.4, 27.10_

  - [ ]* 26.6 Write property test for JD round-trip
    - **Property 22: Job Description Parser Round-Trip Property**
    - **Validates: Requirements 27.5**

  - [x] 26.7 Implement round-trip validation
    - Test round-trip property for all uploaded CVs
    - Test round-trip property for all JDs before enabling matching
    - Log failures for model improvement
    - _Requirements: 26.11, 27.11_

  - [ ]* 26.8 Write unit tests for parsers
    - Test CV parsing with various formats
    - Test JD parsing with various formats
    - Test date normalization
    - Test skill extraction (required vs preferred)
    - Test experience level normalization
    - Test malformed input handling
    - _Requirements: 26.1, 26.2, 26.3, 26.6, 26.7, 26.8, 27.1, 27.2, 27.3, 27.6, 27.7_


- [x] 27. Security hardening
  - [x] 27.1 Implement TLS 1.3 configuration
    - Configure TLS 1.3 for all communication
    - Set secure cipher suites
    - Enable SSL stapling
    - _Requirements: 20.8_

  - [x] 27.2 Implement CORS configuration
    - Configure CORS middleware with allowed origins
    - Set allowed methods and headers
    - Enable credentials support
    - _Requirements: 20.8_

  - [x] 27.3 Implement security headers
    - Add Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection headers
    - _Requirements: 20.8_

  - [x] 27.4 Implement file upload security
    - Validate file types using magic bytes (not just extensions)
    - Store uploads with no-execute permissions
    - Isolate uploads in separate volume
    - _Requirements: 3.1, 3.2, 20.10_

  - [x] 27.5 Implement SQL injection prevention
    - Use parameterized queries with SQLAlchemy
    - Never use string concatenation for queries
    - _Requirements: 20.8_

  - [x] 27.6 Implement XSS prevention
    - Sanitize all user inputs before storage
    - Escape output in frontend
    - _Requirements: 20.8_

  - [ ]* 27.7 Write security tests
    - Test SQL injection prevention
    - Test XSS prevention
    - Test file upload validation
    - Test CORS configuration
    - Test security headers
    - _Requirements: 20.8, 20.10_

- [x] 28. Frontend - Core setup and layout
  - [x] 28.1 Set up Next.js 14 project structure
    - Configure App Router with (auth), (candidate), (recruiter), (admin) route groups
    - Set up Tailwind CSS, ShadcnUI, 21st.dev, UI/UX Pro Max, Framer Motion
    - Configure TypeScript with strict mode
    - Install Lucide React for icons
    - _Requirements: 1.1, 21.1_

  - [x] 28.2 Implement layout components
    - Create root layout with navigation
    - Create authenticated layout with sidebar
    - Create role-specific layouts (candidate, recruiter)
    - Implement responsive design
    - _Requirements: 1.1, 21.1_

  - [x] 28.3 Implement UI component library
    - Set up ShadcnUI components: Button, Input, Card, Dialog, Table, Form
    - Integrate 21st.dev components for advanced UI patterns
    - Apply UI/UX Pro Max design principles
    - Create custom components: FileUpload, ProgressBar, SkillBadge, MatchScoreDisplay
    - Implement Framer Motion animations for transitions
    - Use Lucide React icons throughout
    - _Requirements: 1.1_

  - [x] 28.4 Implement API client service
    - Create axios-based API client with interceptors
    - Handle JWT token attachment
    - Handle error responses
    - Implement request/response logging
    - _Requirements: 1.7, 25.1_

  - [ ]* 28.5 Write unit tests for frontend utilities
    - Test API client interceptors
    - Test error handling
    - Test token management
    - _Requirements: 1.7, 25.1_


- [x] 29. Frontend - Authentication pages
  - [x] 29.1 Implement registration page
    - Create /register page with email, password, role selection, name fields
    - Implement client-side validation (email format, password complexity)
    - Show password strength indicator
    - Handle registration success and errors
    - _Requirements: 1.1, 1.2, 1.3, 1.9_

  - [x] 29.2 Implement login page
    - Create /login page with email and password fields
    - Handle login success (store JWT token)
    - Handle login errors with user-friendly messages
    - Implement "Remember me" functionality
    - _Requirements: 1.7, 1.8_

  - [x] 29.3 Implement authentication context
    - Create AuthContext with login, logout, refresh methods
    - Store user data and token in context
    - Implement automatic token refresh
    - Handle token expiry
    - _Requirements: 1.7, 1.10_

  - [x] 29.4 Implement protected route wrapper
    - Create ProtectedRoute component
    - Redirect to login if not authenticated
    - Check role-based permissions
    - _Requirements: 1.7, 20.9_

  - [ ]* 29.5 Write unit tests for authentication pages
    - Test registration form validation
    - Test login form submission
    - Test token storage and retrieval
    - Test protected route redirection
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.8_

- [x] 30. Frontend - Candidate dashboard
  - [x] 30.1 Implement candidate dashboard page
    - Create /candidate/dashboard with overview cards
    - Display uploaded CVs count, analyses count, recent activity
    - Show quick actions: upload CV, view analyses, start coaching
    - _Requirements: 2.1, 3.11_

  - [x] 30.2 Implement CV upload page
    - Create /candidate/upload with drag-and-drop file upload
    - Show file validation errors
    - Display upload progress
    - Show virus scan status
    - Poll processing status and redirect when complete
    - _Requirements: 3.1, 3.2, 3.3, 3.11_

  - [x] 30.3 Implement CV list page
    - Create /candidate/documents with paginated CV list
    - Display processing status, language, word count
    - Support filtering by status
    - Allow CV deletion
    - _Requirements: 3.11_

  - [x] 30.4 Implement skill report page
    - Create /candidate/documents/{id}/skills to display extracted skills
    - Show skills, experience, education, certifications
    - Display confidence scores
    - Allow feedback submission
    - _Requirements: 6.10, 18.1_

  - [ ]* 30.5 Write unit tests for candidate pages
    - Test dashboard rendering
    - Test file upload component
    - Test CV list pagination
    - Test skill report display
    - _Requirements: 2.1, 3.1, 3.11, 6.10_


- [ ] 31. Frontend - Analysis and matching pages
  - [ ] 31.1 Implement analysis request page
    - Create /candidate/analysis/new to select CV and JD for matching
    - Display available CVs and JDs
    - Show estimated processing time
    - Poll task status and redirect when complete
    - _Requirements: 8.1, 8.2_

  - [ ] 31.2 Implement analysis results page
    - Create /candidate/analysis/{id} to display match results
    - Show match score with visual indicator (progress bar, color coding)
    - Display matching skills, missing skills, transferable skills
    - Show gap analysis with categorized gaps (Critical, Important, Nice-to-Have)
    - Display learning roadmap with time estimates
    - _Requirements: 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_

  - [ ] 31.3 Implement XAI explainability view
    - Display feature importance chart
    - Show positive and negative contributions
    - Display counterfactual examples
    - Present explanations in user's preferred language
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.9_

  - [ ] 31.4 Implement analysis list page
    - Create /candidate/analysis with paginated analysis list
    - Display match scores, JD titles, dates
    - Support filtering by min_score
    - Allow analysis deletion
    - _Requirements: 8.1_

  - [ ]* 31.5 Write unit tests for analysis pages
    - Test analysis request form
    - Test match score display
    - Test gap analysis rendering
    - Test XAI chart rendering
    - Test analysis list pagination
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 10.1_

- [ ] 32. Frontend - Coaching pages
  - [ ] 32.1 Implement chat interface
    - Create /candidate/coaching/chat with message list and input
    - Display conversation history
    - Show typing indicator while waiting for response
    - Support message limit (20 messages)
    - Implement auto-scroll to latest message
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 32.2 Implement interview simulation page
    - Create /candidate/coaching/interview to start simulation
    - Select JD for role-specific questions
    - Display questions one at a time
    - Show question type and difficulty
    - Provide text area for answer submission
    - _Requirements: 13.1, 13.2_

  - [ ] 32.3 Implement interview evaluation display
    - Show evaluation scores (relevance, completeness, clarity)
    - Display feedback and improvement suggestions
    - Highlight strengths and areas for improvement
    - Show next question or final report
    - _Requirements: 13.3, 13.4, 13.5_

  - [ ] 32.4 Implement interview report page
    - Create /candidate/coaching/interview/{id}/report for final results
    - Display overall score and averages
    - Show performance breakdown by question
    - Highlight strengths and improvement areas
    - Allow retry simulation
    - _Requirements: 13.6, 13.7, 13.8_

  - [ ]* 32.5 Write unit tests for coaching pages
    - Test chat message sending and receiving
    - Test interview question display
    - Test answer submission
    - Test evaluation display
    - Test report generation
    - _Requirements: 12.1, 12.2, 13.1, 13.3, 13.6_


- [ ] 33. Frontend - Recruiter dashboard and JD management
  - [ ] 33.1 Implement recruiter dashboard page
    - Create /recruiter/dashboard with overview cards
    - Display active JDs count, total candidates, recent matches
    - Show quick actions: create JD, bulk upload, view talent pool
    - _Requirements: 11.1_

  - [ ] 33.2 Implement JD creation page
    - Create /recruiter/job-descriptions/new with form
    - Fields: title, description, required_skills, preferred_skills, experience_level, work_arrangement
    - Implement skill extraction from description
    - Allow manual skill addition/removal
    - Support JD templates
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 33.3 Implement JD list page
    - Create /recruiter/job-descriptions with paginated list
    - Display title, required skills, created date, active status
    - Support filtering by active/archived
    - Allow JD editing, archiving, deletion
    - _Requirements: 11.5, 11.6, 11.7_

  - [ ] 33.4 Implement JD edit page
    - Create /recruiter/job-descriptions/{id}/edit
    - Pre-fill form with existing data
    - Show warning about re-matching on update
    - _Requirements: 11.6_

  - [ ] 33.5 Implement bulk JD import
    - Create /recruiter/job-descriptions/import with CSV upload
    - Validate CSV format
    - Show import progress and results
    - _Requirements: 11.9_

  - [ ]* 33.6 Write unit tests for recruiter JD pages
    - Test JD creation form
    - Test skill extraction
    - Test JD list rendering
    - Test JD editing
    - Test bulk import
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 11.9_

- [ ] 34. Frontend - Talent pool and candidate ranking
  - [ ] 34.1 Implement bulk CV upload page
    - Create /recruiter/talent-pool/upload with multi-file upload
    - Support up to 50 files
    - Show upload progress for each file
    - Display success/failure summary
    - _Requirements: 14.1, 14.2, 14.4, 14.8_

  - [ ] 34.2 Implement talent pool ranking page
    - Create /recruiter/talent-pool with JD selection and filters
    - Display ranked candidates with match scores
    - Show matching skills, missing skills, key highlights
    - Support filtering by min_score, required_skills, experience_level, education
    - Implement pagination (20 per page)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.10_

  - [ ] 34.3 Implement candidate comparison view
    - Create side-by-side comparison for up to 5 candidates
    - Display match scores, skills, experience, education
    - Highlight differences
    - _Requirements: 15.8_

  - [ ] 34.4 Implement candidate details page
    - Create /recruiter/candidates/{id} with full analysis
    - Display CV document, skill report, match analysis, gap report, XAI report
    - Show CV excerpts contributing to match score
    - Support PII unmasking with legal basis input
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [ ]* 34.5 Write unit tests for talent pool pages
    - Test bulk upload component
    - Test candidate ranking display
    - Test filtering and pagination
    - Test candidate comparison
    - Test candidate details rendering
    - Test PII unmasking flow
    - _Requirements: 14.1, 15.1, 15.2, 15.3, 15.8, 16.1, 16.6_


- [ ] 35. Frontend - Export and reporting
  - [ ] 35.1 Implement export dialog
    - Create export modal with format selection (PDF/CSV)
    - Allow candidate selection (individual or bulk)
    - Support field selection for export
    - Option for anonymized export
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ] 35.2 Implement export download
    - Trigger export generation
    - Show progress indicator
    - Download file when ready
    - Handle large exports (ZIP compression)
    - _Requirements: 17.1, 17.2, 17.10_

  - [ ] 35.3 Implement scheduled export configuration
    - Create /recruiter/exports/schedule page
    - Configure email recipients and frequency
    - Select export format and fields
    - _Requirements: 17.9_

  - [ ]* 35.4 Write unit tests for export features
    - Test export dialog rendering
    - Test format selection
    - Test field selection
    - Test anonymization option
    - Test download trigger
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 36. Frontend - User profile and settings
  - [ ] 36.1 Implement profile page
    - Create /profile with user information display
    - Allow editing: first_name, last_name, preferred_language
    - Show email verification status
    - _Requirements: 2.1, 2.2_

  - [ ] 36.2 Implement account deletion flow
    - Create account deletion confirmation dialog
    - Show warning about data removal
    - Display 30-day grace period information
    - _Requirements: 2.3_

  - [ ] 36.3 Implement data export page
    - Create /profile/export to request GDPR data export
    - Show export progress
    - Download JSON file when ready
    - _Requirements: 2.4, 20.5_

  - [ ] 36.4 Implement language switcher
    - Add language selector to navigation
    - Support AR/EN/FR switching
    - Persist language preference
    - Update UI immediately on change
    - _Requirements: 21.1, 21.8_

  - [ ]* 36.5 Write unit tests for profile pages
    - Test profile editing
    - Test account deletion flow
    - Test data export request
    - Test language switching
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 21.1, 21.8_

- [ ] 37. Checkpoint - Frontend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 38. Frontend - Admin dashboard and audit logs
  - [ ] 38.1 Implement admin dashboard page
    - Create /admin/dashboard with system overview
    - Display total users, CVs, analyses, system health
    - Show recent activity and alerts
    - _Requirements: 20.14_

  - [ ] 38.2 Implement audit logs viewer
    - Create /admin/audit-logs with filterable table
    - Support filtering by user, operation, resource type, date range
    - Display operation details, IP address, user agent
    - Implement pagination (50 per page)
    - _Requirements: 20.6, 20.14_

  - [ ] 38.3 Implement audit log details page
    - Create /admin/audit-logs/{id} for detailed view
    - Show complete operation metadata
    - Display user information and context
    - _Requirements: 20.14_

  - [ ] 38.4 Implement audit log export
    - Create export dialog for audit logs
    - Support CSV and JSON formats
    - Allow date range selection
    - Limit export to 90-day ranges
    - _Requirements: 20.6_

  - [ ] 38.5 Implement user management page
    - Create /admin/users with user list
    - Support search by email or name
    - Filter by role, active status, email verification
    - Allow activating/deactivating users
    - Display user statistics (CV count, analysis count)
    - _Requirements: 20.9_

  - [ ] 38.6 Implement system statistics page
    - Create /admin/system/stats with metrics dashboard
    - Display user statistics, document statistics, analysis statistics
    - Show storage usage and performance metrics
    - Visualize data with charts
    - _Requirements: 23.5, 23.6_

  - [ ]* 38.7 Write unit tests for admin pages
    - Test audit log filtering and pagination
    - Test audit log export
    - Test user management operations
    - Test system statistics display
    - _Requirements: 20.6, 20.9, 20.14_


- [ ] 38. Frontend - Admin dashboard and audit logs
  - [ ] 38.1 Implement admin dashboard page
    - Create /admin/dashboard with system overview
    - Display total users, CVs, analyses, system health
    - Show recent activity and alerts
    - _Requirements: 20.14_

  - [ ] 38.2 Implement audit logs viewer
    - Create /admin/audit-logs with filterable table
    - Support filtering by user, operation, resource type, date range
    - Display operation details, IP address, user agent
    - Implement pagination (50 per page)
    - _Requirements: 20.6, 20.14_

  - [ ] 38.3 Implement audit log details page
    - Create /admin/audit-logs/{id} for detailed view
    - Show complete operation metadata
    - Display user information and context
    - _Requirements: 20.14_

  - [ ] 38.4 Implement audit log export
    - Create export dialog for audit logs
    - Support CSV and JSON formats
    - Allow date range selection
    - Limit export to 90-day ranges
    - _Requirements: 20.6_

  - [ ] 38.5 Implement user management page
    - Create /admin/users with user list
    - Support search by email or name
    - Filter by role, active status, email verification
    - Allow activating/deactivating users
    - Display user statistics (CV count, analysis count)
    - _Requirements: 20.9_

  - [ ] 38.6 Implement system statistics page
    - Create /admin/system/stats with metrics dashboard
    - Display user statistics, document statistics, analysis statistics
    - Show storage usage and performance metrics
    - Visualize data with charts
    - _Requirements: 23.5, 23.6_

  - [ ]* 38.7 Write unit tests for admin pages
    - Test audit log filtering and pagination
    - Test audit log export
    - Test user management operations
    - Test system statistics display
    - _Requirements: 20.6, 20.9, 20.14_


- [ ] 39. Integration testing and end-to-end testing
  - [ ] 39.1 Set up integration test environment
    - Configure test database, Redis, ChromaDB
    - Create test fixtures for users, CVs, JDs
    - Set up test data cleanup
    - _Requirements: 1.1, 3.1, 11.1_

  - [ ] 39.2 Write integration tests for CV processing pipeline
    - Test complete flow: upload → virus scan → extraction → Privacy Gateway → RAG Pipeline
    - Verify data stored correctly in all tables
    - Test error handling at each stage
    - _Requirements: 3.1, 4.1, 6.1, 7.1_

  - [ ] 39.3 Write integration tests for matching pipeline
    - Test complete flow: CV + JD → Matching → Gap → XAI
    - Verify analysis records created correctly
    - Test caching behavior
    - _Requirements: 8.1, 9.1, 10.1_

  - [ ] 39.4 Write integration tests for coaching features
    - Test chat session creation and message exchange
    - Test interview simulation flow
    - Test answer evaluation and report generation
    - _Requirements: 12.1, 13.1_

  - [ ] 39.5 Write integration tests for recruiter workflows
    - Test bulk CV upload and processing
    - Test talent pool ranking with filters
    - Test export generation (PDF and CSV)
    - _Requirements: 14.1, 15.1, 17.1_

  - [ ] 39.6 Set up end-to-end testing with Playwright
    - Configure Playwright for Next.js
    - Create test scenarios for critical user journeys
    - _Requirements: 1.1_

  - [ ] 39.7 Write E2E tests for candidate journey
    - Test: Register → Login → Upload CV → View Skills → Match with JD → View Analysis → Chat with Coach
    - _Requirements: 1.1, 3.1, 6.1, 8.1, 12.1_

  - [ ] 39.8 Write E2E tests for recruiter journey
    - Test: Register → Login → Create JD → Bulk Upload CVs → Rank Candidates → View Details → Export
    - _Requirements: 1.1, 11.1, 14.1, 15.1, 17.1_

  - [ ]* 39.9 Write performance tests
    - Test API response times under load
    - Test concurrent user handling
    - Test bulk processing throughput
    - _Requirements: 22.1, 22.2, 22.3_

- [ ] 40. Documentation and deployment preparation
  - [ ] 40.1 Write API documentation
    - Document all endpoints with request/response examples
    - Include authentication requirements
    - Document error codes and responses
    - _Requirements: 1.1_

  - [ ] 40.2 Write deployment guide
    - Document Docker Compose setup
    - Document environment variables
    - Document database migration process
    - Document scaling strategies
    - _Requirements: 1.1_

  - [ ] 40.3 Write user guides
    - Create candidate user guide
    - Create recruiter user guide
    - Include screenshots and examples
    - _Requirements: 1.1_

  - [ ] 40.4 Configure production environment
    - Set up production Docker Compose configuration
    - Configure SSL certificates
    - Set up monitoring and alerting
    - Configure backup strategies
    - _Requirements: 20.8, 23.1_

  - [ ] 40.5 Perform security audit
    - Review all authentication and authorization code
    - Review PII handling and encryption
    - Review input validation
    - Test for common vulnerabilities (SQL injection, XSS, CSRF)
    - _Requirements: 20.1, 20.7, 20.8, 20.9_

- [ ] 41. Final checkpoint - System ready for deployment
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (22 properties total)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- The implementation uses Python (FastAPI, Celery) for backend and TypeScript (Next.js 14) for frontend
- All PII must pass through Privacy Gateway before external LLM processing
- Multi-agent architecture coordinates 5 specialized agents: Extraction, RAG, Matching, Gap, XAI
- Platform supports 3 languages: Arabic, English, French
- Docker Compose orchestrates 7 services: frontend, backend, celery-worker, postgres, redis, chromadb, clamav
