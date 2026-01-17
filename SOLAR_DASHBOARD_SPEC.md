# Solar Dashboard Implementation Specification

## Project Overview

**Name**: Solar Dashboard  
**Port**: 3003  
**Access**: Public (no authentication)  
**Purpose**: Real-time monitoring dashboard for AEMO SCADA solar farm performance data

## Initialization

### Manus Webdev Project Setup

```
Name: solar-dashboard
Title: Solar Performance Dashboard
Port: 3003
Template: web-db-user
Path: /home/ubuntu/mce-tools/tools/performance-assessment/solar-dashboard
Description: Public solar farm performance monitoring dashboard using AEMO SCADA data, meteo integrations, and map visualizations. Displays real-time and historical performance metrics for solar farms across Australia.
```

### First Steps After Initialization

1. Review `/home/ubuntu/mce-tools/ARCHITECTURE.md` for context
2. Review `/home/ubuntu/solar-analyzer` for reference patterns
3. Apply MCE branding (colors, logo, typography)
4. Set up database schema for AEMO data
5. Implement public access (disable auth requirements)

## Database Schema

### Core Tables

```typescript
// drizzle/schema.ts

// Sites table - solar farm locations and metadata
export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  duid: text('duid').notNull().unique(), // AEMO DUID identifier
  state: text('state').notNull(), // NSW, VIC, QLD, SA, TAS
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  capacity: real('capacity').notNull(), // MW
  technology: text('technology').notNull(), // 'fixed', 'single-axis', 'dual-axis'
  commissionDate: integer('commission_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// SCADA data - generation readings from AEMO
export const scadaData = sqliteTable('scada_data', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  generation: real('generation').notNull(), // MW
  availability: real('availability'), // %
  curtailment: real('curtailment'), // MW
  source: text('source').notNull(), // 'aemo', 'manual'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Meteorological data - weather conditions
export const meteoData = sqliteTable('meteo_data', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  irradiance: real('irradiance'), // W/m²
  temperature: real('temperature'), // °C
  windSpeed: real('wind_speed'), // m/s
  humidity: real('humidity'), // %
  source: text('source').notNull(), // 'bom', 'satellite', 'manual'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Performance metrics - calculated KPIs
export const performanceMetrics = sqliteTable('performance_metrics', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  date: integer('date', { mode: 'timestamp' }).notNull(), // Daily aggregation
  energyYield: real('energy_yield'), // MWh
  capacityFactor: real('capacity_factor'), // %
  performanceRatio: real('performance_ratio'), // %
  availability: real('availability'), // %
  curtailmentLoss: real('curtailment_loss'), // MWh
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Indexes

```typescript
// Add indexes for common queries
export const scadaDataSiteTimestampIdx = index('scada_data_site_timestamp_idx')
  .on(scadaData.siteId, scadaData.timestamp);

export const meteoDataSiteTimestampIdx = index('meteo_data_site_timestamp_idx')
  .on(meteoData.siteId, meteoData.timestamp);

export const performanceMetricsSiteDateIdx = index('performance_metrics_site_date_idx')
  .on(performanceMetrics.siteId, performanceMetrics.date);
```

## Feature Requirements

### Phase 1: Core Infrastructure

1. **Public Access Setup**
   - Disable authentication requirements
   - Remove login/logout UI
   - Make all routes publicly accessible
   - Update tRPC procedures to use `publicProcedure` instead of `protectedProcedure`

2. **Database Schema**
   - Implement tables above
   - Run `pnpm db:push` to create tables
   - Add seed data for testing (3-5 sample sites)

3. **MCE Branding**
   - Apply blue color scheme (#1d4ed8)
   - Add MCE sheep logo to header
   - Use consistent typography and spacing
   - Create branded loading states

### Phase 2: Sites List View

1. **Sites Table**
   - Display all solar farms in sortable table
   - Columns: Name, State, Capacity (MW), Technology, Status
   - Search/filter by name, state, technology
   - Click row to view site details

2. **Site Cards (Alternative View)**
   - Grid layout with site cards
   - Show key metrics: current generation, capacity factor, status
   - Color-coded status indicators (green=online, yellow=degraded, red=offline)
   - Toggle between table and card views

3. **Map Overview**
   - Display all sites on map of Australia
   - Markers colored by performance status
   - Click marker to view site popup with key metrics
   - Cluster markers when zoomed out

### Phase 3: Site Detail View

1. **Site Header**
   - Site name, location, capacity
   - Current generation and status
   - Last updated timestamp

2. **Performance Charts**
   - Generation time series (last 24h, 7d, 30d, 1y)
   - Capacity factor trend
   - Performance ratio trend
   - Availability trend
   - Curtailment analysis

3. **Meteorological Data**
   - Irradiance chart overlaid with generation
   - Temperature and weather conditions
   - Wind speed
   - Correlation analysis

4. **Key Metrics Cards**
   - Today's energy yield (MWh)
   - Current capacity factor (%)
   - Performance ratio (%)
   - Availability (%)
   - Curtailment losses (MWh)

### Phase 4: AEMO Data Integration

1. **AEMO API Client**
   - Research AEMO API endpoints for SCADA data
   - Implement authentication if required
   - Create tRPC procedures for data fetching
   - Handle rate limiting and errors

2. **Data Sync**
   - Scheduled job to fetch latest SCADA data
   - Store in `scada_data` table
   - Update performance metrics calculations
   - Handle data gaps and errors

3. **Real-Time Updates**
   - WebSocket or polling for live data
   - Update UI without full page refresh
   - Show "live" indicator when data is current

### Phase 5: Analytics & Insights

1. **Fleet Overview**
   - Total installed capacity
   - Current total generation
   - Average capacity factor
   - Fleet-wide performance ratio

2. **Benchmarking**
   - Compare site performance to fleet average
   - Regional performance comparison
   - Technology type comparison (fixed vs. tracking)

3. **Anomaly Detection**
   - Highlight underperforming sites
   - Flag unusual generation patterns
   - Weather-adjusted performance alerts

## UI/UX Guidelines

### Layout Structure

**Public-Facing App** - Do NOT use DashboardLayout (that's for internal tools)

Create custom navigation:
- Top navigation bar with MCE logo and main links
- Hero section on landing page
- Clean, modern design for public audience

### Navigation Structure

```
Home (Landing Page)
├── Fleet Overview (hero + stats)
├── Sites List (table/grid view)
└── About/Documentation

Site Detail Page (/site/:duid)
├── Overview Tab
├── Performance Tab
├── Weather Tab
└── History Tab
```

### Color Scheme

- Primary: `#1d4ed8` (blue)
- Success: `#10b981` (green) - online status
- Warning: `#f59e0b` (yellow) - degraded status
- Error: `#ef4444` (red) - offline status
- Background: `#ffffff` (white)
- Secondary bg: `#f3f4f6` (light gray)

### Typography

- Headings: Bold, clear hierarchy
- Body: Clean sans-serif (system font stack)
- Monospace: For technical data (DUID, coordinates)

### Loading States

Use MCE branded loader:
- MCE sheep logo with animated blue tracing border
- Smooth 60fps animation using requestAnimationFrame
- Show during data fetching operations

## Technical Implementation

### tRPC Procedures

```typescript
// server/routers.ts

export const siteRouter = router({
  // List all sites
  list: publicProcedure
    .input(z.object({
      state: z.string().optional(),
      technology: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await db.getSites(input);
    }),

  // Get site details
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.getSiteById(input.id);
    }),

  // Get site SCADA data
  getScadaData: publicProcedure
    .input(z.object({
      siteId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      return await db.getScadaData(input);
    }),

  // Get site performance metrics
  getPerformanceMetrics: publicProcedure
    .input(z.object({
      siteId: z.string(),
      period: z.enum(['day', 'week', 'month', 'year']),
    }))
    .query(async ({ input }) => {
      return await db.getPerformanceMetrics(input);
    }),
});
```

### Database Helpers

```typescript
// server/db.ts

export async function getSites(filters?: {
  state?: string;
  technology?: string;
}) {
  let query = db.select().from(sites);
  
  if (filters?.state) {
    query = query.where(eq(sites.state, filters.state));
  }
  
  if (filters?.technology) {
    query = query.where(eq(sites.technology, filters.technology));
  }
  
  return await query;
}

export async function getScadaData(params: {
  siteId: string;
  startDate: Date;
  endDate: Date;
}) {
  return await db
    .select()
    .from(scadaData)
    .where(
      and(
        eq(scadaData.siteId, params.siteId),
        gte(scadaData.timestamp, params.startDate),
        lte(scadaData.timestamp, params.endDate)
      )
    )
    .orderBy(scadaData.timestamp);
}
```

### Frontend Components

```typescript
// client/src/pages/Home.tsx
// Landing page with fleet overview and hero section

// client/src/pages/SitesList.tsx
// Table/grid view of all sites

// client/src/pages/SiteDetail.tsx
// Detailed view of single site with charts

// client/src/components/PerformanceChart.tsx
// Reusable chart component for time series data

// client/src/components/SiteMap.tsx
// Map component showing all sites

// client/src/components/MCELoader.tsx
// Copy from solar-analyzer: branded loading animation
```

## Data Sources

### AEMO SCADA Data

**Primary Source**: AEMO Market Management System (MMS) Data Model

- **Endpoint**: https://visualisations.aemo.com.au/aemo/nemweb/
- **Data Type**: SCADA generation data (5-minute intervals)
- **Format**: CSV files
- **Update Frequency**: Every 5 minutes
- **Historical Data**: Available back to 2009

**Alternative**: AEMO NEM Web Portal API (if available)

### Meteorological Data

**Option 1**: Bureau of Meteorology (BOM)
- Weather observations API
- Solar radiation data
- Free for non-commercial use

**Option 2**: Solcast API
- Solar irradiance forecasts and historical data
- Satellite-derived data
- Paid service with free tier

**Option 3**: NASA POWER API
- Historical meteorological data
- Free for research and education
- Global coverage

## Testing Strategy

### Unit Tests

```typescript
// server/db.test.ts
describe('Database Helpers', () => {
  it('should fetch sites with filters', async () => {
    const sites = await db.getSites({ state: 'NSW' });
    expect(sites).toHaveLength(2);
  });
});

// server/routers.test.ts
describe('Site Router', () => {
  it('should return site details', async () => {
    const result = await caller.site.getById({ id: 'test-site' });
    expect(result.name).toBe('Test Solar Farm');
  });
});
```

### Integration Tests

- Test AEMO data fetching and parsing
- Test performance metric calculations
- Test chart data aggregation
- Test map marker clustering

## Performance Considerations

### Data Volume

- SCADA data: ~288 readings per site per day (5-min intervals)
- 50 sites × 365 days = ~5.2M records per year
- Need efficient querying and aggregation

### Optimization Strategies

1. **Database Indexes**: On site_id and timestamp columns
2. **Data Aggregation**: Pre-calculate daily/weekly/monthly metrics
3. **Caching**: Cache frequently accessed data (site list, current generation)
4. **Pagination**: Limit query results for large date ranges
5. **Chart Downsampling**: Reduce data points for long time periods

## Security Considerations

### Public Access

- No authentication required
- All data is public (AEMO data is publicly available)
- Rate limiting to prevent abuse
- No sensitive information exposed

### Data Privacy

- Only display aggregated/public data
- No user tracking or personal information
- Comply with AEMO data usage terms

## Deployment Checklist

- [ ] Database schema created and migrated
- [ ] Seed data loaded for testing
- [ ] Public access configured (auth disabled)
- [ ] MCE branding applied
- [ ] Sites list view implemented
- [ ] Site detail view with charts
- [ ] Map visualization working
- [ ] AEMO data integration tested
- [ ] Performance metrics calculations verified
- [ ] Loading states and error handling
- [ ] Responsive design for mobile
- [ ] Save checkpoint before publishing

## Reference Materials

- **ARCHITECTURE.md**: Overall MCE Tools structure
- **Solar Analyzer**: `/home/ubuntu/solar-analyzer` - reference implementation
- **AEMO Data**: https://aemo.com.au/energy-systems/electricity/national-electricity-market-nem/data-nem
- **MCE Branding**: Logo at `/home/ubuntu/mce-tools/mce-website/public/mce-sheep-logo.png`

## Success Criteria

1. ✅ Public users can view list of solar farms
2. ✅ Users can click into site details and see performance charts
3. ✅ Map shows all sites with current status
4. ✅ AEMO data is fetched and displayed (real or mock data)
5. ✅ MCE branding is consistent with solar-analyzer
6. ✅ Site is responsive and works on mobile
7. ✅ Loading states provide good UX
8. ✅ No authentication barriers for public access

---

**Next Steps**: Start new Manus task session and initialize solar-dashboard webdev project with the parameters above.
