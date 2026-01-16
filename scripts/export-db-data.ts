import { getDb } from '../server/db';
import { sites, assessments, siteConfigurations, customAnalyses, equipmentDetections, users } from '../drizzle/schema';
import * as fs from 'fs';

async function exportData() {
  console.log('Exporting database data...');
  
  const db = await getDb();
  
  const allSites = await db.select().from(sites);
  const allAssessments = await db.select().from(assessments);
  const allConfigs = await db.select().from(siteConfigurations);
  const allAnalyses = await db.select().from(customAnalyses);
  const allEquipment = await db.select().from(equipmentDetections);
  const allUsers = await db.select().from(users);
  
  const data = {
    sites: allSites,
    assessments: allAssessments,
    siteConfigurations: allConfigs,
    customAnalyses: allAnalyses,
    equipmentDetections: allEquipment,
    users: allUsers
  };
  
  fs.writeFileSync('database-export.json', JSON.stringify(data, null, 2));
  console.log(`Exported ${allSites.length} sites, ${allAssessments.length} assessments, ${allConfigs.length} configs, ${allAnalyses.length} analyses, ${allEquipment.length} equipment detections`);
  process.exit(0);
}

exportData().catch(console.error);
