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

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webappDir = path.join(__dirname, 'webapp');

// Add webapp node_modules to module search path
const modulePath = path.join(webappDir, 'node_modules');

async function seedDatabase() {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please set it in your .env file or export it:');
    console.error('   export DATABASE_URL="mysql://user:password@localhost:3306/acc_assets"');
    process.exit(1);
  }

  try {
    // Dynamically import mysql2 from webapp node_modules
    const mysql = await import(path.join(modulePath, 'mysql2/promise/index.js'));
    
    console.log('🌱 Starting database seeding...');
    
    // Load seed data
    const seedDataPath = path.join(__dirname, 'seed_data.json');
    if (!fs.existsSync(seedDataPath)) {
      console.error(`❌ Seed data file not found: ${seedDataPath}`);
      process.exit(1);
    }

    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
    console.log(`📦 Loaded ${seedData.extractionJobs.length} extraction jobs and ${seedData.assets.length} assets`);

    // Parse DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    });

    console.log('✅ Connected to database');

    // Insert extraction jobs
    console.log('📝 Inserting extraction jobs...');
    let jobsInserted = 0;
    for (const job of seedData.extractionJobs) {
      const columns = Object.keys(job);
      const values = Object.values(job);
      const placeholders = columns.map(() => '?').join(', ');
      
      const sql = `INSERT INTO extraction_jobs (${columns.join(', ')}) VALUES (${placeholders}) 
                   ON DUPLICATE KEY UPDATE id=id`;
      
      try {
        await connection.execute(sql, values);
        jobsInserted++;
      } catch (err) {
        console.warn(`  ⚠️  Job ${job.id}: ${err.message}`);
      }
    }
    console.log(`✅ Inserted ${jobsInserted}/${seedData.extractionJobs.length} extraction jobs`);

    // Insert assets
    console.log('📝 Inserting assets...');
    let assetsInserted = 0;
    for (const asset of seedData.assets) {
      const columns = Object.keys(asset);
      const values = Object.values(asset);
      const placeholders = columns.map(() => '?').join(', ');
      
      const sql = `INSERT INTO assets (${columns.join(', ')}) VALUES (${placeholders}) 
                   ON DUPLICATE KEY UPDATE id=id`;
      
      try {
        await connection.execute(sql, values);
        assetsInserted++;
      } catch (err) {
        console.warn(`  ⚠️  Asset ${asset.id}: ${err.message}`);
      }
    }
    console.log(`✅ Inserted ${assetsInserted}/${seedData.assets.length} assets`);

    console.log('🎉 Database seeding completed successfully!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedDatabase();
