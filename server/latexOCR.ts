/**
 * LaTeX OCR Module
 * 
 * Wrapper for RapidLaTeXOCR Python package to extract LaTeX from equation images
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
 * Extract LaTeX from equation image using RapidLaTeXOCR
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
    // Call RapidLaTeXOCR Python script
    const latex = await callRapidLaTeXOCR(tempPath);
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
 * Extract LaTeX from multiple equation images
 */
export async function extractMultipleLaTeX(
  croppedImages: CroppedImage[]
): Promise<LaTeXResult[]> {
  const results: LaTeXResult[] = [];
  
  for (const cropped of croppedImages) {
    try {
      const result = await extractLaTeX(cropped.buffer, cropped.region);
      results.push(result);
    } catch (error) {
      console.error(
        `Failed to extract LaTeX from page ${cropped.region.page}:`,
        error
      );
      // Add failed result with empty LaTeX
      results.push({
        latex: '',
        elapsedMs: 0,
        confidence: 0,
        region: {
          page: cropped.region.page,
          bbox: cropped.region.bbox,
          text: cropped.region.text
        }
      });
    }
  }
  
  return results;
}

/**
 * Call RapidLaTeXOCR Python command
 */
async function callRapidLaTeXOCR(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('rapid_latex_ocr', [imagePath]);
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`RapidLaTeXOCR failed with code ${code}: ${stderr}`));
        return;
      }
      
      // Parse output - first line is LaTeX, second is elapsed time
      const lines = stdout.trim().split('\n');
      if (lines.length === 0) {
        reject(new Error('RapidLaTeXOCR returned empty output'));
        return;
      }
      
      // First line contains the LaTeX
      const latex = lines[0].trim();
      resolve(latex);
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to spawn RapidLaTeXOCR: ${error.message}`));
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
