/**
 * Centralized database connection helper
 * Provides environment-aware database connections for both main and project databases
 */

import mysql from 'mysql2/promise';

/**
 * Parse DATABASE_URL and extract connection details
 */
function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1), // Remove leading /
  };
}

/**
 * Get database connection configuration
 * Works in both development (local MySQL) and production (Manus DATABASE_URL)
 */
export function getDbConfig(databaseName?: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;

  if (isProduction && databaseUrl) {
    // Production: use DATABASE_URL from environment
    const config = parseDatabaseUrl(databaseUrl);
    return {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: databaseName || config.database,
      ssl: { rejectUnauthorized: true },
    };
  } else {
    // Development: use local MySQL
    return {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: databaseName || 'ingestion_engine_main',
    };
  }
}

/**
 * Create a connection to the main database
 */
export async function createMainDbConnection() {
  const config = getDbConfig();
  return await mysql.createConnection(config);
}

/**
 * Create a connection pool to the main database
 */
export function createMainDbPool() {
  const config = getDbConfig();
  return mysql.createPool(config);
}

/**
 * Create a connection to a project-specific database
 */
export async function createProjectDbConnection(projectDbName: string) {
  const config = getDbConfig(projectDbName);
  return await mysql.createConnection(config);
}

/**
 * Create a connection pool to a project-specific database
 */
export function createProjectDbPool(projectDbName: string) {
  const config = getDbConfig(projectDbName);
  return mysql.createPool(config);
}

/**
 * Get project database configuration for provisioning
 * Used by project-db-provisioner.ts
 */
export function getProjectDbProvisionConfig(dbName: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;

  if (isProduction && databaseUrl) {
    const config = parseDatabaseUrl(databaseUrl);
    return {
      dbName,
      dbHost: config.host,
      dbPort: config.port,
      dbUser: config.user,
      dbPassword: config.password,
    };
  } else {
    return {
      dbName,
      dbHost: 'localhost',
      dbPort: 3306,
      dbUser: 'ingestion',
      dbPassword: 'ingestion_pass_2026',
    };
  }
}
