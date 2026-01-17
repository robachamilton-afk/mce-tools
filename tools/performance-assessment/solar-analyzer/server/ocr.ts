/**
 * OCR Module - Extract text from images with layout metadata
 * Uses system Tesseract OCR to extract text, bounding boxes, and confidence scores
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

export type OCRLine = {
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
};

export type OCRPageResult = {
  pageNumber: number;
  pageText: string;
  lines: OCRLine[];
  confidence: number;
};

/**
 * Extract text from a single image using system Tesseract OCR
 */
export async function extractTextFromImage(
  imagePath: string,
  pageNumber: number
): Promise<OCRPageResult> {
  console.log(`[OCR] Processing page ${pageNumber}: ${imagePath}`);
  
  // Call tesseract with hOCR output for structured data
  const hocrOutput = await callTesseract(imagePath);
  
  // Parse hOCR XML to extract lines with bounding boxes
  const { lines, pageText, confidence } = await parseHOCR(hocrOutput);

  console.log(`[OCR] Page ${pageNumber} complete: ${lines.length} lines, ${confidence.toFixed(1)}% confidence`);

  return {
    pageNumber,
    pageText,
    lines,
    confidence,
  };
}

/**
 * Call system Tesseract OCR and return hOCR output
 */
async function callTesseract(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // tesseract imagepath stdout -l eng hocr
    const args = [imagePath, 'stdout', '-l', 'eng', 'hocr'];
    
    const process = spawn('tesseract', args);
    
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
        reject(new Error(`Tesseract failed with code ${code}: ${stderr}`));
        return;
      }
      
      if (!stdout || stdout.length === 0) {
        reject(new Error('Tesseract returned empty output'));
        return;
      }
      
      resolve(stdout);
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to spawn tesseract: ${error.message}`));
    });
  });
}

/**
 * Parse hOCR XML output from Tesseract
 */
async function parseHOCR(hocrXml: string): Promise<{
  lines: OCRLine[];
  pageText: string;
  confidence: number;
}> {
  const lines: OCRLine[] = [];
  let totalConfidence = 0;
  let confidenceCount = 0;
  const textParts: string[] = [];
  
  try {
    const parsed = await parseStringPromise(hocrXml);
    
    // Navigate hOCR structure: html > body > div.ocr_page > div.ocr_carea > p.ocr_par > span.ocr_line
    const body = parsed?.html?.body?.[0];
    if (!body) {
      return { lines: [], pageText: '', confidence: 0 };
    }
    
    // Find all ocr_line elements recursively
    const extractLines = (node: any): void => {
      if (!node) return;
      
      // Check if this node is an ocr_line
      if (node.$ && node.$.class && node.$.class.includes('ocr_line')) {
        const title = node.$.title || '';
        const bbox = parseBBox(title);
        const conf = parseConfidence(title);
        
        // Extract text from all word spans within this line
        const lineText = extractText(node);
        
        if (lineText.trim()) {
          lines.push({
            text: lineText.trim(),
            bbox,
            confidence: conf,
          });
          
          textParts.push(lineText.trim());
          totalConfidence += conf;
          confidenceCount++;
        }
      }
      
      // Recursively process children
      for (const key in node) {
        if (Array.isArray(node[key])) {
          node[key].forEach((child: any) => extractLines(child));
        }
      }
    };
    
    extractLines(body);
    
  } catch (error) {
    console.error('[OCR] Failed to parse hOCR:', error);
    return { lines: [], pageText: '', confidence: 0 };
  }
  
  const pageText = textParts.join('\n');
  const confidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
  
  return { lines, pageText, confidence };
}

/**
 * Parse bounding box from hOCR title attribute
 * Format: "bbox x0 y0 x1 y1; other properties"
 */
function parseBBox(title: string): { x: number; y: number; width: number; height: number } {
  const bboxMatch = title.match(/bbox (\d+) (\d+) (\d+) (\d+)/);
  if (bboxMatch) {
    const x0 = parseInt(bboxMatch[1]);
    const y0 = parseInt(bboxMatch[2]);
    const x1 = parseInt(bboxMatch[3]);
    const y1 = parseInt(bboxMatch[4]);
    return {
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

/**
 * Parse confidence from hOCR title attribute
 * Format: "x_wconf 95" (word confidence 0-100)
 */
function parseConfidence(title: string): number {
  const confMatch = title.match(/x_wconf (\d+)/);
  if (confMatch) {
    return parseInt(confMatch[1]);
  }
  return 0;
}

/**
 * Extract text content from hOCR node recursively
 */
function extractText(node: any): string {
  if (typeof node === 'string') {
    return node;
  }
  
  if (!node) return '';
  
  let text = '';
  
  // Check for direct text content
  if (node._) {
    text += node._;
  }
  
  // Recursively extract from children
  for (const key in node) {
    if (key !== '$' && key !== '_') {
      if (Array.isArray(node[key])) {
        node[key].forEach((child: any) => {
          text += extractText(child) + ' ';
        });
      } else {
        text += extractText(node[key]) + ' ';
      }
    }
  }
  
  return text;
}

/**
 * Extract text from multiple images (PDF pages)
 */
export async function extractTextFromImages(
  imagePaths: string[]
): Promise<OCRPageResult[]> {
  console.log(`[OCR] Starting OCR for ${imagePaths.length} pages`);
  
  const results: OCRPageResult[] = [];
  
  for (let i = 0; i < imagePaths.length; i++) {
    const result = await extractTextFromImage(imagePaths[i], i + 1);
    results.push(result);
  }
  
  console.log(`[OCR] Completed OCR for ${results.length} pages`);
  
  return results;
}

/**
 * Save OCR results to JSON files
 */
export async function saveOCRResults(
  results: OCRPageResult[],
  outputDir: string
): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
  
  for (const result of results) {
    const filename = `page_${String(result.pageNumber).padStart(4, '0')}.ocr.json`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
    console.log(`[OCR] Saved: ${filepath}`);
  }
}

/**
 * Load OCR results from JSON files
 */
export async function loadOCRResults(
  outputDir: string,
  pageCount: number
): Promise<OCRPageResult[]> {
  const results: OCRPageResult[] = [];
  
  for (let i = 1; i <= pageCount; i++) {
    const filename = `page_${String(i).padStart(4, '0')}.ocr.json`;
    const filepath = path.join(outputDir, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      results.push(JSON.parse(content));
    } catch (error) {
      console.warn(`[OCR] Could not load ${filepath}:`, error);
    }
  }
  
  return results;
}
