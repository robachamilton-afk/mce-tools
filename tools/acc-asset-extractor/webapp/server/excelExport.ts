import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import type { Asset } from "../drizzle/schema";

/**
 * Generate ACC-compatible Excel file from assets using Python script
 */
export async function generateACCExcel(
  assets: Asset[],
  projectName: string
): Promise<{ filePath: string; fileName: string }> {
  // Create temporary JSON file with assets
  const tempDir = "/tmp/acc-exports";
  await fs.mkdir(tempDir, { recursive: true });
  
  const timestamp = Date.now();
  const jsonPath = path.join(tempDir, `assets_${timestamp}.json`);
  const excelPath = path.join(tempDir, `${projectName}_ACC_Import_${timestamp}.xlsx`);
  
  // Write assets to JSON file
  await fs.writeFile(jsonPath, JSON.stringify(assets, null, 2));
  
  // Call Python CLI script to generate Excel
  const pythonScript = "/home/ubuntu/acc-tools/poc/acc_excel_cli.py";
  
  return new Promise((resolve, reject) => {
    // Clear Python environment variables to avoid conflicts
    const cleanEnv = { ...process.env };
    delete cleanEnv.PYTHONPATH;
    delete cleanEnv.PYTHONHOME;
    delete cleanEnv.VIRTUAL_ENV;
    
    const pythonProcess = spawn("/usr/bin/python3.11", [
      pythonScript,
      jsonPath,
      excelPath,
      projectName
    ], { env: cleanEnv });
    
    let stdout = "";
    let stderr = "";
      
    pythonProcess.stdout.on("data", (data) => {    const output = data.toString();
      stdout += output;
      console.log("[Excel Export] Python stdout:", output);
    });
    
    process.stderr.on("data", (data) => {
      const error = data.toString();
      stderr += error;
      console.error("[Excel Export] Python stderr:", error);
    });
    
    pythonProcess.on("close", async (code) => {      // Clean up JSON file
      try {
        await fs.unlink(jsonPath);
      } catch (err) {
        console.warn("Failed to clean up temp JSON:", err);
      }
      
      if (code !== 0) {
        console.error("[Excel Export] Process exited with code", code);
        console.error("[Excel Export] stderr:", stderr);
        console.error("[Excel Export] stdout:", stdout);
        reject(new Error(`Excel generation failed: ${stderr}`));
        return;
      }
      
      // Verify Excel file was created
      try {
        await fs.access(excelPath);
        resolve({
          filePath: excelPath,
          fileName: path.basename(excelPath)
        });
      } catch (err) {
        reject(new Error("Excel file was not created"));
      }
    });
    
    process.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

/**
 * Clean up old export files (older than 1 hour)
 */
export async function cleanupOldExports(): Promise<void> {
  const tempDir = "/tmp/acc-exports";
  
  try {
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > oneHour) {
        await fs.unlink(filePath);
      }
    }
  } catch (err) {
    console.warn("Failed to cleanup old exports:", err);
  }
}
