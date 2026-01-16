import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface ExtractionProgress {
  jobId: number;
  status: "reviewing" | "extracting" | "completed" | "failed";
  totalDocuments: number;
  reviewedDocuments: number;
  extractedDocuments: number;
  totalAssets: number;
  currentDocument?: string;
  error?: string;
}

const activeJobs = new Map<number, NodeJS.Timeout>();
const progressCallbacks = new Map<number, (progress: ExtractionProgress) => void>();

/**
 * Start document review and asset extraction process
 */
export async function startExtraction(
  jobId: number,
  rclonePath: string,
  projectName: string,
  onProgress: (progress: ExtractionProgress) => void
): Promise<void> {
  // Register progress callback
  progressCallbacks.set(jobId, onProgress);

  // Create job directory
  const jobDir = `/tmp/extraction-${jobId}`;
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  // Copy Python scripts to job directory
  const scriptsDir = "/home/ubuntu/acc-tools/poc";
  const scripts = [
    "comprehensive_document_reviewer.py",
    "comprehensive_asset_extractor.py",
    "models.py",
  ];

  for (const script of scripts) {
    const src = path.join(scriptsDir, script);
    const dest = path.join(jobDir, script);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Start document review phase
  const reviewProcess = spawn("python3", [
    path.join(jobDir, "comprehensive_document_reviewer.py"),
    rclonePath,
    jobDir,
  ]);

  let reviewOutput = "";
  reviewProcess.stdout.on("data", (data) => {
    reviewOutput += data.toString();
    // Parse progress from output
    parseReviewProgress(jobId, reviewOutput, onProgress);
  });

  reviewProcess.stderr.on("data", (data) => {
    console.error(`[Job ${jobId}] Review error:`, data.toString());
  });

  reviewProcess.on("close", (code) => {
    if (code === 0) {
      // Review completed, start extraction
      startAssetExtraction(jobId, jobDir, onProgress);
    } else {
      onProgress({
        jobId,
        status: "failed",
        totalDocuments: 0,
        reviewedDocuments: 0,
        extractedDocuments: 0,
        totalAssets: 0,
        error: `Review process exited with code ${code}`,
      });
    }
  });
}

function startAssetExtraction(
  jobId: number,
  jobDir: string,
  onProgress: (progress: ExtractionProgress) => void
) {
  const extractProcess = spawn("python3", [
    path.join(jobDir, "comprehensive_asset_extractor.py"),
    jobDir,
  ]);

  let extractOutput = "";
  extractProcess.stdout.on("data", (data) => {
    extractOutput += data.toString();
    parseExtractionProgress(jobId, extractOutput, onProgress);
  });

  extractProcess.stderr.on("data", (data) => {
    console.error(`[Job ${jobId}] Extraction error:`, data.toString());
  });

  extractProcess.on("close", (code) => {
    if (code === 0) {
      // Load extracted assets and save to database
      loadExtractedAssets(jobId, jobDir, onProgress);
    } else {
      onProgress({
        jobId,
        status: "failed",
        totalDocuments: 0,
        reviewedDocuments: 0,
        extractedDocuments: 0,
        totalAssets: 0,
        error: `Extraction process exited with code ${code}`,
      });
    }
  });
}

function parseReviewProgress(
  jobId: number,
  output: string,
  onProgress: (progress: ExtractionProgress) => void
) {
  // Parse output like: "[42] ✓ ASSET-RELEVANT: document.pdf"
  const matches = output.match(/\[(\d+)\]/g);
  if (matches) {
    const reviewed = matches.length;
    onProgress({
      jobId,
      status: "reviewing",
      totalDocuments: 0, // Will be updated when known
      reviewedDocuments: reviewed,
      extractedDocuments: 0,
      totalAssets: 0,
    });
  }
}

function parseExtractionProgress(
  jobId: number,
  output: string,
  onProgress: (progress: ExtractionProgress) => void
) {
  // Parse output like: "[42] ✓ Extracted 15 assets from: document.pdf"
  const matches = output.match(/\[(\d+)\] ✓ Extracted (\d+) assets/g);
  if (matches) {
    const extracted = matches.length;
    const totalAssets = matches.reduce((sum, match) => {
      const assetCount = parseInt(match.match(/Extracted (\d+)/)?.[1] || "0");
      return sum + assetCount;
    }, 0);

    onProgress({
      jobId,
      status: "extracting",
      totalDocuments: 0,
      reviewedDocuments: 0,
      extractedDocuments: extracted,
      totalAssets,
    });
  }
}

async function loadExtractedAssets(
  jobId: number,
  jobDir: string,
  onProgress: (progress: ExtractionProgress) => void
) {
  try {
    const assetsFile = path.join(jobDir, "output", "extracted_assets.json");
    if (fs.existsSync(assetsFile)) {
      const assetsData = JSON.parse(fs.readFileSync(assetsFile, "utf-8"));
      
      onProgress({
        jobId,
        status: "completed",
        totalDocuments: assetsData.length || 0,
        reviewedDocuments: assetsData.length || 0,
        extractedDocuments: assetsData.length || 0,
        totalAssets: assetsData.reduce((sum: number, doc: any) => sum + (doc.assets?.length || 0), 0),
      });
    }
  } catch (error) {
    console.error(`[Job ${jobId}] Failed to load assets:`, error);
    onProgress({
      jobId,
      status: "failed",
      totalDocuments: 0,
      reviewedDocuments: 0,
      extractedDocuments: 0,
      totalAssets: 0,
      error: "Failed to load extracted assets",
    });
  }
}

export function getJobProgress(jobId: number): ExtractionProgress | undefined {
  // This would be implemented to read current progress from job files
  return undefined;
}

export function cancelExtraction(jobId: number): void {
  const interval = activeJobs.get(jobId);
  if (interval) {
    clearInterval(interval);
    activeJobs.delete(jobId);
  }
  progressCallbacks.delete(jobId);
}
