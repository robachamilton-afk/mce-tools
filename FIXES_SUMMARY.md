# Database Setup Fixes Summary

## Overview

This document summarizes all the fixes applied to resolve database setup issues in the MCE Tools monorepo.

## Commits Applied

### 1. Move setup script into webapp directory
**Commit:** `cd22fad`

**Changes:**
- Moved `setup-db.mjs` from `tools/acc-asset-extractor/` to `tools/acc-asset-extractor/webapp/`
- Consolidated all database setup files in one directory

**Reason:** Ensures the setup script has access to `node_modules` and can resolve dependencies properly.

---

### 2. Use direct Node.js seed script instead of tsx
**Commit:** `d7c987d`

**Changes:**
- Created `seed.mjs` using plain Node.js (ES modules)
- Updated `setup-db.mjs` to call `node seed.mjs` instead of `pnpm tsx seed.ts`
- Simplified seed script to use direct mysql2 queries instead of Drizzle ORM

**Reason:** Avoids module resolution issues with tsx transpiler. Plain Node.js is more reliable for database operations.

---

### 3. Load .env file in setup script
**Commit:** `af3ac5d`

**Changes:**
- Added `dotenv` import to `setup-db.mjs`
- Load `.env` file before running setup
- Pass environment variables to child processes

**Reason:** Ensures `DATABASE_URL` is available for both the setup script and seed script.

---

### 4. Load .env file in Solar Analyzer setup script
**Commit:** `6518d16`

**Changes:**
- Added `dotenv` import to Solar Analyzer's `setup-db.mjs`
- Load `.env` file before running setup
- Pass environment variables to child processes

**Reason:** Consistent with ACC Extractor setup. Ensures database connection is available.

---

### 5. Use direct Node.js seed script for Solar Analyzer
**Commit:** `8a70545`

**Changes:**
- Created `seed.mjs` for Solar Analyzer using direct SQL
- Updated `setup-db.mjs` to call `node seed.mjs`
- Handles camelCase to snake_case field mapping
- Properly converts data types for database insertion

**Reason:** Avoids ORM type mismatches and module resolution issues.

---

### 6. Correct seed script to match actual schema
**Commit:** `653ffb1`

**Changes:**
- Fixed column names to match Drizzle schema (e.g., `type` instead of `equipment_type`)
- Fixed datetime conversion to remove `.000Z` format
- Proper field mapping for all tables
- Handle NULL values correctly

**Reason:** Seed data field names didn't match actual database schema columns.

---

### 7. Disable foreign key checks during database seeding
**Commit:** `09d981c`

**Changes:**
- Added `SET FOREIGN_KEY_CHECKS=0` at start of Solar Analyzer seeding
- Added `SET FOREIGN_KEY_CHECKS=1` at end of seeding
- Allows data insertion in any order without constraint violations

**Reason:** Foreign key constraints were failing because related data wasn't inserted in the correct order.

---

## Problem-Solution Matrix

| Problem | Root Cause | Solution | Commit |
|---------|-----------|----------|--------|
| Module not found: mysql2 | tsx couldn't resolve modules from different directories | Use plain Node.js `.mjs` instead of tsx | d7c987d |
| DATABASE_URL not set | .env file not loaded | Add dotenv import and load .env | af3ac5d, 6518d16 |
| Incorrect datetime value | ISO format `.000Z` not compatible with MySQL | Strip `.000Z` in conversion function | 653ffb1 |
| Unknown column errors | camelCase fields vs snake_case columns | Manual field mapping in SQL | 653ffb1 |
| Foreign key constraint fails | Related data inserted out of order | Disable FK checks during import | 09d981c |
| Path resolution issues | Files scattered across directories | Consolidate in webapp directory | cd22fad |

## Testing Verification

✅ **ACC Asset Extractor Database:**
- Schema applied successfully
- 882 assets inserted
- All seed data loaded

✅ **Solar Analyzer Database:**
- Schema applied successfully
- 1 user inserted
- 124 sites inserted
- 124 site configurations inserted
- 124 assessments inserted
- 12 custom analyses inserted
- 51 equipment detections inserted

## Files Modified

### ACC Asset Extractor
- `tools/acc-asset-extractor/webapp/setup-db.mjs` (created/updated)
- `tools/acc-asset-extractor/webapp/seed.mjs` (created)
- `tools/acc-asset-extractor/webapp/seed_data.json` (moved)

### Solar Analyzer
- `tools/performance-assessment/solar-analyzer/setup-db.mjs` (updated)
- `tools/performance-assessment/solar-analyzer/seed.mjs` (created)

### Documentation
- `DATABASE_SETUP_GUIDE.md` (created)
- `FIXES_SUMMARY.md` (this file)

## How to Use

### Initial Setup

```bash
# ACC Extractor
cd tools/acc-asset-extractor/webapp
node setup-db.mjs

# Solar Analyzer
cd tools/performance-assessment/solar-analyzer
node setup-db.mjs
```

### Verify Setup

Check that both databases have data:

```bash
mysql -u root -p
USE acc_assets;
SELECT COUNT(*) FROM assets;

USE solar_analyzer;
SELECT COUNT(*) FROM sites;
SELECT COUNT(*) FROM assessments;
```

## Key Learnings

1. **Module Resolution:** Plain Node.js is more reliable than transpilers for database scripts
2. **Environment Variables:** Always load .env early in the process
3. **DateTime Handling:** MySQL has specific datetime format requirements
4. **Schema Mapping:** Ensure seed data field names match database schema exactly
5. **Foreign Keys:** Disable during bulk imports to avoid constraint violations
6. **File Organization:** Keep related files (setup, seed, data) in the same directory

## Future Recommendations

1. Add validation layer to check data before insertion
2. Implement dry-run mode to preview what will be inserted
3. Add rollback capability to clear and reseed databases
4. Create automated tests for database setup
5. Document seed data structure and sources
6. Consider using database migrations instead of direct schema push
7. Implement connection pooling for better performance
