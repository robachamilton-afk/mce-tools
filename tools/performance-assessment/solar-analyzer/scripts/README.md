# Database Scripts

## Reseed Database

The `reseed-database.mjs` script cleans up duplicate entries and reseeds the database with fresh APVI solar farm data.

### What it does

1. **Analyzes current state** - Counts records and identifies duplicates
2. **Truncates all tables** - Removes all data (with 5-second warning)
3. **Reseeds with clean data** - Inserts 124 NEM solar farms
4. **Verifies integrity** - Confirms no duplicates remain

### Usage

```bash
# Navigate to the solar-analyzer directory
cd tools/performance-assessment/solar-analyzer

# Run the script
pnpm exec tsx scripts/reseed-database.mjs
```

### Prerequisites

- Node.js and pnpm installed
- `.env` file with `DATABASE_URL` configured
- Database connection (local or remote)

### Safety Features

- **5-second warning** before deletion
- **Foreign key handling** - Disables checks during truncation
- **Verification step** - Confirms clean state after reseed

### Output Example

```
🗄️  Database Cleanup and Reseed Script
=====================================

📊 Current database state:
  Sites: 140
  Configurations: 124
  Assessments: 124
  Equipment: 51
  Custom Analyses: 13

🔍 Checking for duplicates...
  ⚠️  Found 1 duplicate DUIDs:
    - null: 16 copies (IDs: 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16)

⚠️  WARNING: This will DELETE ALL DATA in the database!
   Press Ctrl+C to cancel, or wait 5 seconds to continue...

🧹 Truncating all tables...
  ✅ Truncated custom_analyses
  ✅ Truncated equipment_detections
  ✅ Truncated assessments
  ✅ Truncated site_configurations
  ✅ Truncated sites

🌱 Reseeding with APVI solar farm data...
  ✅ Inserted 124 solar farms

✅ Verifying data integrity...
  Total sites: 124
  Duplicates: 0
  ✅ No duplicates found!

🎉 Database cleanup and reseed complete!

Summary:
  - Removed all old data
  - Inserted 124 fresh solar farm records
  - All tables reset to clean state
```

### Troubleshooting

**Error: DATABASE_URL not found**
- Make sure you have a `.env` file in the `solar-analyzer` directory
- Check that `DATABASE_URL` is set correctly

**Error: Connection refused**
- Verify database is running
- Check connection string format: `mysql://user:password@host:port/database`

**Error: Unknown file extension ".ts"**
- Use `pnpm exec tsx` instead of `node` to run the script
- tsx provides TypeScript support for .mjs files importing .ts modules

### Data Source

The script seeds with 124 NEM solar farms from the APVI (Australian Photovoltaic Institute) database, including:

- **Site details**: Name, DUID, region, capacity
- **Location**: Latitude, longitude
- **Status**: Operating status

All sites are real solar farms registered in the National Electricity Market (NEM).
