#!/usr/bin/env node
/**
 * Database Setup Script for ACC Asset Extractor
 * 
 * This script:
 * 1. Generates Drizzle migrations from schema
 * 2. Applies migrations to create tables
 * 3. Seeds the database with data
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

console.log('🚀 Starting ACC Asset Extractor database setup...\n');

try {
  // Step 1: Generate migrations
  console.log('📝 Step 1: Generating migrations from schema...');
  execSync('pnpm drizzle-kit generate', { 
    cwd: webappDir,
    stdio: 'inherit'
  });
  console.log('✅ Migrations generated\n');

  // Step 2: Apply migrations
  console.log('🔄 Step 2: Applying migrations to database...');
  execSync('pnpm drizzle-kit migrate', { 
    cwd: webappDir,
    stdio: 'inherit'
  });
  console.log('✅ Migrations applied\n');

  // Step 3: Seed data
  console.log('🌱 Step 3: Seeding database with data...');
  execSync('node seed_database.mjs', { 
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
