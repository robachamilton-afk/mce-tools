/**
 * Database initialization and migration system
 * Automatically sets up schema on first run or when tables are missing
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";

export async function initializeDatabase() {
  try {
    console.log("[DB Init] Checking database schema...");
    const db = await getDb();

    // Check if main tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    const tableNames = Array.isArray(tables) 
      ? tables.map((row: any) => row.table_name || row.TABLE_NAME)
      : tables.rows 
      ? tables.rows.map((row: any) => row.table_name || row.TABLE_NAME)
      : [];
    const requiredTables = ['projects', 'user'];

    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      console.log(`[DB Init] Missing tables: ${missingTables.join(', ')}`);
      console.log("[DB Init] Initializing schema...");
      await createSchema();
      console.log("[DB Init] ✓ Schema initialized successfully");
    } else {
      console.log("[DB Init] ✓ Schema already exists");
    }

    return true;
  } catch (error) {
    console.error("[DB Init] Failed to initialize database:", error);
    return false;
  }
}

async function createSchema() {
  const db = await getDb();
  // Create main application tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      open_id VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_open_id (open_id),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      location VARCHAR(255),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      db_name VARCHAR(255) NOT NULL UNIQUE,
      status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
      owner_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES user(id) ON DELETE CASCADE,
      INDEX idx_owner (owner_id),
      INDEX idx_status (status),
      INDEX idx_db_name (db_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log("[DB Init] ✓ Created main tables (user, projects)");
}

/**
 * Initialize project-specific database
 * Creates all tables needed for a project's data
 */
export async function initializeProjectDatabase(dbName: string) {
  try {
    console.log(`[DB Init] Initializing project database: ${dbName}`);
    const db = await getDb();

    // Switch to project database
    await db.execute(sql.raw(`USE \`${dbName}\``));

    // Create all project-specific tables
    await createProjectTables();

    console.log(`[DB Init] ✓ Project database ${dbName} initialized`);
    
    // Switch back to main database
    await db.execute(sql.raw(`USE ingestion_engine_main`));
    
    return true;
  } catch (error) {
    console.error(`[DB Init] Failed to initialize project database ${dbName}:`, error);
    return false;
  }
}

async function createProjectTables() {
  const db = await getDb();
  // Documents table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      document_type VARCHAR(100),
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
      INDEX idx_status (status),
      INDEX idx_type (document_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Extracted facts table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS extracted_facts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      document_id INT,
      category VARCHAR(255) NOT NULL,
      key VARCHAR(255) NOT NULL,
      value TEXT NOT NULL,
      confidence VARCHAR(50),
      source_page INT,
      extraction_method VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      INDEX idx_category (category),
      INDEX idx_key (key),
      INDEX idx_verification (verification_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Processing jobs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      document_id INT NOT NULL,
      job_type VARCHAR(100) NOT NULL,
      status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
      progress INT DEFAULT 0,
      error_message TEXT,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      INDEX idx_status (status),
      INDEX idx_type (job_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Processing logs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS processingLogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_id INT NOT NULL,
      log_level ENUM('info', 'warning', 'error') NOT NULL,
      message TEXT NOT NULL,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES processing_jobs(id) ON DELETE CASCADE,
      INDEX idx_job (job_id),
      INDEX idx_level (log_level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Section narratives table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS section_narratives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      section_name VARCHAR(255) NOT NULL UNIQUE,
      narrative TEXT NOT NULL,
      confidence DECIMAL(5,2),
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_section (section_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Performance parameters table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS performance_parameters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dc_capacity_mw DECIMAL(10,2),
      ac_capacity_mw DECIMAL(10,2),
      module_efficiency DECIMAL(5,4),
      inverter_efficiency DECIMAL(5,4),
      system_losses DECIMAL(5,4),
      degradation_rate DECIMAL(5,4),
      tracking_type VARCHAR(50),
      tilt_angle DECIMAL(5,2),
      azimuth DECIMAL(5,2),
      annual_generation_gwh DECIMAL(10,2),
      capacity_factor DECIMAL(5,4),
      source VARCHAR(255),
      confidence DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Performance validations table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS performance_validations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      weather_file_id INT,
      calculated_generation_gwh DECIMAL(10,2),
      contractor_claim_gwh DECIMAL(10,2),
      variance_percent DECIMAL(5,2),
      confidence_level VARCHAR(50),
      assumptions JSON,
      validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_weather (weather_file_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Weather files table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weather_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_type VARCHAR(50) NOT NULL,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      location_name VARCHAR(255),
      data_source VARCHAR(100),
      start_date DATE,
      end_date DATE,
      ghi_annual DECIMAL(10,2),
      dni_annual DECIMAL(10,2),
      dhi_annual DECIMAL(10,2),
      temp_avg DECIMAL(5,2),
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('pending', 'validated', 'error') DEFAULT 'pending',
      INDEX idx_location (latitude, longitude),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Financial data table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS financial_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(255) NOT NULL,
      metric_name VARCHAR(255) NOT NULL,
      value DECIMAL(20,2),
      unit VARCHAR(50),
      currency VARCHAR(10),
      year INT,
      source VARCHAR(255),
      confidence DECIMAL(5,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_metric (metric_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Project metadata table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projectMetadata (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_name VARCHAR(255) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      data_type VARCHAR(50),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_key (key_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Red flags table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS redFlags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      severity ENUM('critical', 'high', 'medium', 'low') NOT NULL,
      category VARCHAR(100),
      source_document_id INT,
      status ENUM('open', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'open',
      confidence DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL,
      INDEX idx_severity (severity),
      INDEX idx_status (status),
      INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Fact verification queue table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS factVerificationQueue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fact_id INT NOT NULL,
      priority INT DEFAULT 0,
      verification_type VARCHAR(100),
      assigned_to INT,
      status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fact_id) REFERENCES extracted_facts(id) ON DELETE CASCADE,
      INDEX idx_status (status),
      INDEX idx_priority (priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Insight conflicts table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS insight_conflicts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fact_id_1 INT NOT NULL,
      fact_id_2 INT NOT NULL,
      conflict_type VARCHAR(100) NOT NULL,
      severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
      resolution_status ENUM('unresolved', 'resolved', 'ignored') DEFAULT 'unresolved',
      resolution_notes TEXT,
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (fact_id_1) REFERENCES extracted_facts(id) ON DELETE CASCADE,
      FOREIGN KEY (fact_id_2) REFERENCES extracted_facts(id) ON DELETE CASCADE,
      INDEX idx_status (resolution_status),
      INDEX idx_type (conflict_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log("[DB Init] ✓ Created all project tables");
}
