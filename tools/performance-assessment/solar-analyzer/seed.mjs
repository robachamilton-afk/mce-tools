#!/usr/bin/env node
/**
 * Simple database seed script for Solar Analyzer
 * Uses direct SQL to avoid ORM type mismatches
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
    console.log('🌱 Starting Solar Analyzer database seeding...');
    
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
    const seedDataPath = path.join(__dirname, 'database-export.json');
    if (!fs.existsSync(seedDataPath)) {
      console.error(`❌ Seed data file not found: ${seedDataPath}`);
      process.exit(1);
    }

    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
    console.log(`📦 Loaded seed data`);

    // Helper to convert camelCase to snake_case
    const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    // Insert users
    console.log(`📝 Inserting ${seedData.users?.length || 0} users...`);
    if (seedData.users && seedData.users.length > 0) {
      for (const user of seedData.users) {
        try {
          const query = `
            INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE openId=openId
          `;
          await connection.execute(query, [
            user.openId,
            user.name || null,
            user.email || null,
            user.loginMethod || null,
            user.role || 'user',
            user.createdAt || new Date().toISOString(),
            user.updatedAt || new Date().toISOString(),
            user.lastSignedIn || new Date().toISOString()
          ]);
        } catch (err) {
          console.warn(`  ⚠️  User ${user.openId}: ${err.message}`);
        }
      }
    }
    console.log('✅ Users inserted');

    // Insert sites
    console.log(`📝 Inserting ${seedData.sites?.length || 0} sites...`);
    if (seedData.sites && seedData.sites.length > 0) {
      for (const site of seedData.sites) {
        try {
          const query = `
            INSERT INTO sites (duid, name, capacity_dc_mw, capacity_ac_mw, region, latitude, longitude, 
                              commissioning_date, owner, status, data_source, user_modified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE duid=duid
          `;
          await connection.execute(query, [
            site.duid || null,
            site.name,
            site.capacityDcMw || null,
            site.capacityAcMw || null,
            site.region || null,
            site.latitude || null,
            site.longitude || null,
            site.commissioningDate || null,
            site.owner || null,
            site.status || null,
            site.dataSource || 'APVI',
            site.userModified || 0,
            site.createdAt || new Date().toISOString(),
            site.updatedAt || new Date().toISOString()
          ]);
        } catch (err) {
          console.warn(`  ⚠️  Site ${site.name}: ${err.message}`);
        }
      }
    }
    console.log('✅ Sites inserted');

    // Insert site configurations
    console.log(`📝 Inserting ${seedData.siteConfigurations?.length || 0} site configurations...`);
    if (seedData.siteConfigurations && seedData.siteConfigurations.length > 0) {
      for (const config of seedData.siteConfigurations) {
        try {
          const query = `
            INSERT INTO site_configurations (site_id, tracking_type, axis_azimuth, tilt_angle, max_rotation_angle, 
                                            gcr, pitch, detection_method, confidence_score, coordinate_confidence, 
                                            tracking_confidence, gcr_confidence, pitch_confidence, equipment_confidence, 
                                            images_analyzed, detection_notes, last_validated, satellite_image_url, 
                                            satellite_image_date, inverter_make, inverter_model, inverter_count, 
                                            pcu_count, module_make, module_model, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE site_id=site_id
          `;
          await connection.execute(query, [
            config.siteId,
            config.trackingType || 'unknown',
            config.axisAzimuth || null,
            config.tiltAngle || null,
            config.maxRotationAngle || null,
            config.gcr || null,
            config.pitch || null,
            config.detectionMethod || null,
            config.confidenceScore || null,
            config.coordinateConfidence || null,
            config.trackingConfidence || null,
            config.gcrConfidence || null,
            config.pitchConfidence || null,
            config.equipmentConfidence || null,
            config.imagesAnalyzed || null,
            config.detectionNotes || null,
            config.lastValidated || null,
            config.satelliteImageUrl || null,
            config.satelliteImageDate || null,
            config.inverterMake || null,
            config.inverterModel || null,
            config.inverterCount || null,
            config.pcuCount || null,
            config.moduleMake || null,
            config.moduleModel || null,
            config.createdAt || new Date().toISOString(),
            config.updatedAt || new Date().toISOString()
          ]);
        } catch (err) {
          console.warn(`  ⚠️  Config ${config.siteId}: ${err.message}`);
        }
      }
    }
    console.log('✅ Site configurations inserted');

    // Insert assessments
    console.log(`📝 Inserting ${seedData.assessments?.length || 0} assessments...`);
    if (seedData.assessments && seedData.assessments.length > 0) {
      for (const assessment of seedData.assessments) {
        try {
          const query = `
            INSERT INTO assessments (site_id, assessment_date, report_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE site_id=site_id
          `;
          await connection.execute(query, [
            assessment.siteId,
            assessment.assessmentDate || new Date().toISOString(),
            assessment.reportUrl || null,
            assessment.createdAt || new Date().toISOString(),
            assessment.updatedAt || new Date().toISOString()
          ]);
        } catch (err) {
          console.warn(`  ⚠️  Assessment ${assessment.siteId}: ${err.message}`);
        }
      }
    }
    console.log('✅ Assessments inserted');

    // Insert custom analyses
    console.log(`📝 Inserting ${seedData.customAnalyses?.length || 0} custom analyses...`);
    if (seedData.customAnalyses && seedData.customAnalyses.length > 0) {
      for (const analysis of seedData.customAnalyses) {
        try {
          const query = `
            INSERT INTO custom_analyses (site_id, analysis_type, parameters, results, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE site_id=site_id
          `;
          await connection.execute(query, [
            analysis.siteId,
            analysis.analysisType || null,
            analysis.parameters ? JSON.stringify(analysis.parameters) : null,
            analysis.results ? JSON.stringify(analysis.results) : null,
            analysis.createdAt || new Date().toISOString(),
            analysis.updatedAt || new Date().toISOString()
          ]);
        } catch (err) {
          console.warn(`  ⚠️  Analysis ${analysis.siteId}: ${err.message}`);
        }
      }
    }
    console.log('✅ Custom analyses inserted');

    // Insert equipment detections
    console.log(`📝 Inserting ${seedData.equipmentDetections?.length || 0} equipment detections...`);
    if (seedData.equipmentDetections && seedData.equipmentDetections.length > 0) {
      for (const detection of seedData.equipmentDetections) {
        try {
          const query = `
            INSERT INTO equipment_detections (site_id, equipment_type, confidence, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE site_id=site_id
          `;
          await connection.execute(query, [
            detection.siteId,
            detection.equipmentType || null,
            detection.confidence || null,
            detection.metadata ? JSON.stringify(detection.metadata) : null,
            detection.createdAt || new Date().toISOString(),
            detection.updatedAt || new Date().toISOString()
          ]);
        } catch (err) {
          console.warn(`  ⚠️  Detection ${detection.siteId}: ${err.message}`);
        }
      }
    }
    console.log('✅ Equipment detections inserted');

    console.log('🎉 Database seeding completed successfully!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

seedDatabase();
