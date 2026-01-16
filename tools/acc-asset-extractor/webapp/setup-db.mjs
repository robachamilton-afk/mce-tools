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
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🚀 Starting ACC Asset Extractor database setup...\n');

try {
  // Step 1: Apply schema to database
  console.log('🔄 Step 1: Applying schema to database...');
  execSync('pnpm drizzle-kit push', { 
    stdio: 'inherit'
  });
  console.log('✅ Schema applied\n');

  // Step 2: Seed data
  console.log('🌱 Step 2: Seeding database with data...');
  // Pass environment variables to child process
  execSync('node seed.mjs', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('✅ Data seeded\n');

  console.log('🎉 Database setup completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
