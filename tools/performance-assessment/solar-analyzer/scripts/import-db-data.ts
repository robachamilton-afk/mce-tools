import { getDb } from '../server/db';
import { sites, assessments, siteConfigurations, customAnalyses, equipmentDetections, users } from '../drizzle/schema';
import * as fs from 'fs';

async function importData() {
  console.log('Importing database data...');
  
  const db = await getDb();
  const data = JSON.parse(fs.readFileSync('database-export.json', 'utf-8'));
  
  // Import in order to respect foreign key constraints
  console.log(`Importing ${data.users.length} users...`);
  if (data.users.length > 0) {
    await db.insert(users).values(data.users).onDuplicateKeyUpdate({ set: { id: users.id } });
  }
  
  console.log(`Importing ${data.sites.length} sites...`);
  if (data.sites.length > 0) {
    await db.insert(sites).values(data.sites).onDuplicateKeyUpdate({ set: { id: sites.id } });
  }
  
  console.log(`Importing ${data.siteConfigurations.length} site configurations...`);
  if (data.siteConfigurations.length > 0) {
    await db.insert(siteConfigurations).values(data.siteConfigurations).onDuplicateKeyUpdate({ set: { id: siteConfigurations.id } });
  }
  
  console.log(`Importing ${data.assessments.length} assessments...`);
  if (data.assessments.length > 0) {
    await db.insert(assessments).values(data.assessments).onDuplicateKeyUpdate({ set: { id: assessments.id } });
  }
  
  console.log(`Importing ${data.customAnalyses.length} custom analyses...`);
  if (data.customAnalyses.length > 0) {
    await db.insert(customAnalyses).values(data.customAnalyses).onDuplicateKeyUpdate({ set: { id: customAnalyses.id } });
  }
  
  console.log(`Importing ${data.equipmentDetections.length} equipment detections...`);
  if (data.equipmentDetections.length > 0) {
    await db.insert(equipmentDetections).values(data.equipmentDetections).onDuplicateKeyUpdate({ set: { id: equipmentDetections.id } });
  }
  
  console.log('Import complete!');
  process.exit(0);
}

importData().catch(console.error);
