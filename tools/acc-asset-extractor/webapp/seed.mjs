#!/usr/bin/env node
/**
 * Simple database seed script
 * Uses direct Node.js without tsx to avoid module resolution issues
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('🌱 Starting database seeding...');
    
    // Parse DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    
    // Create connection
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    });

    console.log('✅ Connected to database');

    // Load seed data
    const seedDataPath = path.join(__dirname, 'seed_data.json');
    if (!fs.existsSync(seedDataPath)) {
      console.error(`❌ Seed data file not found: ${seedDataPath}`);
      process.exit(1);
    }

    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
    console.log(`📦 Loaded ${seedData.extractionJobs.length} extraction jobs and ${seedData.assets.length} assets`);

    // Insert extraction jobs
    console.log('📝 Inserting extraction jobs...');
    let jobsInserted = 0;
    for (const job of seedData.extractionJobs) {
      try {
        const query = `
          INSERT INTO extraction_jobs (id, name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id=id
        `;
        await connection.execute(query, [
          job.id,
          job.name,
          job.status,
          job.created_at,
          job.updated_at
        ]);
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
      try {
        const query = `
          INSERT INTO assets (id, name, type, job_id, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id=id
        `;
        await connection.execute(query, [
          asset.id,
          asset.name,
          asset.type,
          asset.job_id,
          asset.data,
          asset.created_at,
          asset.updated_at
        ]);
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
    process.exit(1);
  }
}

seedDatabase();
