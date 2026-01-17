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
 * Uses two-pass approach:
 * 1. Find obvious math lines
 * 2. Expand to include nearby continuation lines
 */
export function detectEquationRegions(
  ocrLines: OCRLine[],
  page: number
): EquationRegion[] {
  // Pass 1: Detect obvious math lines
  const mathLineIndices = new Set<number>();
  for (let i = 0; i < ocrLines.length; i++) {
    if (isMathLine(ocrLines[i])) {
      mathLineIndices.add(i);
    }
  }
  
  // Pass 2: Expand to include nearby continuation lines
  const expandedIndices = new Set(mathLineIndices);
  const maxVerticalGap = 30; // pixels
  
  for (const idx of Array.from(mathLineIndices)) {
    const mathLine = ocrLines[idx];
    
    // Check lines above
    for (let i = idx - 1; i >= 0; i--) {
      const prevLine = ocrLines[i];
      const verticalGap = mathLine.bbox.y - (prevLine.bbox.y + prevLine.bbox.height);
      
      if (verticalGap > maxVerticalGap) break;
      if (expandedIndices.has(i)) break;
      
      // Include if it's close and not obviously prose
      if (prevLine.text.length < 100) {
        expandedIndices.add(i);
      }
    }
    
    // Check lines below
    for (let i = idx + 1; i < ocrLines.length; i++) {
      const nextLine = ocrLines[i];
      const verticalGap = nextLine.bbox.y - (mathLine.bbox.y + mathLine.bbox.height);
      
      if (verticalGap > maxVerticalGap) break;
      if (expandedIndices.has(i)) break;
      
      // Include if it's close and not obviously prose
      if (nextLine.text.length < 100) {
        expandedIndices.add(i);
      }
    }
  }
  
  // Group consecutive indices into regions
  const regions: EquationRegion[] = [];
  const sortedIndices = Array.from(expandedIndices).sort((a, b) => a - b);
  
  let currentRegion: OCRLine[] = [];
  let lastIdx = -1;
  
  for (const idx of sortedIndices) {
    if (lastIdx >= 0 && idx !== lastIdx + 1) {
      // Gap in indices - end current region
      const region = createRegion(currentRegion, page);
      if (region) {
        regions.push(region);
      }
      currentRegion = [];
    }
    
    currentRegion.push(ocrLines[idx]);
    lastIdx = idx;
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
  
  // Reject "Where:" sections and variable definition prose
  if (/^\s*where\s*:?\s*$/i.test(text)) {
    return false;
  }
  
  // Reject lines that are mostly prose (long sentences)
  if (text.length > 100 && !/[=+\-×÷∑∫]/.test(text)) {
    return false;
  }
  
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
  
  // Check for equation keywords (removed "where" to avoid false positives)
  const equationKeywords = /\b(equation|formula)\b/i;
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
  
  // Require at least 2 indicators to reduce false positives
  return indicators >= 2;
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
 * Prioritizes vertical proximity for multi-line equations
 */
function calculateDistance(
  bbox1: { x: number; y: number; width: number; height: number },
  bbox2: { x: number; y: number; width: number; height: number }
): number {
  // Check if boxes are vertically aligned (for multi-line equations)
  const horizontalOverlap = Math.min(
    bbox1.x + bbox1.width,
    bbox2.x + bbox2.width
  ) - Math.max(bbox1.x, bbox2.x);
  
  // If boxes have significant horizontal overlap, use vertical distance only
  if (horizontalOverlap > Math.min(bbox1.width, bbox2.width) * 0.5) {
    // Vertically stacked - use gap between boxes
    const verticalGap = Math.abs(
      Math.max(bbox1.y, bbox2.y) - Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height)
    );
    return verticalGap;
  }
  
  // Otherwise use Euclidean distance between centers
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
