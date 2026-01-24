/**
 * Startup initialization
 * Runs database checks and migrations on server start
 */

import { initializeDatabase } from "../db-init";

export async function runStartupTasks() {
  console.log("[Startup] Running initialization tasks...");
  
  try {
    // Initialize main database schema
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.warn("[Startup] Database initialization failed - some features may not work");
    }
    
    console.log("[Startup] ✓ Initialization complete");
  } catch (error) {
    console.error("[Startup] Initialization error:", error);
    // Don't crash the server - let it start even if DB init fails
  }
}
