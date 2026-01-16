import { drizzle } from 'drizzle-orm/mysql2/promise';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';

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

    const db = drizzle(connection, { schema });
    console.log('✅ Connected to database');

    // Load seed data
    const seedDataPath = path.join(__dirname, '..', 'seed_data.json');
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
        await db.insert(schema.extractionJobs).values(job).onDuplicateKeyUpdate({
          set: { id: job.id }
        });
        jobsInserted++;
      } catch (err: any) {
        console.warn(`  ⚠️  Job ${job.id}: ${err.message}`);
      }
    }
    console.log(`✅ Inserted ${jobsInserted}/${seedData.extractionJobs.length} extraction jobs`);

    // Insert assets
    console.log('📝 Inserting assets...');
    let assetsInserted = 0;
    for (const asset of seedData.assets) {
      try {
        await db.insert(schema.assets).values(asset).onDuplicateKeyUpdate({
          set: { id: asset.id }
        });
        assetsInserted++;
      } catch (err: any) {
        console.warn(`  ⚠️  Asset ${asset.id}: ${err.message}`);
      }
    }
    console.log(`✅ Inserted ${assetsInserted}/${seedData.assets.length} assets`);

    console.log('🎉 Database seeding completed successfully!');
    await connection.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

seedDatabase();
