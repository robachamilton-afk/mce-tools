# Database Setup Guide

This guide documents the database setup process for the MCE Tools monorepo, including the ACC Asset Extractor and Solar Analyzer applications.

## Overview

The monorepo contains two applications with their own MySQL databases:

- **ACC Asset Extractor** (`tools/acc-asset-extractor/webapp/`) - Port 3001
- **Solar Analyzer** (`tools/performance-assessment/solar-analyzer/`) - Port 3002

Each application has its own database setup script that applies the schema and seeds initial data.

## Prerequisites

- MySQL server running locally (credentials: `root` / `K1a2h3l4e5s6s7!`)
- Databases created manually:
  - `acc_assets`
  - `solar_analyzer`
- `.env` files configured with `DATABASE_URL` in each application directory

## Database Setup Process

### ACC Asset Extractor Setup

**Location:** `tools/acc-asset-extractor/webapp/`

**Files:**
- `setup-db.mjs` - Main setup orchestrator
- `seed.mjs` - Direct SQL seed script
- `seed_data.json` - Seed data

**Steps:**

```bash
cd tools/acc-asset-extractor/webapp
node setup-db.mjs
```

**What it does:**
1. Loads `.env` file to get `DATABASE_URL`
2. Runs `drizzle-kit push` to apply schema
3. Runs `seed.mjs` to insert seed data

### Solar Analyzer Setup

**Location:** `tools/performance-assessment/solar-analyzer/`

**Files:**
- `setup-db.mjs` - Main setup orchestrator
- `seed.mjs` - Direct SQL seed script with foreign key handling
- `database-export.json` - Seed data

**Steps:**

```bash
cd tools/performance-assessment/solar-analyzer
node setup-db.mjs
```

**What it does:**
1. Loads `.env` file to get `DATABASE_URL`
2. Runs `drizzle-kit push` to apply schema
3. Runs `seed.mjs` to insert seed data (with foreign key checks disabled)

## Key Fixes Applied

### 1. Module Resolution Issues

**Problem:** `pnpm tsx seed.ts` couldn't resolve `mysql2/promise` module when running from different directories.

**Solution:** Created `.mjs` scripts using plain Node.js ES modules instead of TypeScript. This avoids the tsx transpiler and its module resolution issues.

**Files affected:**
- `tools/acc-asset-extractor/webapp/seed.mjs` (new)
- `tools/performance-assessment/solar-analyzer/seed.mjs` (new)

### 2. Environment Variable Loading

**Problem:** Setup scripts weren't loading `.env` files, so `DATABASE_URL` was undefined.

**Solution:** Added `dotenv` import and `.env` loading to both `setup-db.mjs` files:

```javascript
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
```

**Files affected:**
- `tools/acc-asset-extractor/webapp/setup-db.mjs`
- `tools/performance-assessment/solar-analyzer/setup-db.mjs`

### 3. DateTime Format Conversion

**Problem:** Seed data had ISO datetime strings with `.000Z` format (e.g., `2026-01-13T02:54:24.000Z`) which MySQL doesn't accept.

**Solution:** Created `toMySQLDateTime()` helper function that strips the `.000Z` suffix:

```javascript
const toMySQLDateTime = (isoString) => {
  if (!isoString) return null;
  try {
    return isoString.replace(/\.\d{3}Z$/, '');
  } catch {
    return null;
  }
};
```

**Files affected:**
- `tools/acc-asset-extractor/webapp/seed.mjs`
- `tools/performance-assessment/solar-analyzer/seed.mjs`

### 4. Schema Column Mapping

**Problem:** Seed data used camelCase field names (e.g., `createdAt`, `updatedAt`) but database schema uses snake_case (e.g., `created_at`, `updated_at`).

**Solution:** Manually mapped all camelCase fields to snake_case in SQL INSERT statements. Example:

```javascript
// Seed data: { createdAt: "...", updatedAt: "..." }
// SQL: INSERT INTO users (createdAt, updatedAt) VALUES (?, ?)
```

**Files affected:**
- `tools/acc-asset-extractor/webapp/seed.mjs`
- `tools/performance-assessment/solar-analyzer/seed.mjs`

### 5. Foreign Key Constraint Violations

**Problem:** Solar Analyzer seed script failed with foreign key constraint errors when trying to insert `site_configurations` and `assessments` that reference `sites`.

**Solution:** Disabled foreign key checks during import:

```javascript
// At start of seeding
await connection.execute('SET FOREIGN_KEY_CHECKS=0');

// ... insert all data ...

// At end of seeding
await connection.execute('SET FOREIGN_KEY_CHECKS=1');
```

This allows data to be inserted in any order, then constraints are re-enabled.

**Files affected:**
- `tools/performance-assessment/solar-analyzer/seed.mjs`

### 6. Script Location Consolidation

**Problem:** Setup scripts and seed files were scattered across directories, causing path resolution issues.

**Solution:** Moved all database setup files into the application's root directory:
- `setup-db.mjs` → `webapp/setup-db.mjs` (ACC Extractor)
- `seed_database.mjs` → `webapp/seed.mjs` (ACC Extractor)
- `seed_data.json` → `webapp/seed_data.json` (ACC Extractor)

This ensures all files are in the same directory with access to `node_modules`.

**Files affected:**
- `tools/acc-asset-extractor/webapp/setup-db.mjs` (moved)
- `tools/acc-asset-extractor/webapp/seed.mjs` (moved)
- `tools/acc-asset-extractor/webapp/seed_data.json` (moved)

## Troubleshooting

### "DATABASE_URL environment variable is not set"

**Cause:** `.env` file not found or not properly loaded.

**Solution:**
1. Verify `.env` exists in the application directory
2. Check that `DATABASE_URL` is set correctly: `mysql://root:K1a2h3l4e5s6s7!@localhost:3306/database_name`
3. Ensure you're running from the correct directory

### "Unknown column" errors

**Cause:** Schema hasn't been applied yet, or column names don't match schema.

**Solution:**
1. Verify schema is applied: `drizzle-kit push` should run first
2. Check that seed script is using correct column names from `drizzle/schema.ts`

### "Incorrect datetime value"

**Cause:** DateTime format not compatible with MySQL.

**Solution:**
1. Ensure `toMySQLDateTime()` is converting ISO strings correctly
2. Check seed data format - should be ISO 8601 with `.000Z` suffix

### "Foreign key constraint fails"

**Cause:** Referencing data that doesn't exist yet.

**Solution:**
1. Ensure `FOREIGN_KEY_CHECKS=0` is set at start of seeding
2. Verify seed data has valid foreign key references
3. Check that parent records are inserted before child records

## Running All Databases

To set up both databases at once:

```bash
# ACC Extractor
cd tools/acc-asset-extractor/webapp && node setup-db.mjs

# Solar Analyzer
cd tools/performance-assessment/solar-analyzer && node setup-db.mjs
```

Or from the root, if you have concurrent scripts set up:

```bash
pnpm run setup:db
```

## Environment Variables

Each application needs a `.env` file with:

```
DATABASE_URL=mysql://root:K1a2h3l4e5s6s7!@localhost:3306/acc_assets
NODE_ENV=development
```

For Solar Analyzer:
```
DATABASE_URL=mysql://root:K1a2h3l4e5s6s7!@localhost:3306/solar_analyzer
NODE_ENV=development
```

## Schema Management

Schemas are managed with Drizzle ORM:

- **Schema files:** `drizzle/schema.ts` in each application
- **Migrations:** `drizzle/migrations/` directory
- **Apply schema:** `drizzle-kit push`
- **Generate migrations:** `drizzle-kit generate`

## Future Improvements

1. **Automated database creation:** Create databases automatically if they don't exist
2. **Connection pooling:** Use connection pools for better performance
3. **Batch inserts:** Use batch INSERT statements for faster seeding
4. **Data validation:** Add validation before inserting data
5. **Rollback capability:** Add ability to clear and reseed databases
6. **CI/CD integration:** Automate database setup in deployment pipelines

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/)
- [Node.js MySQL2 Documentation](https://github.com/sidorares/node-mysql2)
