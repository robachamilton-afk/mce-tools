import { drizzle } from 'drizzle-orm/mysql2';
import { sites } from '../drizzle/schema.js';
import fs from 'fs';

const db = drizzle(process.env.DATABASE_URL!);

async function findMissing() {
  const dbSites = await db.select().from(sites);
  const dbDuids = new Set(dbSites.map(s => s.duid));
  
  const jsonData = JSON.parse(fs.readFileSync('/home/ubuntu/sites_master_database.json', 'utf-8'));
  
  const missing = jsonData.filter((site: any) => !dbDuids.has(site.duid));
  
  console.log(`Missing sites (${missing.length}):`);
  missing.forEach((site: any) => {
    console.log(`  - ${site.duid}: ${site.name}`);
  });
  
  process.exit(0);
}

findMissing();
