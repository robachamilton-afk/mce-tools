/**
 * LaTeX OCR Module
 * 
 * Wrapper for Pix2Text Python package to extract LaTeX from equation images
 * Pix2Text is a more mature alternative to RapidLaTeXOCR with better Windows support
 */

import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { CroppedImage } from './imageCropping';

export interface LaTeXResult {
  latex: string;
  elapsedMs: number;
  confidence: number;
  region: {
    page: number;
    bbox: { x: number; y: number; width: number; height: number };
    text: string;
  };
}

/**
 * Extract LaTeX from equation image using Pix2Text
 * 
 * @param imageBuffer - PNG image buffer containing equation
 * @param region - Original equation region metadata
 * @returns LaTeX string and processing time
 */
export async function extractLaTeX(
  imageBuffer: Buffer,
  region: { page: number; bbox: any; text: string }
): Promise<LaTeXResult> {
  const startTime = Date.now();
  
  // Write image to temporary file
  const tempPath = join(tmpdir(), `equation-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  await writeFile(tempPath, imageBuffer);
  
  try {
    // Call Pix2Text Python script
    const latex = await callPix2Text(tempPath);
    const elapsedMs = Date.now() - startTime;
    
    // Estimate confidence based on LaTeX complexity and OCR text match
    const confidence = estimateConfidence(latex, region.text);
    
    return {
      latex,
      elapsedMs,
      confidence,
      region: {
        page: region.page,
        bbox: region.bbox,
        text: region.text
      }
    };
  } finally {
    // Clean up temp file
    try {
      await unlink(tempPath);
    } catch (error) {
      console.warn(`Failed to delete temp file ${tempPath}:`, error);
    }
  }
}

/**
 * Extract LaTeX from multiple equation images (parallel batch processing)
 */
export async function extractMultipleLaTeX(
  croppedImages: CroppedImage[]
): Promise<LaTeXResult[]> {
  const batchStartTime = Date.now();
  console.log(`[LaTeX Batch] Starting extraction for ${croppedImages.length} equations...`);
  
  // Process all equations in parallel for maximum speed
  const results = await Promise.all(
    croppedImages.map(async (cropped, idx) => {
      const itemStartTime = Date.now();
      try {
        const result = await extractLaTeX(cropped.buffer, cropped.region);
        const itemElapsed = Date.now() - itemStartTime;
        console.log(`[LaTeX Batch] Equation ${idx + 1}/${croppedImages.length} completed in ${itemElapsed}ms`);
        return result;
      } catch (error) {
        console.error(
          `Failed to extract LaTeX from page ${cropped.region.page}:`,
          error
        );
        // Return failed result with empty LaTeX
        return {
          latex: '',
          elapsedMs: 0,
          confidence: 0,
          region: {
            page: cropped.region.page,
            bbox: cropped.region.bbox,
            text: cropped.region.text
          }
        };
      }
    })
  );
  
  const batchElapsed = Date.now() - batchStartTime;
  const avgTimePerEquation = batchElapsed / croppedImages.length;
  console.log(`[LaTeX Batch] All ${croppedImages.length} equations completed in ${batchElapsed}ms (avg ${avgTimePerEquation.toFixed(0)}ms/equation)`);
  
  return results;
}

// Persistent Pix2Text process pool
let pix2textProcess: any = null;
let processQueue: Array<{imagePath: string, resolve: Function, reject: Function}> = [];
let isProcessing = false;

/**
 * Initialize persistent Pix2Text process (loads model once)
 */
function initPix2TextProcess() {
  if (pix2textProcess) return;
  
  console.log('[Pix2Text] Initializing persistent process with model preloading...');
  
  const pythonScript = `
import sys
import json
from pix2text import LatexOCR

# Load model once at startup
latex_ocr = LatexOCR()
print("READY", flush=True)

# Process images from stdin
for line in sys.stdin:
    try:
        image_path = line.strip()
        if not image_path:
            continue
        result = latex_ocr(image_path)
        # Extract text from result (Pix2Text returns dict with 'text' and 'score')
        latex_text = result['text'] if isinstance(result, dict) else str(result)
        print(json.dumps({"success": True, "latex": latex_text}), flush=True)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), flush=True)
`;
  
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  pix2textProcess = spawn('python3', ['-c', pythonScript], { env });
  
  let buffer = '';
  
  pix2textProcess.stdout.on('data', (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line === 'READY') {
        console.log('[Pix2Text] Process ready, model loaded');
        processNextInQueue();
        continue;
      }
      
      try {
        const response = JSON.parse(line);
        const task = processQueue.shift();
        if (task) {
          if (response.success) {
            // Validate that latex is a string
            const latex = response.latex;
            if (typeof latex === 'string') {
              task.resolve(latex);
            } else {
              console.error('[Pix2Text] Invalid latex type:', typeof latex, latex);
              task.reject(new Error(`Invalid LaTeX response type: ${typeof latex}`));
            }
          } else {
            task.reject(new Error(response.error || 'Unknown error'));
          }
        }
        isProcessing = false;
        processNextInQueue();
      } catch (error) {
        // JSON parsing failed - this is expected for non-JSON lines
        // Only log if it's not the READY message (already handled above)
        if (line !== 'READY') {
          console.error('[Pix2Text] Failed to parse response:', line);
        }
        // Don't reject tasks for parse errors - the task might still be processing
      }
    }
  });
  
  pix2textProcess.on('close', () => {
    console.log('[Pix2Text] Process closed');
    pix2textProcess = null;
  });
}

/**
 * Process next task in queue
 */
function processNextInQueue() {
  if (isProcessing || processQueue.length === 0 || !pix2textProcess) return;
  
  isProcessing = true;
  const task = processQueue[0];
  pix2textProcess.stdin.write(task.imagePath + '\n');
}

/**
 * Call Pix2Text using persistent process
 */
async function callPix2Text(imagePath: string): Promise<string> {
  initPix2TextProcess();
  
  return new Promise((resolve, reject) => {
    processQueue.push({ imagePath, resolve, reject });
    processNextInQueue();
  });
}

/**
 * Estimate confidence of LaTeX extraction
 * 
 * Compares LaTeX output with original OCR text to estimate accuracy
 */
function estimateConfidence(latex: string, ocrText: string): number {
  // Handle non-string inputs (e.g., READY message leak)
  if (typeof latex !== 'string' || !latex || latex.length === 0) return 0;
  
  // Base confidence
  let confidence = 50;
  
  // Check for common LaTeX structures (indicates successful parsing)
  const hasStructures = /\\frac|\\sum|\\int|\\sqrt|\\pm|\\times|\\div/.test(latex);
  if (hasStructures) confidence += 20;
  
  // Check for balanced braces
  const openBraces = (latex.match(/{/g) || []).length;
  const closeBraces = (latex.match(/}/g) || []).length;
  if (openBraces === closeBraces) confidence += 10;
  
  // Check for variables and numbers
  const hasVariables = /[a-zA-Z]/.test(latex);
  const hasNumbers = /\d/.test(latex);
  if (hasVariables && hasNumbers) confidence += 10;
  
  // Compare with OCR text (rough match)
  const ocrNormalized = ocrText.toLowerCase().replace(/\s+/g, '');
  const latexNormalized = latex.toLowerCase().replace(/[\\{}]/g, '').replace(/\s+/g, '');
  
  // Check if key terms match
  const ocrTerms: string[] = ocrNormalized.match(/[a-z]+/g) || [];
  const latexTerms: string[] = latexNormalized.match(/[a-z]+/g) || [];
  const commonTerms = ocrTerms.filter(term => latexTerms.includes(term));
  
  if (commonTerms.length > 0) {
    const matchRatio = commonTerms.length / Math.max(ocrTerms.length, 1);
    confidence += Math.round(matchRatio * 10);
  }
  
  return Math.min(100, confidence);
}

/**
 * Clean LaTeX output (remove common artifacts)
 */
export function cleanLaTeX(latex: string): string {
  // Handle non-string inputs gracefully
  if (typeof latex !== 'string') {
    console.error('[cleanLaTeX] Received non-string input:', typeof latex, latex);
    return '';
  }
  
  return latex
    .trim()
    .replace(/^#\s*/, '') // Remove leading # from command output
    .replace(/\\text\s*{([^}]+)}/g, '$1') // Simplify \text{} blocks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
