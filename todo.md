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
- [ ] Build column mapping interface with LLM-suggested mappings for data files
- [ ] Implement model execution engine with equation evaluation and variable substitution
- [ ] Generate assessment results with performance metrics, revenue calculations, compliance checks
- [ ] Create results page with charts, tables, and downloadable reports

## Bug Fixes (Jan 15, 2026)
- [x] Fix 404 error for New Assessment button - route not configured
- [x] Fix authentication error when creating new custom analysis
- [x] Verify all "New Assessment" buttons route to /new-assessment
- [x] Create Assessments list page (currently 404)
- [x] Fix "Invalid Time value" error in contract extraction date parsing
