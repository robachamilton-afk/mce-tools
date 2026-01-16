/**
 * Equation Region Detection
 * 
 * Detects regions in OCR output that likely contain mathematical equations
 * based on heuristics like special characters, symbols, and formatting patterns.
 */

import type { OCRLine } from './ocr';

export interface EquationRegion {
  page: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: string;
  confidence: number;
  lines: OCRLine[];
}

/**
 * Detect equation regions from OCR output
 */
export function detectEquationRegions(
  ocrLines: OCRLine[],
  page: number
): EquationRegion[] {
  const regions: EquationRegion[] = [];
  
  // Group consecutive lines that contain math symbols
  let currentRegion: OCRLine[] = [];
  let regionStartIdx = 0;
  
  for (let i = 0; i < ocrLines.length; i++) {
    const line = ocrLines[i];
    
    if (isMathLine(line)) {
      if (currentRegion.length === 0) {
        regionStartIdx = i;
      }
      currentRegion.push(line);
    } else {
      // End of math region
      if (currentRegion.length > 0) {
        const region = createRegion(currentRegion, page);
        if (region) {
          regions.push(region);
        }
        currentRegion = [];
      }
    }
  }
  
  // Handle last region
  if (currentRegion.length > 0) {
    const region = createRegion(currentRegion, page);
    if (region) {
      regions.push(region);
    }
  }
  
  return regions;
}

/**
 * Check if a line likely contains mathematical notation
 */
function isMathLine(line: OCRLine): boolean {
  const text = line.text;
  
  // Math symbol patterns
  const mathSymbols = /[=+\-×÷∑∫√π∞≈≠≤≥±∂∇]/;
  const fractionPattern = /\d+\/\d+/;
  const superscriptPattern = /\^|²|³/;
  const subscriptPattern = /_|₀|₁|₂|₃|₄|₅|₆|₇|₈|₉/;
  const greekLetters = /[αβγδεζηθικλμνξοπρστυφχψω]/i;
  const variables = /[a-zA-Z]\s*[=+\-×÷]/;
  
  // Check for math indicators
  const hasMathSymbols = mathSymbols.test(text);
  const hasFractions = fractionPattern.test(text);
  const hasSuperscript = superscriptPattern.test(text);
  const hasSubscript = subscriptPattern.test(text);
  const hasGreek = greekLetters.test(text);
  const hasVariables = variables.test(text);
  
  // Check for equation keywords
  const equationKeywords = /\b(equation|formula|where|PR|performance ratio)\b/i;
  const hasKeywords = equationKeywords.test(text);
  
  // Line is likely math if it has multiple indicators
  const indicators = [
    hasMathSymbols,
    hasFractions,
    hasSuperscript,
    hasSubscript,
    hasGreek,
    hasVariables,
    hasKeywords
  ].filter(Boolean).length;
  
  return indicators >= 2 || (indicators >= 1 && line.confidence < 70);
}

/**
 * Create equation region from grouped lines
 */
function createRegion(
  lines: OCRLine[],
  page: number
): EquationRegion | null {
  if (lines.length === 0) return null;
  
  // Calculate bounding box that encompasses all lines
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  let totalConfidence = 0;
  const texts: string[] = [];
  
  for (const line of lines) {
    minX = Math.min(minX, line.bbox.x);
    minY = Math.min(minY, line.bbox.y);
    maxX = Math.max(maxX, line.bbox.x + line.bbox.width);
    maxY = Math.max(maxY, line.bbox.y + line.bbox.height);
    totalConfidence += line.confidence;
    texts.push(line.text);
  }
  
  // Add padding around equation region
  const padding = 20;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = maxX + padding;
  maxY = maxY + padding;
  
  return {
    page,
    bbox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    },
    text: texts.join(' '),
    confidence: totalConfidence / lines.length,
    lines
  };
}

/**
 * Merge overlapping or nearby equation regions
 */
export function mergeNearbyRegions(
  regions: EquationRegion[],
  maxDistance: number = 50
): EquationRegion[] {
  if (regions.length <= 1) return regions;
  
  const merged: EquationRegion[] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < regions.length; i++) {
    if (used.has(i)) continue;
    
    const current = regions[i];
    const group = [current];
    used.add(i);
    
    // Find nearby regions
    for (let j = i + 1; j < regions.length; j++) {
      if (used.has(j)) continue;
      
      const other = regions[j];
      if (current.page !== other.page) continue;
      
      const distance = calculateDistance(current.bbox, other.bbox);
      if (distance <= maxDistance) {
        group.push(other);
        used.add(j);
      }
    }
    
    // Merge group into single region
    if (group.length === 1) {
      merged.push(current);
    } else {
      merged.push(mergeRegionGroup(group));
    }
  }
  
  return merged;
}

/**
 * Calculate distance between two bounding boxes
 */
function calculateDistance(
  bbox1: { x: number; y: number; width: number; height: number },
  bbox2: { x: number; y: number; width: number; height: number }
): number {
  const center1X = bbox1.x + bbox1.width / 2;
  const center1Y = bbox1.y + bbox1.height / 2;
  const center2X = bbox2.x + bbox2.width / 2;
  const center2Y = bbox2.y + bbox2.height / 2;
  
  return Math.sqrt(
    Math.pow(center2X - center1X, 2) + Math.pow(center2Y - center1Y, 2)
  );
}

/**
 * Merge multiple regions into one
 */
function mergeRegionGroup(regions: EquationRegion[]): EquationRegion {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  let totalConfidence = 0;
  const allLines: OCRLine[] = [];
  const texts: string[] = [];
  
  for (const region of regions) {
    minX = Math.min(minX, region.bbox.x);
    minY = Math.min(minY, region.bbox.y);
    maxX = Math.max(maxX, region.bbox.x + region.bbox.width);
    maxY = Math.max(maxY, region.bbox.y + region.bbox.height);
    totalConfidence += region.confidence;
    allLines.push(...region.lines);
    texts.push(region.text);
  }
  
  return {
    page: regions[0].page,
    bbox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    },
    text: texts.join(' '),
    confidence: totalConfidence / regions.length,
    lines: allLines
  };
}
