/**
 * Centralized database connection helper
 * Provides environment-aware database connections for both main and project databases
 */

import mysql from 'mysql2/promise';
import { ProjectDbConnection, ProjectDbPool } from './project-db-wrapper';

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
export function getDbConfig(databaseName?: string): string | object {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use DATABASE_URL directly - it already contains SSL configuration
    // mysql2 accepts URI strings directly
    if (databaseName) {
      // Rebuild URL with new database name but preserve query params
      const urlObj = new URL(databaseUrl);
      urlObj.pathname = `/${databaseName}`;
      return urlObj.toString();
    }
    // Use DATABASE_URL as-is (includes SSL params)
    return databaseUrl;
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
 * Create a connection to the main database (for project queries)
 * Returns a wrapped connection that automatically handles table prefixes
 * @param projectId - Numeric project ID (e.g., 150004)
 */
export async function createProjectDbConnection(projectId?: number): Promise<any> {
  const config = getDbConfig();
  const connection = await mysql.createConnection(config);
  
  // If projectId provided, wrap with auto-prefixing
  if (projectId) {
    return new ProjectDbConnection(connection, projectId);
  }
  
  return connection;
}

/**
 * Create a connection pool to the main database (for project queries)
 * Returns a wrapped pool that automatically handles table prefixes
 * @param projectId - Numeric project ID (e.g., 150004)
 */
export function createProjectDbPool(projectId?: number) {
  const config = getDbConfig();
  const pool = mysql.createPool(config);
  
  // If projectId provided, wrap with auto-prefixing
  if (projectId) {
    return new ProjectDbPool(pool, projectId);
  }
  
  return pool;
}

/**
 * Get project database configuration for provisioning
 * Used by project-db-provisioner.ts
 */
export function getProjectDbProvisionConfig(dbName: string) {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const config = parseDatabaseUrl(databaseUrl);
    const isCloudDb = config.host.includes('tidbcloud') || config.host.includes('aws') || config.host.includes('gcp');
    
    return {
      dbName,
      dbHost: config.host,
      dbPort: config.port,
      dbUser: config.user,
      dbPassword: config.password,
      // Add SSL for cloud databases (TiDB requires minVersion)
      ...(isCloudDb && { 
        ssl: { 
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true 
        } 
      }),
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
