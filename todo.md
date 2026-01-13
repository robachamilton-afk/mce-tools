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
