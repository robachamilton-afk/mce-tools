/**
 * Database Export Script
 * Exports all data to SQL format for deployment to local/GoDaddy MySQL
 */

import { getDb } from '../server/db.js';
import { sites, siteConfigurations, assessments } from '../drizzle/schema.js';
import * as fs from 'fs';
import mysql from 'mysql2/promise';

function escape(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

const EXPORT_FILE = '/home/ubuntu/solar-analyzer-database-export.sql';

async function exportDatabase() {
  console.log('Starting database export...');
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  let sql = `-- Solar Farm Performance Analyzer Database Export
-- Generated: ${new Date().toISOString()}
-- 
-- This file contains all sites, configurations, and assessments
-- Import this into your MySQL database to replicate the data
--

SET FOREIGN_KEY_CHECKS=0;

`;

  // Export sites
  console.log('Exporting sites...');
  const allSites = await db.select().from(sites);
  
  sql += `-- Sites table (${allSites.length} records)\n`;
  sql += `TRUNCATE TABLE sites;\n\n`;
  
  for (const site of allSites) {
    const values = [
      site.id,
      escape(site.name),
      site.duid ? escape(site.duid) : 'NULL',
      site.status ? escape(site.status) : 'NULL',
      site.dcCapacityMw ? escape(site.dcCapacityMw) : 'NULL',
      site.acCapacityMw ? escape(site.acCapacityMw) : 'NULL',
      site.latitude ? escape(site.latitude) : 'NULL',
      site.longitude ? escape(site.longitude) : 'NULL',
      site.state ? escape(site.state) : 'NULL',
      site.region ? escape(site.region) : 'NULL',
      site.commissionDate ? escape(site.commissionDate) : 'NULL',
      escape(site.createdAt),
      escape(site.updatedAt)
    ];
    
    sql += `INSERT INTO sites (id, name, duid, status, dcCapacityMw, acCapacityMw, latitude, longitude, state, region, commissionDate, createdAt, updatedAt) VALUES (${values.join(', ')});\n`;
  }

  // Export site configurations
  console.log('Exporting site configurations...');
  const allConfigs = await db.select().from(siteConfigurations);
  
  sql += `\n-- Site Configurations table (${allConfigs.length} records)\n`;
  sql += `TRUNCATE TABLE siteConfigurations;\n\n`;
  
  for (const config of allConfigs) {
    const values = [
      config.id,
      config.siteId,
      escape(config.trackingType),
      config.axisAzimuth ? escape(config.axisAzimuth) : 'NULL',
      config.tiltAngle ? escape(config.tiltAngle) : 'NULL',
      config.maxRotationAngle ? escape(config.maxRotationAngle) : 'NULL',
      config.gcr ? escape(config.gcr) : 'NULL',
      config.inverterMake ? escape(config.inverterMake) : 'NULL',
      config.inverterModel ? escape(config.inverterModel) : 'NULL',
      config.inverterCount ? config.inverterCount : 'NULL',
      config.moduleMake ? escape(config.moduleMake) : 'NULL',
      config.moduleModel ? escape(config.moduleModel) : 'NULL',
      config.pcuCount ? config.pcuCount : 'NULL',
      escape(config.detectionMethod),
      config.confidenceScore,
      config.lastValidated ? escape(config.lastValidated) : 'NULL',
      config.satelliteImageUrl ? escape(config.satelliteImageUrl) : 'NULL',
      config.satelliteImageDate ? escape(config.satelliteImageDate) : 'NULL',
      escape(config.createdAt),
      escape(config.updatedAt)
    ];
    
    sql += `INSERT INTO siteConfigurations (id, siteId, trackingType, axisAzimuth, tiltAngle, maxRotationAngle, gcr, inverterMake, inverterModel, inverterCount, moduleMake, moduleModel, pcuCount, detectionMethod, confidenceScore, lastValidated, satelliteImageUrl, satelliteImageDate, createdAt, updatedAt) VALUES (${values.join(', ')});\n`;
  }

  // Export assessments
  console.log('Exporting assessments...');
  const allAssessments = await db.select().from(assessments);
  
  sql += `\n-- Assessments table (${allAssessments.length} records)\n`;
  sql += `TRUNCATE TABLE assessments;\n\n`;
  
  for (const assessment of allAssessments) {
    const values = [
      assessment.id,
      assessment.siteId,
      assessment.assessmentDate ? escape(assessment.assessmentDate) : 'NULL',
      assessment.dateRangeStart ? escape(assessment.dateRangeStart) : 'NULL',
      assessment.dateRangeEnd ? escape(assessment.dateRangeEnd) : 'NULL',
      escape(assessment.technicalPr),
      escape(assessment.overallPr),
      escape(assessment.curtailmentMwh),
      assessment.curtailmentPct ? escape(assessment.curtailmentPct) : 'NULL',
      assessment.underperformanceMwh ? escape(assessment.underperformanceMwh) : 'NULL',
      assessment.lostRevenueEstimate ? escape(assessment.lostRevenueEstimate) : 'NULL',
      assessment.reportPdfUrl ? escape(assessment.reportPdfUrl) : 'NULL',
      assessment.dataCsvUrl ? escape(assessment.dataCsvUrl) : 'NULL',
      assessment.visualizationPngUrl ? escape(assessment.visualizationPngUrl) : 'NULL',
      escape(assessment.createdAt),
      escape(assessment.updatedAt)
    ];
    
    sql += `INSERT INTO assessments (id, siteId, assessmentDate, dateRangeStart, dateRangeEnd, technicalPr, overallPr, curtailmentMwh, curtailmentPct, underperformanceMwh, lostRevenueEstimate, reportPdfUrl, dataCsvUrl, visualizationPngUrl, createdAt, updatedAt) VALUES (${values.join(', ')});\n`;
  }

  sql += `\nSET FOREIGN_KEY_CHECKS=1;\n`;
  sql += `\n-- Export complete\n`;

  // Write to file
  fs.writeFileSync(EXPORT_FILE, sql);
  
  console.log('\n' + '='.repeat(80));
  console.log('Database export complete!');
  console.log(`File: ${EXPORT_FILE}`);
  console.log(`Sites: ${allSites.length}`);
  console.log(`Configurations: ${allConfigs.length}`);
  console.log(`Assessments: ${allAssessments.length}`);
  console.log('='.repeat(80));
  
  process.exit(0);
}

exportDatabase().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});
