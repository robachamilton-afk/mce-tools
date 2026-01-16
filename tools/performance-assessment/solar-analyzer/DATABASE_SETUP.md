# Database Setup Guide

This guide explains how to set up the local database for the Solar Analyzer application.

## Prerequisites

- MySQL 8.0+ or compatible database (TiDB, MariaDB)
- Node.js 22+
- pnpm package manager

## Quick Start

### 1. Create Database

```bash
mysql -u root -p
CREATE DATABASE solar_analyzer;
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL=mysql://username:password@localhost:3306/solar_analyzer
```

### 3. Run Migrations

```bash
pnpm db:push
```

This will create all tables based on the schema in `drizzle/schema.ts`.

### 4. Import Sample Data

```bash
node --import tsx scripts/import-db-data.ts
```

This will import:
- 124 solar farm sites
- 124 performance assessments
- 124 site configurations
- 12 custom analyses
- 51 equipment detections

## Database Schema

The database includes the following tables:

- **sites** - Solar farm locations and basic information
- **site_configurations** - Detected tracking configuration (axis, tilt, GCR)
- **assessments** - Performance assessment results (PR, curtailment, revenue)
- **custom_analyses** - Contract-based analyses with uploaded files
- **equipment_detections** - Detected PCUs and substations from satellite imagery
- **users** - User accounts (OAuth-based)

## Manual Data Export

To export current database data:

```bash
node --import tsx scripts/export-db-data.ts
```

This creates `database-export.json` with all current data.

## Schema Changes

When modifying the schema in `drizzle/schema.ts`:

1. Generate migration: `pnpm drizzle-kit generate`
2. Apply changes: `pnpm db:push`

## Troubleshooting

### Connection Issues

- Verify DATABASE_URL is correct
- Check MySQL is running: `sudo systemctl status mysql`
- Ensure database exists: `SHOW DATABASES;`

### Import Errors

- Ensure migrations are run first: `pnpm db:push`
- Check for foreign key constraint violations
- Verify `database-export.json` exists in project root

## Production Database

For production deployment, the application uses TiDB Serverless with automatic connection pooling and scaling.
