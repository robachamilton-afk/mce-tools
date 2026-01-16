/**
 * Populate Clare Solar Farm with configuration and assessment data
 */

import * as db from '../server/db';
import { getClareConfiguration, getClareAssessment } from '../server/scanningEngine';

async function main() {
  console.log('Populating Clare Solar Farm data...\n');

  // Create configuration
  console.log('Creating site configuration...');
  const config = getClareConfiguration();
  await db.createSiteConfiguration(config);
  console.log('✓ Configuration created');
  console.log(`  Tracking: ${config.trackingType}`);
  console.log(`  Azimuth: ${config.axisAzimuth}°`);
  console.log(`  Tilt: ${config.tiltAngle}°`);
  console.log(`  GCR: ${config.gcr}`);
  console.log('');

  // Create assessment
  console.log('Creating performance assessment...');
  const assessment = getClareAssessment();
  await db.createAssessment(assessment);
  console.log('✓ Assessment created');
  console.log(`  Date Range: ${assessment.dateRangeStart.toISOString().split('T')[0]} to ${assessment.dateRangeEnd.toISOString().split('T')[0]}`);
  console.log(`  Technical PR: ${assessment.technicalPr}%`);
  console.log(`  Overall PR: ${assessment.overallPr}%`);
  console.log(`  Curtailment: ${assessment.curtailmentMwh} MWh (${assessment.curtailmentPct}%)`);
  console.log(`  Lost Revenue: $${assessment.lostRevenueEstimate}`);
  console.log('');

  console.log('✅ Clare Solar Farm data populated successfully!');
}

main().catch(console.error);
