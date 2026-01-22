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
