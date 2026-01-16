#!/usr/bin/env node
/**
 * Database Setup Script for Solar Analyzer
 * 
 * This script:
 * 1. Applies schema to database using drizzle-kit push
 * 2. Seeds the database with data
 * 
 * Usage:
 *   node setup-db.mjs
 * 
 * Prerequisites:
 *   - DATABASE_URL environment variable must be set in .env
 *   - MySQL database must exist (created manually)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Solar Analyzer database setup...\n');

try {
  // Step 1: Apply schema to database
  console.log('🔄 Step 1: Applying schema to database...');
  execSync('pnpm drizzle-kit push', { 
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✅ Schema applied\n');

  // Step 2: Seed data
  console.log('🌱 Step 2: Seeding database with data...');
  execSync('node --import tsx scripts/import-db-data.ts', { 
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✅ Data seeded\n');

  console.log('🎉 Database setup completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
