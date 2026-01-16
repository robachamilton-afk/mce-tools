/**
 * Bulk scanning script for all NEM solar farms
 * Generates configurations and baseline assessments for all sites
 */

import { getDb } from '../server/db.js';
import { sites, siteConfigurations, assessments } from '../drizzle/schema.js';
import { generateSiteConfiguration, generateBaselineAssessment } from '../server/scanningEngine.js';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

const LOG_FILE = '/home/ubuntu/bulk-scan-progress.log';
const RESULTS_FILE = '/home/ubuntu/bulk-scan-results.json';

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(message);
}

interface ScanResult {
  siteId: number;
  siteName: string;
  duid: string | null;
  configurationCreated: boolean;
  assessmentCreated: boolean;
  trackingType?: string;
  error?: string;
}

async function scanSite(siteId: number): Promise<ScanResult> {
  try {
    // Get site details
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const siteData = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
    
    if (!siteData || siteData.length === 0) {
      return {
        siteId,
        siteName: 'Unknown',
        duid: null,
        configurationCreated: false,
        assessmentCreated: false,
        error: 'Site not found in database'
      };
    }

    const site = siteData[0];
    log(`Scanning site ${siteId}: ${site.name} (${site.duid || 'no DUID'})`);

    // Check if configuration already exists
    const existingConfig = await db.select()
      .from(siteConfigurations)
      .where(eq(siteConfigurations.siteId, siteId))
      .limit(1);

    let configCreated = false;
    let trackingType = '';

    if (existingConfig.length === 0) {
      // Generate configuration
      const config = generateSiteConfiguration(site);
      await db.insert(siteConfigurations).values({
        siteId: site.id,
        trackingType: config.trackingType,
        axisAzimuth: config.axisAzimuth.toString(),
        tiltAngle: config.tiltAngle.toString(),
        gcr: config.gcr.toString(),
        detectionMethod: config.detectionMethod,
        confidence: config.confidence.toString(),
      });
      configCreated = true;
      trackingType = config.trackingType;
      log(`  ✓ Configuration created: ${config.trackingType}`);
    } else {
      trackingType = existingConfig[0].trackingType;
      log(`  ⊙ Configuration already exists: ${trackingType}`);
    }

    // Check if assessment already exists
    const existingAssessment = await db.select()
      .from(assessments)
      .where(eq(assessments.siteId, siteId))
      .limit(1);

    let assessmentCreated = false;

    if (existingAssessment.length === 0) {
      // Generate baseline assessment
      const assessment = generateBaselineAssessment(site);
      await db.insert(assessments).values({
        siteId: site.id,
        dateRangeStart: assessment.dateRangeStart,
        dateRangeEnd: assessment.dateRangeEnd,
        technicalPr: assessment.technicalPr.toString(),
        overallPr: assessment.overallPr.toString(),
        curtailmentMwh: assessment.curtailmentMwh.toString(),
        lostRevenue: assessment.lostRevenue.toString(),
      });
      assessmentCreated = true;
      log(`  ✓ Assessment created: PR ${assessment.overallPr}%`);
    } else {
      log(`  ⊙ Assessment already exists`);
    }

    return {
      siteId: site.id,
      siteName: site.name,
      duid: site.duid,
      configurationCreated: configCreated,
      assessmentCreated: assessmentCreated,
      trackingType
    };

  } catch (error: any) {
    log(`  ✗ Error scanning site ${siteId}: ${error.message}`);
    return {
      siteId,
      siteName: 'Error',
      duid: null,
      configurationCreated: false,
      assessmentCreated: false,
      error: error.message
    };
  }
}

async function main() {
  log('='.repeat(80));
  log('Starting bulk scan of all NEM solar farms');
  log('='.repeat(80));

  // Get all sites
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const allSites = await db.select({ id: sites.id }).from(sites).orderBy(sites.id);
  log(`Found ${allSites.length} sites to scan`);

  const results: ScanResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allSites.length; i++) {
    const site = allSites[i];
    log(`\n[${i + 1}/${allSites.length}] Processing site ID ${site.id}`);
    
    const result = await scanSite(site.id);
    results.push(result);

    if (result.error) {
      errorCount++;
    } else {
      successCount++;
    }

    // Save intermediate results every 10 sites
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      log(`\n--- Progress checkpoint: ${i + 1}/${allSites.length} sites processed ---`);
      log(`Success: ${successCount}, Errors: ${errorCount}`);
    }
  }

  // Save final results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  log('\n' + '='.repeat(80));
  log('Bulk scan complete!');
  log(`Total sites: ${allSites.length}`);
  log(`Successfully scanned: ${successCount}`);
  log(`Errors: ${errorCount}`);
  log(`Results saved to: ${RESULTS_FILE}`);
  log('='.repeat(80));

  process.exit(0);
}

main().catch((error) => {
  log(`FATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
