/**
 * Document Assembly Module - Stages A-C of OCR Pipeline
 * Stage A: Render PDF to high-DPI images
 * Stage B: OCR extraction with layout metadata
 * Stage C: Assemble document packet for text model
 */

import { fromPath } from 'pdf2pic';
import { promises as fs } from 'fs';
import path from 'path';
import { extractTextFromImages, saveOCRResults, loadOCRResults, type OCRPageResult } from './ocr';

export type DocumentPacket = {
  metadata: {
    filename: string;
    pageCount: number;
    processedAt: string;
  };
  pages: {
    pageNumber: number;
    imagePath: string;
    ocrText: string;
    ocrLines: Array<{
      text: string;
      bbox: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
    confidence: number;
  }[];
};

/**
 * Stage A: Render PDF to PNG images at specified DPI
 */
export async function renderPdfToImages(
  pdfPath: string,
  outputDir: string,
  dpi: number = 350
): Promise<string[]> {
  console.log(`[Stage A] Rendering PDF to images at ${dpi} DPI`);
  
  await fs.mkdir(outputDir, { recursive: true });
  
  const converter = fromPath(pdfPath, {
    density: dpi,
    saveFilename: 'page',
    savePath: outputDir,
    format: 'png',
    width: Math.floor(2550 * (dpi / 300)), // Scale based on DPI
    height: Math.floor(3300 * (dpi / 300)),
  });

  // Get page count first
  const firstPage = await converter(1, { responseType: 'image' });
  if (!firstPage) {
    throw new Error('Failed to render first page');
  }

  // Render all pages
  const imagePaths: string[] = [];
  let pageNum = 1;
  
  while (true) {
    try {
      const result = await converter(pageNum, { responseType: 'image' });
      if (!result || !result.path) break;
      
      imagePaths.push(result.path);
      console.log(`[Stage A] Rendered page ${pageNum}: ${result.path}`);
      pageNum++;
    } catch (error) {
      // No more pages
      break;
    }
  }

  console.log(`[Stage A] Rendered ${imagePaths.length} pages`);
  return imagePaths;
}

/**
 * Stage B: OCR extraction with layout metadata
 */
export async function performOCR(
  imagePaths: string[],
  outputDir: string,
  useCache: boolean = true
): Promise<OCRPageResult[]> {
  console.log(`[Stage B] Starting OCR for ${imagePaths.length} pages`);
  
  const ocrDir = path.join(outputDir, 'ocr');
  await fs.mkdir(ocrDir, { recursive: true });

  // Try to load cached OCR results
  if (useCache) {
    const cached = await loadOCRResults(ocrDir, imagePaths.length);
    if (cached.length === imagePaths.length) {
      console.log(`[Stage B] Using cached OCR results`);
      return cached;
    }
  }

  // Perform OCR
  const results = await extractTextFromImages(imagePaths);
  
  // Save OCR results
  await saveOCRResults(results, ocrDir);
  
  console.log(`[Stage B] OCR complete`);
  return results;
}

/**
 * Stage C: Assemble document packet
 */
export async function assembleDocumentPacket(
  filename: string,
  imagePaths: string[],
  ocrResults: OCRPageResult[]
): Promise<DocumentPacket> {
  console.log(`[Stage C] Assembling document packet`);
  
  const packet: DocumentPacket = {
    metadata: {
      filename,
      pageCount: imagePaths.length,
      processedAt: new Date().toISOString(),
    },
    pages: ocrResults.map((ocr, index) => ({
      pageNumber: ocr.pageNumber,
      imagePath: imagePaths[index],
      ocrText: ocr.pageText,
      ocrLines: ocr.lines,
      confidence: ocr.confidence,
    })),
  };

  console.log(`[Stage C] Document packet assembled: ${packet.pages.length} pages`);
  return packet;
}

/**
 * Full pipeline: Stages A-C
 */
export async function processContractPdf(
  pdfPath: string,
  outputDir: string,
  options: {
    dpi?: number;
    useCache?: boolean;
  } = {}
): Promise<DocumentPacket> {
  const { dpi = 350, useCache = true } = options;
  
  console.log(`[Contract Pipeline] Processing: ${pdfPath}`);
  console.log(`[Contract Pipeline] Output directory: ${outputDir}`);
  
  // Stage A: Render
  const imagePaths = await renderPdfToImages(pdfPath, path.join(outputDir, 'images'), dpi);
  
  // Stage B: OCR
  const ocrResults = await performOCR(imagePaths, outputDir, useCache);
  
  // Stage C: Assemble
  const filename = path.basename(pdfPath);
  const packet = await assembleDocumentPacket(filename, imagePaths, ocrResults);
  
  // Save document packet
  const packetPath = path.join(outputDir, 'document_packet.json');
  await fs.writeFile(packetPath, JSON.stringify(packet, null, 2));
  console.log(`[Contract Pipeline] Document packet saved: ${packetPath}`);
  
  return packet;
}
