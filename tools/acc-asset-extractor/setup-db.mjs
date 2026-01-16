#!/usr/bin/env node
/**
 * Database Setup Script for ACC Asset Extractor
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

const webappDir = path.join(__dirname, 'webapp');
const rootDir = __dirname;

console.log('🚀 Starting ACC Asset Extractor database setup...\n');

try {
  // Step 1: Apply schema to database
  console.log('🔄 Step 1: Applying schema to database...');
  execSync('pnpm drizzle-kit push', { 
    cwd: webappDir,
    stdio: 'inherit'
  });
  console.log('✅ Schema applied\n');

  // Step 2: Seed data (run from webapp dir so it can find node_modules)
  console.log('🌱 Step 2: Seeding database with data...');
  execSync(`node ${path.join(rootDir, 'seed_database.mjs')}`, { 
    cwd: webappDir,
    stdio: 'inherit'
  });
  console.log('✅ Data seeded\n');

  console.log('🎉 Database setup completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
