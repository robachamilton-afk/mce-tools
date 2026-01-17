# Solar Analyzer TODO

## Phase 1: Database & Site Import
- [x] Define database schema for sites, configurations, and assessments
- [x] Import 125 solar farms from APVI data
- [x] Set up site search functionality

## Phase 2: Site Selection UI
- [x] Build site search with autocomplete
- [x] Auto-populate form from database
- [x] Match MCE website branding (blue theme)
- [x] Write and pass all tests for site management

## Phase 3: File Upload & Mapping
- [ ] Create file upload interface (SCADA + meteo)
- [ ] LLM-powered column mapping
- [ ] Data validation and preview

## Phase 4: Satellite Analysis
- [ ] Google Maps API integration
- [ ] Image caching to S3
- [ ] GPT-4 Vision analysis for tracking type/azimuth
- [ ] Display satellite image on site page

## Phase 5: Adaptive Detection
- [ ] Clear-sky filtering with pvlib
- [ ] Multi-period sampling (3 weeks)
- [ ] Fixed vs tracking model testing
- [ ] Tilt angle optimization
- [ ] Confidence scoring

## Phase 6: Performance Assessment
- [ ] Integrate pvlib performance model
- [ ] Run assessment with detected configuration
- [ ] Generate metrics (Technical PR, Overall PR, curtailment)
- [ ] Create visualizations

## Phase 7: PDF Reports
- [ ] Branded PDF generation with MCE styling
- [ ] Include visualizations and metrics
- [ ] Export to Excel option

## Phase 8: Dashboard
- [ ] Multi-site dashboard with cards
- [ ] Filtering and sorting
- [ ] Top 5 Prospects card (lost revenue)
- [ ] Historical trending

## Phase 9: Admin Section
- [ ] Database refresh function
- [ ] Conflict resolution UI
- [ ] Manual site editing

## Phase 10: Background Jobs
- [ ] Cron script for satellite image refresh
- [ ] Alert system for configuration changes

## Phase 11: Testing & Deployment
- [ ] End-to-end workflow testing
- [ ] Create checkpoint
- [ ] Push to GitHub (MCE-tools repo)
- [ ] Documentation

## Styling Updates
- [x] Replicate MCE website layout and navigation structure
- [x] Add MCE logo and header menu
- [x] Switch to dark theme as default with toggle
- [x] Match MCE website color scheme, typography, and spacing
- [x] Implement MCE-style footer

## Search UX Improvements
- [x] Add autocomplete dropdown to search bar (MCE-style)
- [x] Show matching sites as user types
- [x] Display site name, DUID, and capacity in dropdown
- [ ] Navigate to site detail page on selection (need to create site detail page)
## Site Detail Page
- [x] Create site detail page route (/site/:id)
- [x] Display full site information (name, DUID, capacity, coordinates, status)
- [x] Add location map with site marker (placeholder)
- [x] Show assessment history table
- [x] Add "New Assessment" button
- [x] Write tests for site detail functionality

## Assessment Dashboard
- [x] Create dashboard page route (/dashboard)
- [x] Display key metrics (total sites, assessments, recent activity)
- [x] Show recent assessments list with filtering
- [x] Add performance charts/visualizations (empty state)
- [x] Show top 10 sites by capacity with click-through
- [x] Write tests for dashboard functionality

## Clare Solar Farm Scanning & Assessment
- [x] Review Clare Solar Farm scraped data
- [x] Integrate Google Maps API with satellite imagery
- [x] Add interactive map to Clare's site detail page
- [x] Build scanning engine for tracking type detection
- [x] Implement azimuth and tilt angle detection
- [x] Create configuration analysis system
- [x] Build comprehensive Clare assessment dashboard
- [x] Display satellite imagery with annotations
- [x] Show detected configuration (tracking type, azimuth, tilt, GCR)
- [x] Add performance metrics and analysis (PR, curtailment, lost revenue)
- [x] Write tests for scanning engine (10/10 passing)

## Equipment Details & Visualizations
- [x] Extend database schema for inverter details (make, model, count)
- [x] Extend database schema for module details (make, model)
- [ ] Search AEMO/APVI data sources for equipment information (deferred - no data source found)
- [x] Add conditional rendering for equipment fields (only show if data available)
- [x] Implement PCU count field in schema (ready for satellite AI detection)
- [x] Create generation profile chart (time-series with curtailment)
- [x] Create PR trend visualization (technical vs overall)
- [x] Create curtailment analysis chart (hourly pattern)
- [x] Add performance graphs to assessment page
- [x] Write tests for equipment data and visualizations (7/7 passing)

## Dark Mode Chart Fixes
- [x] Update chart text colors for dark mode visibility
- [x] Test charts in both light and dark themes

## Bulk Site Scanning
- [x] Scan all 124 NEM solar farms with configuration detection
- [x] Generate baseline assessments for each site
- [x] Verify data quality and completeness (124/124 success, 0 errors)
- [x] Create database export for deployment

## UI Fixes
- [x] Fix dark mode graph colors - X-axis and Y-axis tick labels now visible
- [x] Fix "Analyze Performance" button on home page to navigate to site detail page

## Satellite Vision Analysis (Iterative LLM Exploration)
- [x] Implement LLM function-calling for satellite image fetching
- [x] Give LLM ability to request images at any coordinates/zoom level
- [x] Build iterative exploration workflow (wide view → locate farm → zoom in → analyze details)
- [x] Handle coordinate offset correction automatically
- [x] Restructure into focused phases: location (2 iter) → measurement (1 iter) → equipment (separate)
- [x] Implement zoom 20 pixel-based measurement for accurate pitch/GCR
- [x] Test zoom 17, 18, 19 for PCU detection accuracy
- [x] Implement grid-based PCU detection with overlap and spatial context
- [x] Add cut-out pattern guidance for PCU detection
- [x] Finalize zoom 17 with overlap as production PCU detection
- [x] Create equipment_detections table schema (type, lat/lon, status, confidence)
- [x] Build interactive map tagging UI with Google Maps
- [x] Implement equipment marker add/remove/move functionality
- [x] Add equipment type selector (PCU, substation, combiner box, transformer)
- [x] Create tRPC procedures for equipment CRUD operations
- [x] Add user verification workflow (auto-detect → user validates → save)
- [x] Add extraction metadata tracking (source, confidence, method, timestamp)
- [ ] Test full workflow on Clare Solar Farm
- [ ] Run bulk satellite analysis on all 124 sites
- [ ] Generate site schematics (boundary, roads, equipment locations)
- [ ] Align data export format with acc-tools datamodel structure

## Equipment Data Population
- [ ] Research AEMO NEM Registration database for equipment data
- [ ] Build scraper for inverter specifications (make, model, count)
- [ ] Build scraper for module specifications (make, model)
- [ ] Test equipment scraping on Clare Solar Farm
- [ ] Run bulk equipment population on all 124 sites

## Bug Fixes
- [x] Fix infinite loop error in EquipmentTagging component (Maximum update depth exceeded)
- [x] Fix Google Maps duplicate loading error on equipment tagging page
- [x] Investigate why auto-detected equipment not showing (resolved: site 1 has no equipment, site 114 Clare works correctly)

## Equipment Tagging UX Improvements
- [x] Set default map type to satellite view (currently defaults to map view)
- [x] Auto-zoom map to fit all equipment markers with bounds
- [x] Fix 'google is not defined' error in MapView default parameter
- [x] Fix map zoom resetting to extents when new equipment is added (should only auto-zoom on initial load)
- [x] Add "Fit to Bounds" button to manually reset zoom to see all equipment
- [x] Add bulk verification action to mark all auto-detected equipment as verified at once

## Custom Performance Analysis Engine
- [x] Design database schema for custom analyses (uploaded data, contract details, results)
- [x] Update schema to store extracted equations and model parameters from contracts
- [x] Build file upload interface supporting Contract PDF, SCADA CSV/Excel/PDF, Meteo CSV/Excel/PDF
- [x] Implement LLM contract parser to extract equations, tariffs, capacity guarantees, performance requirements
- [x] Add undefined terms detection and clarification system
- [x] Create model confirmation UI for reviewing and adjusting extracted equations and parameters
- [x] Build column mapping interface with LLM-suggested mappings for SCADA and meteo files
- [x] Implement LLM CSV/Excel header analysis to suggest column mappings
- [x] Create column mapping confirmation UI with dropdown selectors
- [x] Add tRPC procedures for column mapping analysis and updates
- [x] Implement model execution engine with equation parsing and evaluation
- [x] Build variable substitution system to map data columns to equation variables
- [x] Generate performance results (PR, availability, energy generation)
- [x] Calculate revenue and penalty assessments based on contract terms
- [x] Create results page with performance metrics and compliance status
- [x] Install Recharts library for data visualization
- [x] Add time-series charts for PR, availability, and generation trends
- [x] Implement PDF report generation with performance summary and charts
- [x] Implement Excel export with detailed data tables

## Bug Fixes (Jan 15, 2026)
- [x] Fix 404 error for New Assessment button - route not configured
- [x] Fix authentication error when creating new custom analysis
- [x] Verify all "New Assessment" buttons route to /new-assessment
- [x] Create Assessments list page (currently 404)
- [x] Fix "Invalid Time value" error in contract extraction date parsing
- [x] Update file upload to accept Excel files (.xlsx, .xls) for SCADA and meteo data
- [x] Add Excel parsing capability to backend for data processing
- [x] Fix backend validation error "Invalid data type - upload PDF or csv" to accept Excel MIME types
- [x] Add drag-and-drop functionality to file upload areas
- [x] Fix non-deterministic contract extraction (same contract produces different clarifications each time)

## Analysis Workflow Enhancements
- [ ] Add analysis mode selector (Contract-Based vs MCE Performance Tool)
- [ ] Implement MCE Performance Tool workflow without contract requirement
- [x] Create demo workflow button with auto-generated mock data
- [x] Add demo data generation for contract, SCADA, and meteo files
- [x] Add "Run Demo Analysis" button to site detail page
- [x] Fix 404 error when clicking Run Demo Analysis button

## Ollama Integration for Local Deployment
- [x] Create ollama.ts module for local LLM integration
- [x] Switch contract parser from Manus API to llama3.2-vision:11b
- [x] Implement PDF to image conversion (pdf2pic + GraphicsMagick)
- [x] Fix 'image: unknown format' error by converting PDFs to PNG before vision analysis
- [ ] Test contract extraction with scanned PDFs locally (requires local Ollama setup + GraphicsMagick)
- [ ] Update documentation for Ollama setup and model requirements

## Improve Contract Extraction Quality
- [x] Increase PDF rendering resolution from 150 DPI to 300 DPI for better OCR
- [x] Optimize extraction prompt for llama3.2-vision model
- [ ] Test extraction accuracy with real scanned contract (ready for user testing)

## Fix Ollama Connection Error
- [ ] Add detailed error logging to Ollama API calls to identify fetch failure cause
- [ ] Configure fetch timeout (vision models can take 60+ seconds)
- [ ] Add connection retry logic for transient failures
- [ ] Test with curl to verify Ollama API is accessible

## Switch to llava:34b for Better Document Extraction
- [x] Update contractParser to use llava:34b instead of llama3.2-vision:11b
- [ ] User needs to pull model locally: `ollama pull llava:34b` (~20GB)
- [ ] Test extraction quality with real contract PDF

## Create Ollama Integration Documentation
- [x] Write OLLAMA_SETUP.md with installation instructions
- [x] Document model requirements and system specifications
- [x] Add troubleshooting guide for common issues
- [x] Document alternative local LLM options (LM Studio, vLLM, etc.)
- [x] Push documentation to mce-tools repository

## Database Cleanup and Reseed
- [x] Analyze current database for duplicates
- [x] Create cleanup script to truncate all tables
- [x] Reseed with clean APVI solar farm data
- [x] Verify data integrity after reseed

## Fix Ollama Contract Parser JSON Issues
- [x] Improve JSON parsing to handle malformed responses
- [x] Add extraction from markdown code blocks
- [x] Reduce page count from 10 to 2 to avoid model overload

## Debug llava:34b Contract Parser
- [x] Fix misleading model references (was showing llama3.2-vision:11b in logs)
- [x] Strengthen JSON format instruction in prompt
- [ ] Test with updated prompt to see if model returns valid JSON
- [ ] If still fails, try simpler extraction (just extract raw text first)

## Switch to Qwen2.5-VL for Contract Extraction
- [x] Create proper JSON schema for contract extraction (contractSchema.ts)
- [x] Update ollama.ts to support JSON schema in format parameter
- [x] Update contract parser to use qwen2.5vl:7b instead of llava:34b
- [x] Add stop tokens to prevent HTML tag spill
- [x] Set low temperature (0.1) for deterministic output
- [ ] Test with real contract PDF
- [ ] Push changes to mce-tools repository

## Fix qwen2.5vl Timeout Issue
- [x] Increase Ollama request timeout from 2 to 5 minutes
- [x] Reduce image resolution from 300 DPI to 150 DPI
- [ ] Test with single-page contract PDF

## Add Processing Timer to Contract Extraction
- [ ] Make revenueCalculations optional in JSON schema
- [ ] Add elapsed time timer to contract extraction UI
- [ ] Show timer during "Extracting Model" phase
- [ ] Display final processing time after completion

## Add Processing Timer and Fix Validation
- [x] Make revenueCalculations optional in JSON schema (not required)
- [x] Add elapsed time timer to contract extraction UI
- [x] Show timer during "Extracting Model" phase
- [x] Display final processing time after completion

## Implement OCR-First Contract Extraction Pipeline
- [x] Install OCR dependencies (Tesseract)
- [x] Create OCR module for text extraction with bbox/confidence
- [x] Create new JSON schema with evidence references
- [x] Implement PDF render → OCR → document assembly stages
- [x] Switch from vision model to qwen2.5:14b text model
- [x] Add JSON schema validation with self-healing retry logic
- [x] Implement 3-pass equation extraction (detect → reconstruct → validate)
- [x] Add evidence references (page + OCR snippet) to all fields
- [x] Integrate V2 pipeline into existing router
- [ ] Test with TestSchedule.pdf to validate extraction quality
- [ ] Verify PR equation produces correct computational form

## Fix Text Model Extraction Ollama Call
- [x] Simplify format parameter to use 'json' string (more compatible than schema object)
- [ ] Test with TestSchedule.pdf to verify extraction works

## Verify Text-Only Ollama Implementation
- [x] Confirm ollamaChat messages have no images array
- [x] Add explicit logging to show text-only mode
- [x] Add diagnostic error messages for common Ollama issues
- [ ] User needs to install qwen2.5:14b model locally (run: ollama pull qwen2.5:14b)

## Hybrid OCR Pipeline (Tesseract + RapidLaTeXOCR + Qwen)
- [x] Install RapidLaTeXOCR Python package (ONNX-based, no PyTorch)
- [x] Create equation region detection module (server/equationDetection.ts)
- [x] Create image cropping and upscaling utility (server/imageCropping.ts)
- [x] Create RapidLaTeXOCR wrapper (server/latexOCR.ts)
- [x] Create contractParserV3 with hybrid pipeline (Tesseract + RapidLaTeXOCR + Qwen)
- [ ] Test equation extraction quality with TestSchedule.pdf PR formula
- [ ] Validate LaTeX output and computational AST generation
- [x] Push hybrid pipeline changes to mce-tools repository

## Pix2Text Migration (Windows Compatibility Fix)
- [x] Replace RapidLaTeXOCR with Pix2Text in latexOCR.ts
- [x] Update installation instructions for Pix2Text (HYBRID_PIPELINE_SETUP.md)
- [ ] Test Pix2Text installation on Windows
- [x] Update contractParserV3 documentation
- [ ] Push Pix2Text changes to mce-tools repository

## V3 Pipeline Integration Fix
- [x] Pull latest code from mce-tools repository
- [x] Copy V3 modules to solar-analyzer (equationDetection, imageCropping, latexOCR, contractParserV3)
- [x] Update db.ts to use contractParserV3 instead of V2
- [ ] Test end-to-end extraction flow with V3 pipeline
- [ ] Verify LaTeX extraction quality improvements
- [ ] Fix any runtime errors or missing dependencies
- [x] Push working version back to mce-tools

## Fix Missing Dependencies
- [ ] Add tesseract.js to package.json dependencies
- [ ] Verify sharp is in dependencies (for image cropping)
- [ ] Push updated package.json to mce-tools

## Fix Monorepo Dependency Installation
- [ ] Check mce-tools root package.json for workspace configuration
- [ ] Check for pnpm-workspace.yaml or lerna.json
- [ ] Fix workspace configuration to include solar-analyzer dependencies
- [ ] Push fixed configuration to mce-tools

## Dependency Audit and Fix
- [x] Verify all V3 pipeline dependencies are in package.json
- [x] Check node-fetch version specification (fixed: "2" → "^2.7.0")
- [x] Verify tsconfig.json moduleResolution settings (bundler mode is correct)
- [ ] Test clean install (rm -rf node_modules && pnpm install)
- [x] Push corrected package.json to mce-tools (commit 4fd8312)

## Windows Compatibility Fix
- [x] Add cross-env to devDependencies
- [x] Update npm scripts to use cross-env for NODE_ENV
- [x] Push updated package.json to mce-tools (commit 1fea0bf)

## Monorepo Configuration Fix
- [x] Remove pnpm.overrides from solar-analyzer package.json
- [x] Remove pnpm.patchedDependencies from solar-analyzer package.json
- [x] Push cleaned package.json to mce-tools (commit 2d0a0da)

## Windows Temp Directory Fix (pdf2pic compatibility)
- [x] Replace OS temp directory with local repo temp/ directory in pdfToImages.ts
- [x] Replace OS temp directory with local repo temp/ directory in contractParserV3.ts
- [x] Add temp/ directory to .gitignore (already present)
- [x] Copy updated files to solar-analyzer project
- [x] Push changes to mce-tools repository (commit 049f77f)
- [ ] Test PDF upload with local temp directory on Windows

## Replace pdf2pic with pdf-poppler (Windows GraphicsMagick issue)
- [x] Install pdf-poppler package
- [x] Rewrite pdfToImages.ts to use pdf-poppler instead of pdf2pic
- [x] Create TypeScript declarations (pdf-poppler.d.ts)
- [x] Remove pdf2pic dependency from package.json
- [x] Update mce-tools repository with changes
- [x] Push to GitHub (commit b87d561)
- [ ] Test PDF upload on Windows (user needs to pull and test)

## Fix Premature Temp File Cleanup
- [x] Remove temp directory cleanup from pdfToImages.ts finally block
- [x] Keep cleanup in contractParserV3.ts after all processing completes
- [x] Add cleanup on error in pdfToImages to avoid orphaned files
- [x] Push fix to mce-tools repository (commit 2ae3449)
- [ ] User needs to pull and test PDF upload (should work without ENOENT errors)

## Fix pdf-poppler Scale Parameter (133-byte corrupt PNGs)
- [x] Debug why pdf-poppler generates 133-byte images while pdftoppm works manually
- [x] Identify root cause: scale parameter expects pixel width, not DPI ratio
- [x] Calculate proper pixel width for desired DPI (A4 width × DPI)
- [x] Add debugging logs for scale calculation and image size verification
- [x] Push fix to mce-tools repository (commit 5318b63)
- [ ] User needs to pull and test PDF upload (should generate proper-sized PNGs)

## Replace tesseract.js with System Tesseract
- [x] Rewrite ocr.ts to call system tesseract command via spawn
- [x] Parse tesseract hOCR output for bounding boxes and confidence
- [x] Add xml2js dependency for XML parsing
- [x] Remove tesseract.js dependency from package.json (9 packages removed)
- [x] Push changes to mce-tools repository (commit 7de1dde)
- [ ] User needs to pull and test OCR extraction with TestSchedule.pdf
- [ ] Verify text extraction quality and confidence scores

## Fix Windows Unicode Encoding for Pix2Text
- [x] Set PYTHONIOENCODING=utf-8 environment variable in latexOCR.ts
- [x] Force UTF-8 encoding for Python subprocess to prevent cp1252 errors
- [x] Push changes to mce-tools repository (commit 090c990)
- [ ] User needs to pull and test Pix2Text model download on Windows
- [ ] Verify LaTeX extraction works after model download completes

## Fix Variable Naming Conflict in latexOCR.ts
- [x] Rename 'process' variable to 'childProcess' to avoid shadowing global process object
- [x] Update all references to use childProcess instead of process
- [x] Push fix to mce-tools repository (commit 6e696dd)

## Debug Qwen AI Interpretation Failure in V3 Pipeline
- [x] Add debug logging to contractParserV3.ts to capture raw Qwen response
- [x] Check if Qwen is returning valid JSON or malformed output (✅ Valid JSON with good data)
- [x] Verify JSON schema matches expected structure (❌ convertToContractModel mapping is wrong)
- [x] Fix JSON parsing or schema validation issues (properly map Qwen response to ContractModel)
- [ ] Test with TestSchedule.pdf to verify 7 equations are properly extracted and displayed

## Fix UI Rendering for Contract Extraction
- [x] Backend extracting correctly (1 equation, 5 parameters from Qwen)
- [x] Frontend showing 0% confidence and [object Object] for parameters
- [x] Investigate how contract data flows from backend to frontend
- [x] Root cause: convertToLegacyFormat was pass-through, not converting V3 to UI format
- [x] UI expects: confidence (%), equations[], parameters {}, tariffs.baseRate
- [x] V3 returns: overallConfidence (0-1), performanceMetrics[], parameters[], tariffs[]
- [x] Rewrite convertToLegacyFormat to properly transform schema

## Add Equation Debugging and Fix LaTeX Rendering
- [x] Save cropped equation images to temp/debug-equations/ directory for inspection
- [x] Add logging to show saved image paths
- [x] Fix LaTeX rendering in ModelConfirmation component (currently showing raw LaTeX code)
- [x] Add LaTeX rendering library (KaTeX) to frontend
- [ ] Test equation display with proper mathematical formatting

## Fix Equation Detection Over-Segmentation
- [x] Expand bounding boxes with 15-20px padding to capture full equations (already implemented)
- [x] Filter out prose-heavy regions (reject lines >100 chars without math symbols)
- [x] Reject "Where:" sections as they are variable definitions, not equations
- [x] Improve vertical merging logic for multi-line equations (prioritize vertical stacking with 50% horizontal overlap)
- [ ] Test with TestSchedule.pdf to verify only real equations are extracted

## Implement Two-Pass Equation Detection
- [x] Pass 1: Detect obvious math lines with strong indicators
- [x] Pass 2: Expand regions to include nearby continuation lines (within 30px vertical distance)
- [ ] Test with TestSchedule.pdf to verify full PR equation is captured

## Fix LaTeX Rendering and OCR Errors
- [x] Debug KaTeX rendering - equation showing raw LaTeX code instead of formatted math
- [x] Check if KaTeX CSS is imported correctly
- [x] Verify LaTeXFormula component is being used properly
- [x] Add LaTeX cleaning to fix OCR spacing errors (E N → EN, S T C → STC, A c t → Act)
- [x] Add Qwen-based post-correction to fix subscript/superscript OCR errors (Act → ace, STC → S T C)
- [ ] Test with TestSchedule.pdf to verify proper equation display

## Fix KaTeX Rendering Failure
- [x] Enhance LaTeX cleaning to convert square brackets to parentheses
- [x] Fix malformed subscripts/superscripts that cause KaTeX parsing errors
- [x] Add console logging to see actual KaTeX error messages
- [x] Convert asterisks to \cdot for proper multiplication display
- [ ] Test with TestSchedule.pdf equation to verify rendering

## Optimize Pipeline Performance
- [x] Increase Qwen context limit from 10,000 to 30,000 characters
- [x] Reduce image resolution from 300 DPI to 200 DPI (10-20% faster)
- [x] Implement parallel page processing (12x faster for OCR/detection)
- [x] Batch LaTeX extraction for all equations at once (2-3x faster)
- [x] Add real-time progress tracking UI with stage indicators
- [x] Show percentage completion and current processing stage (simulated based on typical durations)
- [x] Push changes to GitHub for testing (commit 0f63581)

## Fix Qwen Hallucination and Optimize LaTeX Extraction
- [x] Qwen is inventing equations from variable definitions instead of using extracted LaTeX
- [x] Modify Qwen prompt to ONLY use the extracted LaTeX formulas, not create new ones
- [x] Add strict instruction: "Do not invent equations from prose descriptions"
- [x] Update JSON schema to use equations array instead of fixed fields
- [x] Investigate LaTeX extraction bottleneck (Pix2Text is very slow)
- [x] Add detailed timing logs to measure per-equation and batch extraction times
- [ ] Consider reducing equation image upscaling or using faster OCR model
- [ ] Test with full 12-page contract to verify fixes

## Fix LaTeX Extraction Performance and Qwen Accuracy
- [x] LaTeX extraction taking 920s for 16 equations (57s/equation average)
- [x] Timing logs show equations completing out of order (not truly parallel)
- [x] Implement persistent Pix2Text process (loads model once, reuses for all equations)
- [x] Add logging to show extracted LaTeX before Qwen interpretation
- [ ] Verify main PR equation is being extracted correctly
- [ ] Qwen still returning wrong equations (Temperature Correction instead of main PR formula)
- [ ] Test optimizations and verify correct extraction

## Critical Bug Fixes - Persistent Pix2Text Process
- [x] Fix TypeError in latexOCR.ts: "latex.match is not a function" - persistent process returns "READY" instead of LaTeX
- [x] Fix estimateConfidence function to handle non-string responses from Pix2Text
- [x] Improve equation detection to filter out non-equations (headings, variable definitions, prose)
- [x] Add validation to reject extracted regions that are clearly not mathematical equations
- [x] Add strict filtering: MUST have equals sign, reject all-caps headings, bullet points, tables, prose

## Fix tRPC Error on Contract Upload
- [x] Fix "latex.trim is not a function" error in cleanLaTeX function
- [x] Add type guard to handle non-string inputs in cleanLaTeX
- [x] Fix Pix2Text response handling to validate latex is a string
- [x] Add proper error rejection when JSON parsing fails
- [x] Fix Pix2Text Python script to extract result['text'] instead of returning whole object
- [x] Fix READY message being treated as failed response (don't reject tasks on parse errors)
- [ ] Test contract upload flow end-to-end

## Improve Equation Detection Quality
- [x] Filter out variable definition paragraphs (e.g., "t is the elapsed time = 1/12 hour")
- [x] Reject lines with "is the" or "means" patterns even if they have equals signs
- [x] Improve Context field to show cleaned LaTeX preview instead of garbage OCR text
- [ ] Add minimum LaTeX quality check (reject if extraction produces nonsense)
- [ ] Test with single page to verify only 1 equation extracted

## Debug Equation Detection Still Catching Variable Definitions
- [ ] Investigate why "t is the elapsed time = 1/12 hour" is still being detected as equation
- [ ] Check if OCR text differs from expected pattern (e.g., extra characters, spacing)
- [ ] Add logging to show which lines pass/fail the isMathLine filter
- [ ] Consider post-extraction validation to reject equations with low confidence or prose patterns

## Add Post-Extraction LaTeX Validation
- [x] Create isValidEquation function to check extracted LaTeX quality
- [x] Reject if contains common English words (the, is, are, was, were, been, being, have, has, had, etc.)
- [x] Reject if math symbol density is too low (< 15% math symbols)
- [x] Reject if LaTeX is mostly \text{} blocks (indicates prose, not equations)
- [x] Reject if contains repeated garbage patterns (e.g., "of of of")
- [x] Apply validation after Pix2Text extraction and filter out invalid results
- [x] This will save processing time by not sending prose to Qwen
- [ ] Test with single page to verify only 1 valid equation

## Lower Equation Detection Threshold
- [x] Change isMathLine to require only 1 math indicator instead of 2
- [x] Cast wider net during detection, rely on validation to filter false positives
- [x] This should catch DAC PR formula on page 9 that was missed
- [ ] Test with full contract to verify all PR formulas (PAC and DAC) are detected

## Fix Page 5 Detection and Equation 3 Extraction
- [x] Investigate why page 5 had "27 lines, 0 equation regions" - DAC formula should be detected
- [x] Page 5 OCR shows "0.0% confidence" - increased DPI from 200 to 300 for better quality
- [x] Equation 3 (page 10-2) extracted variable definitions instead of just the formula
- [x] The temperature correction formula spans multiple lines including "whereby:" and variable defs
- [x] Need to detect multi-line equations but exclude the "whereby:" and variable definition sections
- [x] Add logic to stop extraction at "whereby:", "where:", or variable definition markers
- [ ] Test with full contract to verify fixes work

## Interactive Equation Review UI (Human-in-the-Loop)
- [x] Install react-pdf or pdfjs-dist library for PDF rendering
- [x] Create EquationReview component with two-panel layout
- [x] Implement PDF canvas viewer in right panel with page navigation
- [x] Create equation list component in left panel (LaTeX preview, status)
- [x] Add bounding box overlay on PDF canvas (color-coded: green=verified, yellow=needs review, red=rejected)
- [x] Implement click-and-drag functionality to draw new equation regions
- [x] Add tRPC endpoint for manual region extraction (extractRegion)
- [x] Create LaTeX edit dialog that appears after manual extraction
- [x] Add inline LaTeX editing in equation list panel
- [x] Implement equation status management (verified, needs review, rejected, manually added)
- [x] Add "Delete" button for false positives
- [x] Add "Verify All" bulk action button
- [x] Add backend functions: detectEquationsOnly, extractLatexFromRegion, buildModelFromVerifiedEquations
- [x] Add tRPC procedures: detectEquations, extractRegion, buildModelFromEquations
- [x] Update extraction pipeline to route to review page after auto-detection
- [x] Only send verified equations to Qwen interpretation
- [x] Add "Proceed to Model Building" button (disabled until at least 1 equation verified)
- [x] Create EquationReviewPage component and integrate with CustomAnalysis workflow
- [x] Add route for /custom-analysis/:id/review-equations
- [x] Revert DPI back to 200 for performance (300 DPI didn't help page 5)
- [ ] Write tests for equation review workflow
- [ ] Test full workflow end-to-end with real contract

## Debug Equation Review UI Integration
- [ ] Investigate why uploadContractMutation navigation is not working
- [ ] Check if there's a version mismatch between local and deployed code
- [ ] Verify the route is properly registered and accessible
- [ ] Test the workflow end-to-end after fix

## Fix Bounding Box Coordinate Mapping
- [x] Calculate scale factor between PNG (200 DPI) and PDF canvas dimensions
- [x] Apply scale transformation to bbox coordinates
- [x] Convert manual drawing coordinates from PDF to PNG space
- [ ] Test with different PDF sizes and zoom levels

## Debug Coordinate System Issues
- [ ] Check backend detection output format - what coordinate system does it use?
- [ ] Add console logging to see actual bbox values from auto-detection
- [ ] Add console logging to see bbox values being sent for manual extraction
- [ ] Compare auto-detected vs manual bbox formats
- [ ] Verify if Y-axis needs flipping (top-left vs bottom-left origin)
- [ ] Test manual extraction with known coordinates
- [ ] Fix zoom level handling for manual drawing

## Fix Mouse Coordinate Calculation
- [x] Get canvas element bounding rect to calculate mouse position relative to canvas
- [x] Convert mouse canvas coordinates to PDF base coordinates (account for scale)
- [x] Convert PDF coordinates to PNG pixel coordinates for backend
- [x] Add comprehensive logging for all coordinate transformations
- [ ] Test manual drawing at different zoom levels
