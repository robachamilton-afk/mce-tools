import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

interface ProjectDbConfig {
  dbName: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
}

/**
 * Provisions a new per-project database with the complete schema
 */
export async function provisionProjectDatabase(config: ProjectDbConfig): Promise<boolean> {
  let connection: mysql.Connection | null = null;

  try {
    // Connect to MySQL server (not to a specific database)
    // For local MySQL, don't use SSL; for remote (TiDB), use SSL
    const isLocal = config.dbHost === 'localhost' || config.dbHost === '127.0.0.1';
    connection = await mysql.createConnection({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      multipleStatements: true,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: true } }),
    });

    // Create the database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.dbName}\``);
    console.log(`[ProjectDB] Created database: ${config.dbName}`);

    // Switch to the new database
    await connection.changeUser({ database: config.dbName });

    // Read and execute the schema SQL
    const schemaPath = path.join(process.cwd(), "server", "db-project-schema.sql");
    console.log(`[ProjectDB] Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    console.log(`[ProjectDB] Schema file size: ${schemaSql.length} bytes`);

    // Remove comments and split by semicolon
    const cleanedSql = schemaSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanedSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(`[ProjectDB] Found ${statements.length} SQL statements to execute`);

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log(`[ProjectDB] ✓ Executed: ${statement.substring(0, 60)}...`);
      } catch (error) {
        console.error(`[ProjectDB] ✗ Error executing statement:`, error);
        console.error(`[ProjectDB] Failed statement: ${statement}`);
        throw error;
      }
    }

    console.log(`[ProjectDB] Successfully provisioned database: ${config.dbName}`);
    return true;
  } catch (error) {
    console.error(`[ProjectDB] Failed to provision database: ${config.dbName}`, error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Deletes project tables (used for cleanup/archival)
 * NOTE: With table-prefix architecture, we drop tables instead of databases
 * @param projectId - The numeric project ID used to identify tables (proj_{id}_*)
 */
export async function deleteProjectTables(projectId: number): Promise<boolean> {
  let connection: mysql.Connection | null = null;

  try {
    // Use the same database URL logic as getDb()
    const getDatabaseUrl = () => {
      if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
      }
      return "mysql://root@127.0.0.1:3306/ingestion_engine_main";
    };
    
    const dbUrl = getDatabaseUrl();
    const url = new URL(dbUrl);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    
    const dbName = url.pathname.substring(1); // Remove leading '/'
    
    connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: dbName,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: true } }),
    });

    // Get all tables with the project prefix
    const prefix = `proj_${projectId}_`;
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE ?",
      [dbName, `${prefix}%`]
    ) as any;

    console.log(`[ProjectDB] Found ${tables.length} tables to delete for project ${projectId}`);

    // Disable foreign key checks to avoid constraint errors
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop each table
    for (const row of tables) {
      const tableName = row.TABLE_NAME;
      await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`[ProjectDB] ✓ Dropped table: ${tableName}`);
    }
    
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`[ProjectDB] Successfully deleted all tables for project ${projectId}`);
    return true;
  } catch (error) {
    console.error(`[ProjectDB] Failed to delete tables for project ${projectId}`, error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Legacy function kept for backward compatibility
 * @deprecated Use deleteProjectTables(projectId) instead
 */
export async function deleteProjectDatabase(config: ProjectDbConfig): Promise<boolean> {
  // Extract project ID from dbName (format: proj_1_timestamp)
  const match = config.dbName.match(/^proj_(\d+)_/);
  if (!match) {
    throw new Error(`Invalid dbName format: ${config.dbName}`);
  }
  const projectId = parseInt(match[1]);
  return await deleteProjectTables(projectId);
}

/**
 * Gets a connection to a project database
 */
export async function getProjectDbConnection(config: ProjectDbConfig): Promise<mysql.Connection> {
  return await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    ssl: {
      rejectUnauthorized: true,
    },
  });
}

/**
 * Verifies that a project database exists and is accessible
 */
export async function verifyProjectDatabase(config: ProjectDbConfig): Promise<boolean> {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      ssl: {
        rejectUnauthorized: true,
      },
    });

    const [result] = await connection.execute("SELECT 1");
    return !!result;
  } catch (error) {
    console.error(`[ProjectDB] Failed to verify database: ${config.dbName}`, error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Gets a drizzle instance for the main database
 * NOTE: With table-prefix architecture, all projects share the main database
 * Tables are prefixed with proj_{id}_ instead of using separate databases
 * @param dbName - Legacy parameter, no longer used (kept for API compatibility)
 */
export async function getProjectDb(dbName: string) {
  const { drizzle } = await import("drizzle-orm/mysql2");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  
  // Return connection to main database (all project tables are prefixed)
  return drizzle(process.env.DATABASE_URL);
}

/**
 * Creates a project database by extracting credentials from DATABASE_URL
 */
export async function createProjectDatabase(dbName: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  
  // Parse DATABASE_URL to extract connection details
  const url = new URL(process.env.DATABASE_URL);
  const config: ProjectDbConfig = {
    dbName,
    dbHost: url.hostname,
    dbPort: parseInt(url.port) || 3306,
    dbUser: url.username,
    dbPassword: url.password,
  };
  
  return await provisionProjectDatabase(config);
}
