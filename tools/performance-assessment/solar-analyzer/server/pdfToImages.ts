/**
 * PDF to Images Converter
 * 
 * Converts PDF pages to PNG images for vision model processing
 * Uses require() for better CommonJS module compatibility
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { convert } from 'pdf-poppler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(PROJECT_ROOT, 'temp');

export interface PdfToImagesOptions {
  density?: number; // DPI (default: 150)
  format?: 'png' | 'jpg' | 'jpeg';
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
  } = options;

  // Create temp directory for PDF and images (use local repo directory for Windows compatibility)
  await fs.mkdir(TEMP_DIR, { recursive: true });
  const timestamp = Date.now();
  const tempDir = path.join(TEMP_DIR, `pdf-convert-${timestamp}`);
  await fs.mkdir(tempDir, { recursive: true });
  const pdfPath = path.join(tempDir, 'input.pdf');
  
  try {
    // Write PDF buffer to temp file
    await fs.writeFile(pdfPath, pdfBuffer);
    
    console.log(`[PDF Converter] Converting PDF from: ${pdfPath}`);
    console.log(`[PDF Converter] Temp directory: ${tempDir}`);
    console.log(`[PDF Converter] Settings: ${density} DPI, ${format}`);
    
    // Configure pdf-poppler options
    const opts = {
      format,
      out_dir: tempDir,
      out_prefix: 'page',
      page: null, // Convert all pages
      scale: density / 72, // pdf-poppler uses scale factor (72 DPI base)
    };
    
    // Convert PDF to images using Poppler
    await convert(pdfPath, opts);
    
    // Read generated image files
    const files = await fs.readdir(tempDir);
    const imageFiles = files
      .filter(f => f.startsWith('page-') && f.endsWith(`.${format}`))
      .sort((a, b) => {
        // Extract page numbers from filenames like "page-1.png", "page-2.png"
        const aNum = parseInt(a.match(/page-(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.match(/page-(\d+)/)?.[1] || '0');
        return aNum - bNum;
      });
    
    if (imageFiles.length === 0) {
      throw new Error('PDF conversion failed: no images generated');
    }
    
    console.log(`[PDF Converter] Converted ${imageFiles.length} pages`);
    
    // Read each image and convert to base64
    const pages: ConvertedPage[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      const imagePath = path.join(tempDir, filename);
      
      const imageBuffer = await fs.readFile(imagePath);
      const base64 = imageBuffer.toString('base64');
      
      pages.push({
        pageNumber: i + 1,
        base64,
        path: imagePath,
      });
      
      console.log(`[PDF Converter] Page ${i + 1}: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    }
    
    return pages;
  } catch (error) {
    console.error('[PDF Converter] Conversion failed:', error);
    // Clean up on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(`[PDF Converter] Failed to clean up temp directory: ${cleanupError}`);
    }
    throw new Error(`PDF to image conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  // Note: Temp directory cleanup is handled by the caller (contractParserV3.ts)
  // to ensure files remain available for OCR processing
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
