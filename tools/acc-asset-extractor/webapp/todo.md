# ACC Asset Extractor - Project TODO

## Phase 1: Database & Backend Setup
- [x] Design database schema for assets, extraction jobs, and metadata
- [x] Create database tables with Drizzle ORM
- [x] Set up tRPC procedures for job management
- [x] Integrate Python extraction scripts with backend

## Phase 2: Configuration Page
- [x] Build rclone remote path input form
- [ ] Add PDF count validation
- [ ] Implement path validation and directory listing
- [x] Create start extraction button with job initialization

## Phase 3: Processing Dashboard
- [x] Implement real-time progress tracking with polling
- [x] Build document review progress display
- [x] Add asset extraction progress display
- [x] Create live stats panel (total assets, category breakdown)
- [ ] Show current document being processed
- [ ] Display estimated time remaining
- [ ] Build scrolling feed of recently extracted assets

## Phase 4: Data Validation Page
- [x] Create searchable/filterable asset table
- [x] Add confidence score flagging
- [ ] Implement edit asset functionality
- [ ] Add merge assets capability
- [ ] Implement delete assets
- [ ] Build category distribution charts
- [ ] Add location coverage visualization

## Phase 5: Export Page
- [ ] Generate ACC-compatible Excel export
- [x] Provide raw JSON download
- [x] Provide CSV download
- [x] Build statistics dashboard
- [x] Add download buttons for all formats

## Phase 6: Styling & Polish
- [x] Apply MCE brand colors (#1d4ed8 primary)
- [x] Ensure light/dark theme consistency
- [x] Add loading states and error handling
- [x] Implement responsive design
- [ ] Add animations and transitions

## Phase 7: Testing & Deployment
- [x] Test complete extraction workflow
- [x] Verify real-time updates work correctly
- [x] Test all export formats
- [x] Create initial checkpoint

## Phase 8: Demo Data Feature
- [x] Create demo data generator with realistic solar farm assets
- [x] Add "Load Demo Data" button to configuration page
- [x] Generate sample extraction job with completed status
- [x] Populate with realistic asset categories (inverters, cables, transformers, etc.)
- [x] Include varied confidence scores and locations


## Phase 9: Dark Mode & Branding Updates
- [ ] Change default theme to dark mode
- [ ] Add MCE logo to application
- [ ] Create header component with logo and branding
- [ ] Add header to all pages
- [ ] Ensure dark mode styling matches MCE website

## Phase 10: ACC Excel Export
- [ ] Create Excel generation helper using openpyxl
- [ ] Implement ACC-compatible format with all required columns
- [ ] Add tRPC procedure for Excel export
- [ ] Add Excel download button to Export page
- [ ] Test Excel file structure and compatibility

## Phase 11: MCE Design Standards Update (Jan 15, 2026)
- [x] Pull STYLE_GUIDE.md from mce-website GitHub repo
- [x] Review MCE design standards (colors, typography, spacing, components)
- [x] Update primary color from blue to orange (MCE brand color)
- [x] Update all page gradients to use slate instead of blue
- [x] Add backdrop blur to header navigation
- [ ] Add hover effects and transitions to cards
- [ ] Fix ACC Excel export 500 error (Python CLI works, Node.js integration needs debugging)
- [ ] Test complete export workflow (JSON, CSV, Excel)
- [ ] Ensure consistent visual design across all pages


## Phase 12: Header and Color Fixes (Jan 15, 2026)
- [x] Fix header to say "MAIN CHARACTER ENERGY" as main title
- [x] Add "ACC Asset Extractor" as subtitle below
- [x] Review and fix header background color to match MCE website
- [x] Check all color values against MCE STYLE_GUIDE.md
- [x] Ensure proper contrast and visual hierarchy


## Phase 13: Fix Excel Export Python Version Issue (Jan 15, 2026)
- [x] Change excelExport.ts to use /usr/bin/python3.11 (absolute path)
- [x] Clear Python environment variables (PYTHONPATH, PYTHONHOME, VIRTUAL_ENV)
- [x] Test Excel export with corrected Python version
- [x] Verify Excel file downloads successfully in browser (9.2K valid file)
- [x] Confirm ACC-compatible format is correct (Microsoft Excel 2007+)


## Phase 14: GitHub Push and Ollama Configuration (Jan 15, 2026)
- [x] Create comprehensive README.md with setup instructions
- [x] Add ENV_TEMPLATE.md with required environment variables
- [x] Configure Ollama integration (Qwen2.5:14b for extraction, mistral:7b for chat)
- [x] Create server/_core/ollama.ts module for local LLM
- [x] Add OLLAMA_SETUP.md with detailed configuration guide
- [ ] Copy acc-asset-extractor to mce-tools/tools/acc-asset-extractor/
- [ ] Migrate ACC docs from acc-tools to mce-tools/docs/acc/
- [ ] Copy Python CLI scripts to mce-tools/tools/acc-asset-extractor/scripts/
- [ ] Update README files and documentation
- [ ] Commit and push to mce-tools repository
