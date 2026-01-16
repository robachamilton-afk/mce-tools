/**
 * OCR Module - Extract text from images with layout metadata
 * Uses Tesseract OCR to extract text, bounding boxes, and confidence scores
 */

import Tesseract from 'tesseract.js';
import { promises as fs } from 'fs';
import path from 'path';

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
 * Extract text from a single image using Tesseract OCR
 */
export async function extractTextFromImage(
  imagePath: string,
  pageNumber: number
): Promise<OCRPageResult> {
  console.log(`[OCR] Processing page ${pageNumber}: ${imagePath}`);
  
  const result = await Tesseract.recognize(imagePath, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`[OCR] Page ${pageNumber}: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  // Extract lines with bounding boxes from blocks
  const lines: OCRLine[] = [];
  
  // Tesseract provides blocks, paragraphs, lines, words
  // We'll extract at the line level for better structure
  if (result.data.blocks) {
    for (const block of result.data.blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        lines.push({
          text: line.text,
          bbox: {
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0,
          },
          confidence: line.confidence,
        });
      }
    }
  }
  }

  const pageText = result.data.text;
  const confidence = result.data.confidence;

  console.log(`[OCR] Page ${pageNumber} complete: ${lines.length} lines, ${confidence.toFixed(1)}% confidence`);

  return {
    pageNumber,
    pageText,
    lines,
    confidence,
  };
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
