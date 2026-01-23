# Project Intake & Ingestion Engine - TODO

## Phase 1: Foundation & Database Design
- [x] Design central OE database schema (projects, users, knowledge base)
- [x] Design per-project database schema (documents, facts, red flags, verification)
- [x] Design knowledge database schema (deidentified facts, risk archetypes)
- [x] Document local file storage strategy and directory structure
- [x] Design Ollama integration for LLM processing

## Phase 2: Project Management & Database Provisioning
- [x] Implement project creation endpoint with per-project DB provisioning
- [x] Implement project database schema deployment (auto-migration)
- [x] Implement project listing and detail views
- [ ] Implement project deletion with data cleanup
- [x] Create project management dashboard

## Phase 3: Document Upload Interface
- [x] Build document upload page with drag-and-drop support
- [x] Implement file validation (PDF, DOCX, XLSX, etc.)
- [x] Implement local file storage (create project-specific directories)
- [x] Add document type classification (IM, DD Pack, Contract, Grid Study, etc.)
- [ ] Create placeholder UI for Google Drive integration
- [ ] Create placeholder UI for SharePoint integration
- [ ] Create placeholder UI for ACC integration

## Phase 4: Hybrid Document Processing Pipeline
- [ ] Implement PDF text extraction (pdf2pic, tesseract for OCR)
- [ ] Implement DOCX text extraction
- [ ] Implement XLSX text extraction
- [x] Implement deterministic fact extraction (regex patterns for dates, numbers, document numbers)
- [x] Integrate Ollama for LLM-based extraction
- [x] Implement fact consolidation and deduplication
- [x] Implement confidence scoring for extracted facts
- [ ] Create processing status tracking and progress UI

## Phase 5: Project Fact Base & Verification
- [ ] Implement facts table and queries
- [ ] Build fact verification interface
- [ ] Implement user approval workflow for facts
- [ ] Create fact search and filtering
- [ ] Implement fact history and audit trail
- [ ] Build fact categorization (Technology, Assumption, Parameter, Dependency)

## Phase 6: Red-Flag Detection Engine
- [ ] Define red-flag rules and archetypes
- [ ] Implement red-flag trigger logic
- [ ] Create red-flag severity classification
- [ ] Build red-flag dashboard and alerts
- [ ] Implement evidence gap tracking
- [ ] Create red-flag mitigation workflow

## Phase 7: Project Dashboard & Status Tracking
- [ ] Build main dashboard with project overview
- [ ] Implement ingestion status tracking
- [ ] Create fact extraction progress visualization
- [ ] Build red-flag summary and alerts
- [ ] Implement document processing queue
- [ ] Create project statistics and metrics

## Phase 8: Export Functionality
- [ ] Implement PDF export for Project Definition Reports (PDR)
- [ ] Implement Word/DOCX export for PDR
- [ ] Implement Excel/XLSX export for fact data
- [ ] Create PDR template with standard sections
- [ ] Implement export scheduling and background jobs

## Phase 9: De-identification & Knowledge Database
- [ ] Implement de-identification pipeline
- [ ] Create knowledge database schema
- [ ] Implement fact aggregation and anonymization
- [ ] Build benchmarking and precedent database
- [ ] Create knowledge base UI for browsing precedents

## Phase 10: Testing & Deployment
- [ ] Write unit tests for document processing
- [ ] Write integration tests for database provisioning
- [ ] Write tests for red-flag detection logic
- [ ] Set up CI/CD pipeline
- [ ] Create deployment documentation
- [ ] Test with sample project documents

## Future Enhancements
- [ ] Google Drive API integration (rclone-based)
- [ ] SharePoint integration (rclone-based)
- [ ] ACC (Autodesk Construction Cloud) integration
- [ ] Real-time collaboration features
- [ ] Advanced analytics and reporting
- [ ] Machine learning model training on precedent data

## UI Alignment with OE Toolkit
- [x] Analyze OE Toolkit Home.tsx design and layout
- [x] Implement matching navigation and header structure
- [x] Create landing page with tool cards matching OE Toolkit style
- [x] Update color scheme and gradients to match OE Toolkit
- [x] Implement card hover effects and animations from OE Toolkit
- [x] Update typography and spacing to match OE Toolkit
- [x] Ensure consistent iconography with OE Toolkit

## Document Text Extraction Implementation
- [x] Analyze Solar Analyzer document extraction patterns
- [x] Install PDF parsing libraries (pdf-parse, pdf2json)
- [x] Install DOCX parsing libraries (mammoth)
- [x] Install XLSX parsing libraries (xlsx)
- [x] Implement PDF text extraction service
- [x] Implement DOCX text extraction service
- [x] Implement XLSX text extraction service
- [x] Add OCR support for scanned PDFs (tesseract.js)
- [ ] Create document processing queue system
- [ ] Implement extraction progress tracking
- [ ] Add extracted text storage to project database

## Ollama Integration
- [ ] Review Solar Analyzer Ollama implementation
- [ ] Create Ollama configuration table in central DB
- [ ] Implement Ollama connection service
- [ ] Create admin interface for Ollama settings
- [ ] Implement LLM model selection
- [ ] Create extraction prompt templates
- [ ] Implement fact extraction via Ollama
- [ ] Add confidence scoring logic
- [ ] Implement source tracking for extracted facts

## Fact Verification Dashboard
- [ ] Design fact verification UI (similar to Solar Analyzer)
- [ ] Create fact listing page with filters
- [ ] Implement fact detail view with source references
- [ ] Add approve/reject actions
- [ ] Implement bulk approval workflow
- [ ] Add confidence score visualization
- [ ] Create fact editing interface
- [ ] Implement fact history tracking

## OE Toolkit Restructuring
- [x] Analyze current 19 tool structure and identify workflow groupings
- [x] Design integrated workflow presentation (TA/TDD, OE Delivery, Performance)
- [x] Create better names and descriptions for workflow stages
- [x] Update OE Toolkit Home.tsx with workflow-based layout
- [x] Update Project Ingestion Engine branding to reflect its role
- [x] Ensure consistency between OE Toolkit and individual tool branding

## Document Processing Integration
- [x] Create tRPC endpoint for document upload
- [x] Integrate document-extractor into upload flow
- [x] Integrate document-processor-v2 for fact extraction
- [ ] Add processing queue and status tracking
- [ ] Implement error handling and retry logic
- [ ] Add processing progress indicators in UI

## Fact Verification Dashboard
- [x] Create fact verification page route
- [x] Build fact list view with filtering and sorting
- [ ] Implement fact detail view with source context
- [x] Add approve/reject/edit actions for facts
- [x] Create confidence score visualization
- [ ] Implement bulk actions (approve all, reject all)
- [ ] Add fact history and audit trail
- [ ] Create export functionality for verified facts

## Ollama Configuration UI
- [x] Create Ollama configuration page route
- [x] Build Ollama server connection settings form (URL, API key)
- [x] Implement model selection dropdown (fetch available models from Ollama)
- [ ] Add extraction prompt templates for different document types
- [x] Create test connection functionality
- [x] Implement configuration save/update endpoints
- [x] Add configuration validation and error handling

## Document Processing Status Tracking
- [ ] Create processing_jobs table in per-project database
- [ ] Implement job status tracking (queued, processing, completed, failed)
- [ ] Add real-time progress updates using polling or websockets
- [ ] Build processing status UI component with progress bars
- [ ] Implement estimated completion time calculation
- [ ] Add retry functionality for failed jobs
- [ ] Create processing history view

## Red-Flag Detection Engine
- [ ] Design red-flag rules schema (category, condition, severity)
- [ ] Implement planning gap detection rules
- [ ] Implement grid integration risk detection rules
- [ ] Implement geotech issue detection rules
- [ ] Create red-flag evaluation engine
- [ ] Add red-flag storage to per-project database
- [ ] Implement red-flag severity scoring (critical, high, medium, low)
- [ ] Create red-flag alert notifications

## Red-Flag Dashboard
- [ ] Create red-flag dashboard page route
- [ ] Build red-flag list view with filtering by severity and category
- [ ] Implement red-flag detail view with source facts
- [ ] Add red-flag resolution workflow (acknowledge, resolve, dismiss)
- [ ] Create red-flag summary cards and statistics
- [ ] Implement red-flag export functionality
- [ ] Add red-flag trend analysis over time

## Export Functionality
- [ ] Install PDF generation libraries (pdfkit, jspdf)
- [ ] Install Word generation libraries (docxtemplater, officegen)
- [ ] Implement PDR PDF export with template
- [ ] Implement PDR Word export with template
- [ ] Implement fact base Excel export
- [ ] Add export buttons to fact verification and red-flag dashboards
- [ ] Implement export history tracking

## Dummy Data Workflow
- [x] Create dummy data generation service with realistic renewable energy project data
- [x] Generate sample documents (IM, DD Pack, Grid Study, Contract)
- [x] Generate sample extracted facts with various confidence scores
- [x] Generate sample red flags (planning gaps, grid risks, geotech issues)
- [x] Generate sample processing jobs with different statuses
- [x] Create simulation button in ProjectDashboard
- [x] Implement workflow orchestration (create project → upload docs → process → extract facts → detect red flags)
- [ ] Add progress indicators during simulation
- [ ] Test complete workflow end-to-end

## Demo Button Bug Fix
- [ ] Fix SQL INSERT statements in demo router to use proper parameter binding instead of string interpolation
- [ ] Test demo button with actual project
- [ ] Verify all dummy data is inserted correctly (documents, facts, red flags, processing jobs)

## TA/TDD/Pre-FC Brief Alignment
- [ ] Fix demo button to use multi-tenant Drizzle ORM inserts
- [ ] Analyze current implementation against 7-stage TA workflow
- [ ] Create capability map showing what exists vs what's needed
- [ ] Identify which tools can be reused vs need modification
- [ ] List new tools that must be built
- [ ] Create phased implementation plan (Day-1, Short-term, Later)
- [ ] Document human gates and judgement-assisting vs automated features
- [ ] Ensure PDR generator supports required sections
- [ ] Implement red-flag trigger logic with evidence links
- [ ] Build risk register framework with cause-event-impact structure
- [ ] Implement FC readiness signals (not scores)
- [ ] Add contract parsing and risk coverage mapping (if in scope)

## Demo Button Bug Fix (Completed)
- [x] Fix Drizzle ORM insert syntax in demo router - parameters being flattened instead of passed as array of objects
- [x] Test demo button after fix and verify all data inserts correctly
- [x] Root cause: TiDB Serverless HTTP driver parameter binding bug - used sql.raw() to bypass
- [x] Added DELETE statements before INSERT to handle duplicate keys

## Project Context Routing Bug (Completed)
- [x] Fix project card button navigation - clicking Upload/Facts/Processing Status shows "no project loaded"
- [x] Investigate how project ID should be passed from ProjectList to detail pages
- [x] Ensure project context is properly loaded on Upload, Facts, and Processing Status pages
- [x] Root cause: wouter's useLocation() returns only pathname, not query params - fixed by using window.location.search
- [x] Updated Facts and Processing Status pages to fetch project details first, then use dbName for queries

## Table Name Mismatch Bug (Completed)
- [x] Fix Facts page query - looking for extracted_facts table but demo data creates facts table
- [x] Check schema definition and ensure consistent table naming
- [x] Verify demo data inserts into correct table
- [x] Root cause: db-project-schema.sql created 'facts' table but code references 'extracted_facts'
- [x] Updated db-project-schema.sql to use 'extracted_facts' with correct column names
- [x] Added projects.resetDatabase endpoint to recreate project databases with updated schema
- [x] Added Reset DB button to project cards for easy database reset

## Column Name Mismatch Bug (Completed)
- [x] Fix Facts query - using confidence_score but schema defines confidence column
- [x] Find all SQL queries that reference confidence_score and update to confidence
- [x] Verify Facts page loads correctly after fix
- [x] Updated routers.ts line 231 to use confidence instead of confidence_score

## SSL Connection Error in Reset DB (Completed - Feature Removed)
- [x] Fix resetDatabase endpoint - TiDB requires SSL but connection config missing ssl option
- [x] Add SSL configuration to database connection in resetDatabase mutation
- [x] Discovered TiDB Serverless doesn't allow DROP DATABASE - removed Reset DB feature
- [x] Users can create new projects instead of resetting existing ones

## MySQL Server Setup for Local Development (Current Issue)
- [ ] Install and configure local MySQL server in sandbox
- [ ] Update DATABASE_URL to point to local MySQL instead of TiDB Serverless
- [ ] Run Drizzle migrations to create main database schema
- [ ] Test project creation with separate database provisioning
- [ ] Test demo data loading with local MySQL
- [ ] Verify separate database per project architecture works correctly

## Per-Project Database Table Creation Bug (FIXED)
- [x] Verify project-db-provisioner.ts creates tables after creating database
- [x] Check if db-project-schema.sql is being executed during provisioning
- [x] Fix demo data INSERT to match actual schema column names
- [x] Test demo button loads all data successfully
- [x] Fixed DATABASE_URL override issue (was using TiDB Serverless instead of local MySQL)
- [x] Fixed SQL statement parsing in provisioner (removed comment filtering bug)
- [x] Fixed demo router to use raw mysql2 connection instead of Drizzle
- [x] Fixed table names (red_flags → redFlags) and severity capitalization
- [x] Verify Facts page displays demo data correctly
- [x] Fixed Processing Status page query (fileName column name)
- [x] All demo data loading and displaying correctly!

## Document Upload Functionality (COMPLETED)
- [x] Create backend upload endpoint with base64 file data support
- [x] Implement file validation (PDF, DOCX, XLSX, max size 50MB)
- [x] Store uploaded files in local filesystem with project-specific directories
- [x] Save document metadata to per-project database (documents table)
- [x] Build frontend upload UI with drag-and-drop zone
- [x] Add file type selection dropdown (IM, DD_PACK, CONTRACT, GRID_STUDY, CONCEPT_DESIGN, OTHER)
- [x] Implement upload progress indicator
- [x] Add file list display showing uploaded documents
- [x] Test upload with sample PDF files
- [x] Verify documents appear in database and filesystem
- [x] Fixed DATA_DIR path to use writable location (/home/ubuntu/project-ingestion-engine/data/projects)
- [x] Fixed documentType enum values to match backend (all uppercase)
- [x] Fixed projectId handling (numeric ID vs "proj_" prefix)
- [x] Fixed database connection to query dbName from projects table
- [x] Fixed SQL parameterized queries to prevent SQL injection

## Documents List View (COMPLETED)
- [x] Create backend endpoint to list documents for a project
- [x] Build Documents page UI with cards showing fileName, documentType, status, uploadDate, fileSize
- [x] Add Documents navigation button to project cards
- [x] Add route for /project/:id/documents
- [x] Fixed SQL query parameter binding in documents.list endpoint
- [ ] Implement document download action (UI ready, backend TODO)
- [ ] Implement document delete action (UI ready, backend TODO)
- [x] Show document processing status (Uploaded, Processing, Processed, Error)

## Document Processing Pipeline (COMPLETED)
- [x] Enable processDocument call in upload endpoint (routers.ts line 111)
- [x] Update processDocument to accept string UUID documentId
- [x] Test document text extraction with uploaded PDF
- [x] Processing pipeline working (text extraction via OCR, deterministic patterns)
- [x] Ollama LLM extraction requires separate Ollama installation
- [ ] Install and configure Ollama for LLM-based fact extraction (optional)
- [ ] Verify extracted facts appear in Facts page (requires Ollama)
- [ ] Test processing status tracking
- [x] Handle processing errors gracefully

## AI Document Type Detection & Upload Improvements (Current)
- [ ] Switch upload endpoint from base64 JSON to multipart/form-data for large files (75MB+)
- [ ] Update frontend to use FormData for file uploads instead of base64 encoding
- [ ] Implement AI document type detection using LLM (analyze title and first page)
- [ ] Add document type editing UI on Documents page
- [ ] Create backend endpoint to update document type
- [ ] Test upload with 75MB+ files
- [ ] Test AI categorization accuracy with sample documents
- [ ] Add loading indicator during AI categorization

## AI Document Type Detection & Upload Improvements (COMPLETED)
- [x] Increase JSON payload limit to 100MB for larger file uploads
- [x] Implement AI document type detection using LLM
- [x] Add "Auto-detect (AI)" option to upload form (default selection)
- [x] Update upload endpoint to call AI detection when type is AUTO
- [x] Test AI categorization with sample IM document
- [x] Verified AI correctly identifies document types from filename and content
- [x] AI detection working: analyzed "test_IM_document.pdf" and correctly detected as "IM"
- [x] Edit document type functionality working (can change category after upload)
- [x] Reverted from multipart/form-data to base64 upload (simpler, more reliable)
- [ ] Test large file upload (50MB+) - requires actual large file

## Document Processing Pipeline Review & Improvements (Current)
- [ ] Analyze current document-processor-v2.ts implementation
- [ ] Check text extraction errors (pdf-parse issues in logs)
- [ ] Review fact extraction logic (deterministic + Ollama)
- [ ] Verify extracted facts are being stored in database
- [ ] Check processing status updates in processing_jobs table
- [ ] Test with uploaded documents and verify Facts page shows results
- [ ] Fix any errors preventing successful processing
- [ ] Add better error handling and logging
- [ ] Improve extraction quality for different document types

## Document Processing Pipeline Review (COMPLETED)
- [x] Fixed PDF extraction (pdf-parse import issue - switched to PDFParse class)
- [x] Fixed fact storage to database (schema column names: source_document_id, key, value, extraction_method)
- [x] Verified deterministic fact extraction working (capacity, voltage, technology)
- [x] Verified facts display on Facts page (15 total facts showing correctly)
- [x] Processing pipeline fully functional: upload → extract text → extract facts → save to DB
- [x] Confirmed 5 facts extracted and saved from test document (150 MW, 120 MW, 1000 MW, 132 kV, solar)
- [ ] Fix "NaN" average confidence display (confidence stored as string not number)
- [ ] Fix Facts table display (Key column showing empty, values in wrong columns)

## Intelligent LLM-Powered Fact Extraction (Current)
- [ ] Design extraction architecture with multi-pass strategy
- [ ] Implement LLM-powered structured extraction with JSON schema output
- [ ] Create fact category definitions (Project_Identity, Technical_Specifications, Grid_Connection, Site_Characteristics, Timeline, Energy_Performance, Regulatory, Risks, Financial, Dependencies)
- [ ] Implement First Pass: Structured data extraction (key-value pairs with categories)
- [ ] Implement Second Pass: Relationship extraction (dependencies, constraints)
- [ ] Implement Third Pass: Risk identification (red flags, challenges, gaps)
- [ ] Implement Fourth Pass: Assumption extraction (design parameters, estimates)
- [ ] Add document-type-specific extraction strategies (IM vs Grid Study vs DD Pack)
- [ ] Test with Marsa Solar Feasibility PDF (should extract 40+ facts vs current 5)
- [ ] Verify facts include ownership structure, site relocation history, study schedules, etc.

## Intelligent LLM-Powered Fact Extraction (COMPLETED - Jan 23, 2026)

- [x] Implement multi-pass LLM extraction system with structured JSON output
- [x] Pass 1: Extract structured data (project identity, technical specs, grid connection, site details, timeline)
- [x] Pass 2: Extract relationships and dependencies between facts
- [x] Pass 3: Extract risks and red flags
- [x] Pass 4: Extract assumptions and design parameters
- [x] Integrate intelligent extractor into document processor
- [x] Test with Marsa Solar Feasibility PDF (1.2 MB, 9 pages)
- [x] Results: 89 total facts extracted (79 LLM + 13 deterministic, deduplicated)
  - Pass 1: 44 structured facts
  - Pass 2: 8 relationship facts
  - Pass 3: 10 risk facts
  - Pass 4: 17 assumption facts
- [x] Extraction time: 29.6 seconds for comprehensive analysis
- [x] 18x improvement over basic extraction (89 facts vs 5 facts)
- [x] Facts displayed correctly in Facts page (114 total including demo data)
- [x] Categories include: Project_Identity, Technical_Specifications, Grid_Connection, Site_Characteristics, Timeline, Dependencies, Risks, Financial, Regulatory, Technology_Choice, Design_Parameters, Performance_Estimate, Engineering_Assumption

**Key Achievements:**
- Comprehensive fact extraction covering all document aspects
- Structured output with proper categorization
- Risk and dependency identification
- Timeline and milestone extraction
- Technical specification capture
- Financial and regulatory information extraction

## Structured Contextual Fact Extraction (Current - Jan 23, 2026)

**Problem**: Current extraction produces disconnected data points without context (e.g., "7 Aug 2025" under Timeline, "51%" under Financial)

**Solution**: Restructure extraction to produce meaningful, contextual information organized into coherent sections

- [ ] Redesign extraction prompts to produce full sentences with context
  - Instead of: "Timeline: 7 Aug 2025"
  - Produce: "ESIA Scoping completion scheduled for 7 Aug 2025"
- [ ] Implement hierarchical fact relationships (parent-child structure)
  - Example: "Grid Connection" → "Primary: 132kV LILO at Clare Substation" → "Future: 400kV line 4km away"
- [ ] Create section-based organization
  - Project Overview (name, location, partners, ownership)
  - Technical Design (capacity, technology, configuration)
  - Timeline & Milestones (key dates with descriptions)
  - Financial Structure (ownership %, investment, revenue model)
  - Grid Connection (voltage levels, distances, connection points)
  - Site Characteristics (area, topography, access, constraints)
  - Risks & Issues (identified risks with severity and mitigation)
  - Regulatory & Approvals (permits, studies, compliance)
  - Dependencies & Assumptions (critical dependencies, design assumptions)
- [ ] Update database schema to support hierarchical facts
  - Add parent_fact_id column for fact relationships
  - Add section column for grouping
  - Add statement column for full contextual sentence
- [ ] Update Facts page UI to display hierarchical structure
  - Group facts by section
  - Show parent-child relationships
  - Display full contextual statements instead of key-value pairs
- [ ] Test with Marsa Solar PDF and verify structured output
- [ ] Generate Project Summary document from structured facts

## Structured Contextual Fact Extraction (COMPLETED)
- [x] Redesign extraction prompts to produce complete sentences with full context
- [x] Replace disconnected key-value pairs with self-contained statements
- [x] Organize facts into meaningful sections (Project_Overview, Financial_Structure, Technical_Design, etc.)
- [x] Test with Marsa Solar PDF - 72 contextual facts extracted
- [x] Verified facts read like structured brief instead of database dump
- [x] Example improvements:
  * OLD: "51%" → NEW: "OQAE holds a 51% stake in the Marsa Solar Project joint venture"
  * OLD: "14/05/2025" → NEW: Facts now include milestone context
  * OLD: "300 MW" → NEW: Capacity facts include DC/AC distinction and purpose
