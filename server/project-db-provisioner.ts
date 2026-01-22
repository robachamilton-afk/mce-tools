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
    connection = await mysql.createConnection({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      multipleStatements: true,
      ssl: {
        rejectUnauthorized: true,
      },
    });

    // Create the database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.dbName}\``);
    console.log(`[ProjectDB] Created database: ${config.dbName}`);

    // Switch to the new database
    await connection.changeUser({ database: config.dbName });

    // Read and execute the schema SQL
    const schemaPath = path.join(process.cwd(), "server", "db-project-schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    // Split by statement and execute
    const statements = schemaSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log(`[ProjectDB] Executed: ${statement.substring(0, 50)}...`);
      } catch (error) {
        console.error(`[ProjectDB] Error executing statement: ${statement}`, error);
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
 * Deletes a project database (used for cleanup/archival)
 */
export async function deleteProjectDatabase(config: ProjectDbConfig): Promise<boolean> {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      ssl: {
        rejectUnauthorized: true,
      },
    });

    await connection.execute(`DROP DATABASE IF EXISTS \`${config.dbName}\``);
    console.log(`[ProjectDB] Deleted database: ${config.dbName}`);
    return true;
  } catch (error) {
    console.error(`[ProjectDB] Failed to delete database: ${config.dbName}`, error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
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
 * Gets a drizzle instance for a project database
 * Parses DATABASE_URL and replaces the database name
 */
export async function getProjectDb(dbName: string) {
  const { drizzle } = await import("drizzle-orm/mysql2");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  
  // Parse the DATABASE_URL and replace the database name
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${dbName}`;
  
  return drizzle(url.toString());
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
