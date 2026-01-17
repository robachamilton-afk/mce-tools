# MCE Tools Architecture Guide

## Overview

The MCE Tools suite is a collection of specialized web applications for energy market analysis and performance assessment. Each tool is a standalone application with its own database, running on a dedicated port within a monorepo structure.

## Repository Structure

```
mce-tools/
├── tools/
│   ├── oe-toolkit/              # Port 3000 - Operational Expenditure Toolkit
│   ├── acc-extractor/           # Port 3001 - ACC Asset Extractor
│   └── performance-assessment/
│       ├── solar-analyzer/      # Port 3002 - Private contract analysis tool
│       └── solar-dashboard/     # Port 3003 - Public AEMO monitoring (TO BE BUILT)
├── shared/                      # Shared utilities and types
├── docs/                        # Documentation
└── ARCHITECTURE.md              # This file
```

## Port Allocation

- **3000**: OE Toolkit
- **3001**: ACC Asset Extractor
- **3002**: Solar Analyzer (private contract analysis)
- **3003**: Solar Dashboard (public AEMO monitoring)

## Performance Assessment Tools

The performance assessment suite is split into **two separate applications** with different purposes:

### 1. Solar Analyzer Tool (Port 3002)

**Purpose**: Private contract analysis with equation extraction and AI-powered performance modeling

**Access Level**: Owner-only (requires authentication)

**Key Features**:
- Contract PDF parsing with equation extraction
- LaTeX equation rendering with KaTeX
- Interactive equation review with human-in-the-loop validation
- AI-powered performance model building (using Qwen)
- Variable definition extraction from contract context
- Custom data uploads (SCADA, meteorological, etc.)
- Bespoke performance analysis workflows
- Manual equation tagging with coordinate scaling

**Database**: Private assessment data (contracts, models, custom uploads)

**Tech Stack**:
- React + TypeScript frontend
- tRPC for API layer
- PostgreSQL with Drizzle ORM
- KaTeX for LaTeX rendering
- PDF.js for PDF rendering
- Pix2Text for equation extraction
- Qwen AI for model building

**Current Status**: ✅ Fully functional and deployed
- All major features implemented
- Equation detection and validation working
- LaTeX rendering operational
- Workflow navigation fixed
- MCE branding applied

### 2. Solar Dashboard Tool (Port 3003)

**Purpose**: Public monitoring dashboard for AEMO SCADA data

**Access Level**: Public (no authentication required)

**Key Features** (TO BE IMPLEMENTED):
- Sites list view with AEMO SCADA data integration
- Real-time and historical performance metrics
- Meteorological data integration
- Map visualization of solar farm locations
- Read-only monitoring interface
- Public access to AEMO performance data
- Performance charts and analytics

**Database**: Separate database for AEMO public data (read-only monitoring)

**Tech Stack**: Same as Solar Analyzer (React + TypeScript + tRPC + PostgreSQL)

**Current Status**: 🚧 Not yet initialized
- Needs to be created as new Manus webdev project
- Will use web-db-user template
- Separate from solar-analyzer codebase

## Data Architecture

### Database Separation

The two tools maintain **separate databases** to ensure:
- Data isolation (private contracts vs. public AEMO data)
- Access control (owner-only vs. public)
- Performance optimization (different query patterns)
- Security (no risk of exposing private data)

### Site Metadata Sync

Site metadata (name, location, capacity) can be synced **one-way** from Solar Analyzer → Solar Dashboard:
- Solar Analyzer creates/manages site records during contract analysis
- Dashboard imports site metadata for public display
- No reverse sync (dashboard is read-only)

## Branding Guidelines

All MCE tools follow consistent branding:

**Colors**:
- Primary: Blue (#1d4ed8)
- Accent: Light blue for highlights
- Background: Clean white/light gray

**Logo**: MCE sheep with solar panel
- Used in loaders and headers
- Animated blue tracing border for loading states

**Typography**: Professional, clean sans-serif

**UI Patterns**:
- Card-based layouts
- Stepper workflows for multi-step processes
- Color-coded status indicators (green=verified, yellow=pending, red=rejected)
- Consistent spacing and shadows

## Key Technical Patterns

### Coordinate Scaling (Solar Assessments)

Bounding boxes for equation detection require careful coordinate conversion:

```typescript
// PNG dimensions are hardcoded to match backend output (~140 DPI)
const pngWidth = 1170;
const pngHeight = 1655;

// Calculate scale factor including zoom
const coordinateScale = (pageDimensions.width * scale) / pngWidth;

// Apply to bounding box coordinates
const scaledBox = {
  left: box.x1 * coordinateScale,
  top: box.y1 * coordinateScale,
  width: (box.x2 - box.x1) * coordinateScale,
  height: (box.y2 - box.y1) * coordinateScale,
};
```

**Critical**: Backend generates PNGs at ~140 DPI (not 200 DPI), resulting in 1170×1655 dimensions. Do not calculate dynamically.

### LaTeX Rendering

Use KaTeX for mathematical equation rendering:

```typescript
import katex from 'katex';
import 'katex/dist/katex.min.css';

function renderLatex(latex: string): string {
  try {
    const cleaned = latex.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
    return katex.renderToString(cleaned, {
      throwOnError: false,
      displayMode: true,
    });
  } catch (error) {
    return '<span class="text-red-500">Invalid LaTeX</span>';
  }
}
```

### Workflow State Management

Multi-step workflows use stepper UI with completion tracking:

```typescript
const steps = [
  { id: 'details', label: 'Details', completed: !!analysis },
  { id: 'contract', label: 'Contract', completed: !!analysis?.model },
  { id: 'scada', label: 'SCADA Data', completed: false },
  // ... more steps
];
```

### Progress Feedback

Long-running operations show simulated progress messages:

```typescript
const messages = [
  'Loading contract...',
  'Converting pages to images...',
  'Running OCR analysis...',
  'Detecting equations...',
  'Extracting LaTeX...',
];

// Cycle through messages during operation
```

## Development Workflow

### Solar Analyzer (Existing)

1. Navigate to `/home/ubuntu/solar-analyzer`
2. Run `pnpm install` (if needed)
3. Run `pnpm dev` to start on port 3002
4. Access at `http://localhost:3002`

### Solar Dashboard (To Be Created)

1. Start new Manus task session
2. Initialize webdev project:
   ```
   Name: solar-dashboard
   Port: 3003
   Template: web-db-user
   Path: /home/ubuntu/mce-tools/tools/performance-assessment/solar-dashboard
   ```
3. Follow Solar Analyzer patterns for consistency
4. Implement public access (no auth required)
5. Integrate AEMO SCADA data APIs

## API Integration

### AEMO SCADA Data

The Solar Dashboard will integrate with AEMO (Australian Energy Market Operator) APIs for:
- Real-time generation data
- Historical performance metrics
- Curtailment information
- Market dispatch data

**Note**: API endpoints and authentication details to be determined during implementation.

### Meteorological Data

Both tools may integrate weather data sources:
- Bureau of Meteorology (BOM) APIs
- Satellite imagery services
- Solar irradiance data providers

## Testing Strategy

### Unit Tests

Use Vitest for backend logic:
```bash
pnpm test
```

Example test structure:
```typescript
// server/contract-parser.test.ts
describe('Contract Parser', () => {
  it('should detect equations with math indicators', () => {
    // Test equation detection logic
  });
  
  it('should validate LaTeX quality', () => {
    // Test LaTeX validation
  });
});
```

### Integration Tests

Test tRPC procedures end-to-end:
```typescript
// server/routers.test.ts
describe('Analysis Router', () => {
  it('should create analysis with site data', async () => {
    const result = await caller.analysis.create({
      siteId: 'test-site',
      // ... params
    });
    expect(result.id).toBeDefined();
  });
});
```

## Deployment

Each tool is deployed independently:
- Separate Manus webdev projects
- Independent databases
- Isolated environments
- Individual domain/subdomain assignments

## Future Enhancements

### Planned Features

1. **Variable Mapping Interface** (Solar Analyzer)
   - UI for mapping model variables to data columns
   - Validation of mapped data types
   - Preview of mapped data before processing

2. **Multi-Site Comparison** (Solar Dashboard)
   - Side-by-side performance comparison
   - Benchmarking against fleet average
   - Regional performance analysis

3. **Alerting System** (Solar Dashboard)
   - Performance threshold alerts
   - Anomaly detection notifications
   - Email/SMS integration

4. **Export Capabilities** (Both Tools)
   - PDF report generation
   - CSV data export
   - API access for third-party integration



## Common Pitfalls

### Coordinate Scaling Issues

❌ **Don't** calculate PNG dimensions dynamically based on DPI ratio
✅ **Do** hardcode to actual backend output dimensions (1170×1655)

### LaTeX Rendering Errors

❌ **Don't** use `react-katex` wrapper (import issues)
✅ **Do** use native `katex.renderToString()` with `dangerouslySetInnerHTML`

### Navigation Dead-Ends

❌ **Don't** create routes without escape paths (back buttons, nav)
✅ **Do** establish layout structure first, then build pages inside it

### Database File Storage

❌ **Don't** store file bytes in database columns (BLOB/BYTEA)
✅ **Do** use S3 storage and store only URLs/metadata in database

## References

- [Solar Analyzer Session Summary](/home/ubuntu/mce-tools/SESSION_SUMMARY_2026-01-17.md)
- [Manus Webdev Documentation](https://docs.manus.im)
- [tRPC Documentation](https://trpc.io)
- [KaTeX Documentation](https://katex.org)

## Contact

For questions about MCE Tools architecture, refer to:
- Project documentation in `/docs`
- Session summaries for implementation details
- Individual tool README files

---

**Last Updated**: 2026-01-17
**Version**: 1.0
**Status**: Solar Analyzer ✅ Complete | Solar Dashboard 🚧 Pending
