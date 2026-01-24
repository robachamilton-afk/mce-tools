/**
 * Project ID Helper
 * 
 * Utilities for extracting project IDs from database names
 */

/**
 * Extract project ID from database name
 * Format: proj_{id}_{timestamp}
 * Example: proj_6_1769243048193 → 6
 */
export function extractProjectId(dbName: string): number {
  const match = dbName.match(/^proj_(\d+)_/);
  if (!match) {
    throw new Error(`Invalid project database name format: ${dbName}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Check if a string is a project database name
 */
export function isProjectDbName(dbName: string): boolean {
  return /^proj_\d+_\d+$/.test(dbName);
}
