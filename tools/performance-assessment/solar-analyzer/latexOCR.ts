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
  // Process all equations in parallel for maximum speed
  const results = await Promise.all(
    croppedImages.map(async (cropped) => {
      try {
        return await extractLaTeX(cropped.buffer, cropped.region);
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
  
  return results;
}

/**
 * Call Pix2Text Python API via subprocess
 */
async function callPix2Text(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Python script that uses Pix2Text API
    const pythonScript = `
import sys
from pix2text import LatexOCR

try:
    latex_ocr = LatexOCR()
    result = latex_ocr("${imagePath.replace(/\\/g, '\\\\')}")
    print(result, end='')
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
    
    // Set UTF-8 encoding for Windows to prevent Unicode errors
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
    const childProcess = spawn('python3', ['-c', pythonScript], { env });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    childProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Pix2Text failed with code ${code}: ${stderr}`));
        return;
      }
      
      if (!stdout || stdout.length === 0) {
        reject(new Error('Pix2Text returned empty output'));
        return;
      }
      
      // Return the LaTeX string
      resolve(stdout.trim());
    });
    
    childProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn python3: ${error.message}`));
    });
  });
}

/**
 * Estimate confidence of LaTeX extraction
 * 
 * Compares LaTeX output with original OCR text to estimate accuracy
 */
function estimateConfidence(latex: string, ocrText: string): number {
  if (!latex || latex.length === 0) return 0;
  
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
  return latex
    .trim()
    .replace(/^#\s*/, '') // Remove leading # from command output
    .replace(/\\text\s*{([^}]+)}/g, '$1') // Simplify \text{} blocks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
