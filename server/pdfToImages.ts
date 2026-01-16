/**
 * PDF to Images Converter
 * 
 * Converts PDF pages to PNG images for vision model processing
 */

import { fromPath } from 'pdf2pic';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface PdfToImagesOptions {
  density?: number; // DPI (default: 150)
  format?: 'png' | 'jpg';
  width?: number;
  height?: number;
}

export interface ConvertedPage {
  pageNumber: number;
  base64: string;
  path: string;
}

/**
 * Convert PDF to images (one per page)
 * Returns array of base64 encoded images
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer,
  options: PdfToImagesOptions = {}
): Promise<ConvertedPage[]> {
  const {
    density = 150,
    format = 'png',
    width = 2550, // A4 at 300 DPI width
    height = 3300, // A4 at 300 DPI height
  } = options;

  // Create temp directory for PDF and images
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-convert-'));
  const pdfPath = path.join(tempDir, 'input.pdf');
  
  try {
    // Write PDF buffer to temp file
    await fs.writeFile(pdfPath, pdfBuffer);
    
    console.log(`[PDF Converter] Converting PDF from: ${pdfPath}`);
    console.log(`[PDF Converter] Temp directory: ${tempDir}`);
    console.log(`[PDF Converter] Settings: ${density} DPI, ${width}x${height}px, ${format}`);
    
    // Configure pdf2pic
    const converter = fromPath(pdfPath, {
      density,
      saveFilename: 'page',
      savePath: tempDir,
      format,
      width,
      height,
    });
    
    // Convert all pages
    const result = await converter.bulk(-1, { responseType: 'image' });
    
    if (!result || !Array.isArray(result)) {
      throw new Error('PDF conversion failed: no pages returned');
    }
    
    console.log(`[PDF Converter] Converted ${result.length} pages`);
    
    // Read each image and convert to base64
    const pages: ConvertedPage[] = [];
    
    for (let i = 0; i < result.length; i++) {
      const page = result[i];
      if (!page || !page.path) {
        console.warn(`[PDF Converter] Warning: Page ${i + 1} has no path, skipping`);
        continue;
      }
      
      const imageBuffer = await fs.readFile(page.path);
      const base64 = imageBuffer.toString('base64');
      
      pages.push({
        pageNumber: i + 1,
        base64,
        path: page.path,
      });
      
      console.log(`[PDF Converter] Page ${i + 1}: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    }
    
    return pages;
  } catch (error) {
    console.error('[PDF Converter] Conversion failed:', error);
    throw new Error(`PDF to image conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`[PDF Converter] Cleaned up temp directory: ${tempDir}`);
    } catch (cleanupError) {
      console.warn(`[PDF Converter] Failed to clean up temp directory: ${cleanupError}`);
    }
  }
}

/**
 * Convert PDF URL to images
 */
export async function convertPdfUrlToImages(
  pdfUrl: string,
  options: PdfToImagesOptions = {}
): Promise<ConvertedPage[]> {
  console.log(`[PDF Converter] Fetching PDF from: ${pdfUrl}`);
  
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  
  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[PDF Converter] Downloaded PDF: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  
  return convertPdfToImages(pdfBuffer, options);
}
