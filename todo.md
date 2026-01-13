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
