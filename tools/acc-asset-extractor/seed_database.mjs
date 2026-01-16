#!/usr/bin/env node
/**
 * Database Seeding Script
 * 
 * This script loads the exported data from seed_data.json into your local database.
 * 
 * Usage:
 *   node seed_database.mjs
 * 
 * Prerequisites:
 *   - DATABASE_URL environment variable must be set
 *   - Database schema must be already created (run: pnpm db:push)
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { extractionJobs, assets } from './webapp/drizzle/schema.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please set it in your .env file or export it:');
    console.error('   export DATABASE_URL="mysql://user:password@localhost:3306/acc_assets"');
    process.exit(1);
  }

  console.log('🌱 Starting database seeding...');
  
  // Load seed data
  const seedDataPath = path.join(__dirname, 'seed_data.json');
  if (!fs.existsSync(seedDataPath)) {
    console.error(`❌ Seed data file not found: ${seedDataPath}`);
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
  console.log(`📦 Loaded ${seedData.extractionJobs.length} extraction jobs and ${seedData.assets.length} assets`);

  // Connect to database
  const db = drizzle(process.env.DATABASE_URL);
  console.log('✅ Connected to database');

  try {
    // Insert extraction jobs
    console.log('📝 Inserting extraction jobs...');
    for (const job of seedData.extractionJobs) {
      await db.insert(extractionJobs).values(job).onDuplicateKeyUpdate({
        set: { id: job.id }
      });
    }
    console.log(`✅ Inserted ${seedData.extractionJobs.length} extraction jobs`);

    // Insert assets
    console.log('📝 Inserting assets...');
    for (const asset of seedData.assets) {
      await db.insert(assets).values(asset).onDuplicateKeyUpdate({
        set: { id: asset.id }
      });
    }
    console.log(`✅ Inserted ${seedData.assets.length} assets`);

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
