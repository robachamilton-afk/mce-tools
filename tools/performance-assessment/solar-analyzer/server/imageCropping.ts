/**
 * Image Cropping Utility
 * 
 * Crops and optionally upscales image regions for better OCR quality
 */

import sharp from 'sharp';
import type { EquationRegion } from './equationDetection';

export interface CroppedImage {
  buffer: Buffer;
  width: number;
  height: number;
  region: EquationRegion;
}

/**
 * Crop equation region from page image
 * 
 * @param imagePath - Path to the full page image
 * @param region - Equation region to crop
 * @param upscale - Whether to upscale the cropped region (default: true)
 * @param targetHeight - Target height for upscaling (default: 200px)
 * @returns Cropped and optionally upscaled image buffer
 */
export async function cropEquationRegion(
  imagePath: string,
  region: EquationRegion,
  upscale: boolean = true,
  targetHeight: number = 200
): Promise<CroppedImage> {
  // Load image and get metadata
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }
  
  console.log(`[cropEquationRegion] PNG dimensions: ${metadata.width}×${metadata.height}, bbox:`, region.bbox);
  
  // Ensure bbox is within image bounds
  const bbox = {
    x: Math.max(0, Math.floor(region.bbox.x)),
    y: Math.max(0, Math.floor(region.bbox.y)),
    width: Math.min(
      Math.ceil(region.bbox.width),
      metadata.width - Math.floor(region.bbox.x)
    ),
    height: Math.min(
      Math.ceil(region.bbox.height),
      metadata.height - Math.floor(region.bbox.y)
    )
  };
  
  // Crop the region
  let cropped = image.extract({
    left: bbox.x,
    top: bbox.y,
    width: bbox.width,
    height: bbox.height
  });
  
  // Upscale if requested
  if (upscale && bbox.height < targetHeight) {
    const scale = targetHeight / bbox.height;
    const newWidth = Math.round(bbox.width * scale);
    
    cropped = cropped.resize(newWidth, targetHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill'
    });
  }
  
  // Convert to PNG buffer
  const buffer = await cropped.png().toBuffer();
  const info = await sharp(buffer).metadata();
  
  return {
    buffer,
    width: info.width || bbox.width,
    height: info.height || bbox.height,
    region
  };
}

/**
 * Crop multiple equation regions from a page image
 * 
 * @param imagePath - Path to the full page image
 * @param regions - Array of equation regions to crop
 * @param upscale - Whether to upscale cropped regions
 * @param targetHeight - Target height for upscaling
 * @returns Array of cropped images
 */
export async function cropMultipleRegions(
  imagePath: string,
  regions: EquationRegion[],
  upscale: boolean = true,
  targetHeight: number = 200
): Promise<CroppedImage[]> {
  const results: CroppedImage[] = [];
  
  for (const region of regions) {
    try {
      const cropped = await cropEquationRegion(
        imagePath,
        region,
        upscale,
        targetHeight
      );
      results.push(cropped);
    } catch (error) {
      console.error(
        `Failed to crop region on page ${region.page}:`,
        error
      );
      // Continue with other regions
    }
  }
  
  return results;
}

/**
 * Save cropped image to file (for debugging)
 */
export async function saveCroppedImage(
  cropped: CroppedImage,
  outputPath: string
): Promise<void> {
  await sharp(cropped.buffer).toFile(outputPath);
}
