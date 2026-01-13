import { drizzle } from "drizzle-orm/mysql2";
import { sites } from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import solar farm sites from APVI JSON data into database
 * Run with: tsx scripts/import-sites.ts
 */

async function importSites() {
  // Load the sites data
  const dataPath = "/home/ubuntu/sites_master_database.json";
  
  if (!fs.existsSync(dataPath)) {
    console.error("Sites data file not found at:", dataPath);
    console.log("Please ensure sites_master_database.json exists");
    process.exit(1);
  }

  const sitesData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  
  if (!Array.isArray(sitesData) || sitesData.length === 0) {
    console.error("Invalid sites data format");
    process.exit(1);
  }

  console.log(`Found ${sitesData.length} sites to import`);

  // Connect to database
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  // Import sites
  let imported = 0;
  let skipped = 0;

  for (const site of sitesData) {
    try {
      await db.insert(sites).values({
        duid: site.duid || null,
        name: site.name,
        capacityDcMw: site.capacity_dc_mw ? String(site.capacity_dc_mw) : null,
        capacityAcMw: site.capacity_ac_mw ? String(site.capacity_ac_mw) : null,
        region: site.region || null,
        latitude: site.latitude ? String(site.latitude) : null,
        longitude: site.longitude ? String(site.longitude) : null,
        commissioningDate: site.commissioning_date ? new Date(site.commissioning_date) : null,
        owner: site.owner || null,
        status: site.status || null,
        dataSource: "APVI",
        userModified: 0,
      });
      imported++;
      
      if (imported % 10 === 0) {
        console.log(`Imported ${imported} sites...`);
      }
    } catch (error: any) {
      if (error.code === "ER_DUP_ENTRY" || error.message?.includes("Duplicate entry")) {
        skipped++;
      } else {
        console.error(`Error importing site ${site.name}:`, error.message || error);
        console.error(`  DUID: ${site.duid}, DC: ${site.capacity_dc_mw}`);
      }
    }
  }

  console.log(`\nImport complete!`);
  console.log(`- Imported: ${imported} sites`);
  console.log(`- Skipped (duplicates): ${skipped} sites`);
  console.log(`- Total: ${sitesData.length} sites`);

  process.exit(0);
}

importSites().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
