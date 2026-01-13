import { drizzle } from 'drizzle-orm/mysql2';
import { sites } from '../drizzle/schema.js';

const db = drizzle(process.env.DATABASE_URL!);

async function checkDatabase() {
  const result = await db.select().from(sites);
  console.log(`Sites in database: ${result.length}`);
  
  if (result.length > 0) {
    console.log('\nFirst 5 sites:');
    result.slice(0, 5).forEach(site => {
      console.log(`  - ${site.duid}: ${site.name} (${site.capacityDcMw} MW DC)`);
    });
  }
  
  process.exit(0);
}

checkDatabase();
