/**
 * Contract Parser V3 - Hybrid OCR Pipeline
 * 
 * Architecture:
 * PDF → Render to images → Tesseract OCR (prose) + Equation detection
 *   → Crop equations → RapidLaTeXOCR → LaTeX
 *   → Qwen text model (interpret & validate) → Computational AST
 * 
 * This approach:
 * - Uses Tesseract for regular text (fast, good at prose)
 * - Uses RapidLaTeXOCR for equations (specialized math OCR)
 * - Uses Qwen 2.5:14b for semantic interpretation
 * - Keeps all processing local (no cloud APIs)
 */

import { convertPdfToImages } from './pdfToImages';
import { readFile } from 'fs/promises';
import { extractTextFromImage, type OCRLine } from './ocr';
import { detectEquationRegions, mergeNearbyRegions, type EquationRegion } from './equationDetection';
import { cropMultipleRegions, type CroppedImage } from './imageCropping';
import { extractMultipleLaTeX, cleanLaTeX, isValidEquation, type LaTeXResult } from './latexOCR';
import { ollamaChat } from './_core/ollama';
import type { ContractModel } from './contractSchemaV2';
import { join, resolve, dirname } from 'path';
import { mkdir, rm } from 'fs/promises';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const TEMP_DIR = join(PROJECT_ROOT, 'temp');

export interface ExtractionProgress {
  stage: 'pdf_render' | 'ocr' | 'equation_detection' | 'latex_extraction' | 'interpretation';
  message: string;
  progress: number; // 0-100
}

export interface ExtractionResult {
  model: ContractModel;
  equations: LaTeXResult[];
  processingTimeMs: number;
}

/**
 * Extract contract model using hybrid OCR pipeline
 */
export async function extractContractHybrid(
  pdfPath: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractionResult> {
  const startTime = Date.now();
  // Use local repo temp directory for Windows compatibility
  await mkdir(TEMP_DIR, { recursive: true });
  const tempDir = join(TEMP_DIR, `contract-hybrid-${Date.now()}`);
  
  try {
    await mkdir(tempDir, { recursive: true });
    const imagesDir = join(tempDir, 'images');
    await mkdir(imagesDir, { recursive: true });
    
    // Stage 1: Render PDF to images (high DPI for OCR)
    onProgress?.({
      stage: 'pdf_render',
      message: 'Converting PDF pages to images...',
      progress: 10
    });
    
    const pdfBuffer = await readFile(pdfPath);
    const convertedPages = await convertPdfToImages(pdfBuffer, { density: 200 });
    const imagePaths = convertedPages.map(p => p.path);
    console.log(`[Hybrid Parser] Rendered ${imagePaths.length} pages`);
    
    // Stage 2 & 3: Parallel OCR extraction and equation detection
    onProgress?.({
      stage: 'ocr',
      message: 'Extracting text with OCR (parallel processing)...',
      progress: 25
    });
    
    // Process all pages in parallel
    const pageResults = await Promise.all(
      imagePaths.map(async (imagePath, i) => {
        const pageNum = i + 1;
        
        // OCR extraction
        const ocrResult = await extractTextFromImage(imagePath, pageNum);
        const ocrLines = ocrResult.lines.map(line => ({ ...line, page: pageNum }));
        
        // Equation detection
        const regions = detectEquationRegions(ocrLines, pageNum);
        
        console.log(`[Hybrid Parser] Page ${pageNum}: ${ocrLines.length} lines, ${regions.length} equation regions`);
        
        return {
          page: pageNum,
          path: imagePath,
          ocrLines,
          regions
        };
      })
    );
    
    // Collect results
    const allOcrLines: OCRLine[] = pageResults.flatMap(r => r.ocrLines);
    const pageImages: { page: number; path: string }[] = pageResults.map(r => ({ page: r.page, path: r.path }));
    const allRegions: EquationRegion[] = pageResults.flatMap(r => r.regions);
    
    onProgress?.({
      stage: 'equation_detection',
      message: 'Merging detected equations...',
      progress: 40
    })
    
    const mergedRegions = mergeNearbyRegions(allRegions);
    console.log(`[Hybrid Parser] Detected ${mergedRegions.length} equation regions`);
    
    // Stage 4: Crop and extract LaTeX from equations
    onProgress?.({
      stage: 'latex_extraction',
      message: `Extracting LaTeX from ${mergedRegions.length} equations...`,
      progress: 55
    });
    
    const allCroppedImages: CroppedImage[] = [];
    
    // Create debug directory for equation images
    const debugDir = join(TEMP_DIR, 'debug-equations');
    await mkdir(debugDir, { recursive: true });
    
    for (const { page, path } of pageImages) {
      const pageRegions = mergedRegions.filter(r => r.page === page);
      if (pageRegions.length > 0) {
        const cropped = await cropMultipleRegions(path, pageRegions, true, 200);
        
        // Save cropped images for debugging
        for (let i = 0; i < cropped.length; i++) {
          const debugPath = join(debugDir, `equation-page${page}-${i + 1}.png`);
          await sharp(cropped[i].buffer).toFile(debugPath);
          console.log(`[Debug] Saved equation image: ${debugPath}`);
        }
        
        allCroppedImages.push(...cropped);
      }
    }
    
    const latexResults = await extractMultipleLaTeX(allCroppedImages);
    console.log(`[Hybrid Parser] Extracted ${latexResults.length} LaTeX equations`);
    
    // Validate extracted LaTeX - filter out prose before sending to Qwen
    const validResults = latexResults.filter(result => {
      const cleaned = cleanLaTeX(result.latex);
      const isValid = isValidEquation(cleaned);
      if (!isValid) {
        console.log(`[Hybrid Parser] Filtered out invalid equation from page ${result.region.page}`);
      }
      return isValid;
    });
    
    console.log(`[Hybrid Parser] ${validResults.length} valid equations after filtering (removed ${latexResults.length - validResults.length} prose/garbage)`);
    
    // Stage 5: Interpret with Qwen text model
    onProgress?.({
      stage: 'interpretation',
      message: 'Interpreting contract terms with AI...',
      progress: 75
    });
    
    const proseText = allOcrLines
      .map((line: OCRLine) => line.text)
      .join('\n');
    
    const equationsText = validResults
      .map((result, idx) => {
        const cleaned = cleanLaTeX(result.latex);
        // Use cleaned LaTeX as context instead of garbage OCR text
        const preview = cleaned.length > 100 ? cleaned.slice(0, 100) + '...' : cleaned;
        return `Equation ${idx + 1} (Page ${result.region.page}, confidence ${result.confidence}%):\nLaTeX: ${cleaned}\nContext: ${preview}`;
      })
      .join('\n\n');
    
    const model = await interpretContractWithQwen(proseText, equationsText);
    
    onProgress?.({
      stage: 'interpretation',
      message: 'Extraction complete',
      progress: 100
    });
    
    const processingTimeMs = Date.now() - startTime;
    console.log(`[Hybrid Parser] Total processing time: ${processingTimeMs}ms`);
    
    return {
      model,
      equations: latexResults,
      processingTimeMs
    };
    
  } finally {
    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up temp directory ${tempDir}:`, error);
    }
  }
}

/**
 * Interpret contract using Qwen text model
 */
async function interpretContractWithQwen(
  proseText: string,
  equationsText: string
): Promise<ContractModel> {
  // Debug: Log extracted LaTeX before Qwen interpretation
  console.log('[Hybrid Parser] === EXTRACTED LATEX EQUATIONS ===');
  console.log(equationsText);
  console.log('[Hybrid Parser] === END EXTRACTED LATEX ===');
  
  const prompt = `You are analyzing a solar power purchase agreement (PPA) contract. Your task is to structure the extracted LaTeX equations and identify their variables.

## Contract Text (OCR):
${proseText.slice(0, 30000)} ${proseText.length > 30000 ? '...(truncated)' : ''}

## Extracted Equations (LaTeX):
${equationsText}

**CRITICAL INSTRUCTIONS**:
1. **DO NOT invent new equations.** Only use the LaTeX formulas listed above in "Extracted Equations".
2. **DO NOT create equations from variable definitions.** If the contract says "EN_Act means actual energy", this is NOT an equation - it's a definition.
3. **Only include formulas with mathematical operations** (=, +, -, *, /, fractions, summations, etc.).
4. **Correct OCR errors** in the extracted LaTeX based on context:
   - "ace" or "gce" in subscripts → "Act" (if prose mentions "actual")
   - "S T C" with spaces → "STC" (if prose mentions "standard test conditions")
   - "E N" with spaces → "EN" (if prose mentions "energy")

**Your task**: For each extracted LaTeX equation above:
1. Identify what it calculates (e.g., "Performance Ratio", "Temperature Correction")
2. Correct any OCR errors in the LaTeX
3. List all variables used in that equation with their meanings from the prose text

Return JSON in this format:

{
  "performanceModel": {
    "equations": [
      {
        "name": "Performance Ratio",
        "latex": "corrected LaTeX formula from extraction",
        "description": "what this equation calculates",
        "variables": [
          {
            "symbol": "PR_{Act}",
            "meaning": "actual PAC Performance Ratio measured",
            "value": null,
            "unit": "%"
          }
        ]
      }
    ],
    "parameters": []
  },
  "tariffStructure": {
    "baseRate": { "value": null, "unit": "$/MWh" },
    "escalation": { "value": null, "unit": "%/year" },
    "timeOfUseRates": []
  },
  "capacityGuarantees": {
    "guaranteedCapacity": { "value": null, "unit": "MW" },
    "degradationLimit": { "value": null, "unit": "%/year" },
    "testingFrequency": null,
    "penaltyRate": { "value": null, "unit": "$/MW" }
  },
  "performanceRequirements": {
    "minimumPR": { "value": null, "unit": "%" },
    "minimumAvailability": { "value": null, "unit": "%" },
    "measurementPeriod": null,
    "penaltyStructure": null
  }
}

Return ONLY valid JSON. Use null for missing values. DO NOT create equations - only structure the ones already extracted.`;

  const response = await ollamaChat({
    model: 'qwen2.5:14b',
    messages: [
      {
        role: 'system',
        content: 'You are a contract analysis expert. Extract structured data from solar PPA contracts and return valid JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    options: {
      temperature: 0.1,
      num_predict: 2000
    },
    format: 'json'
  });

  // Debug: Log raw response
  console.log('[Hybrid Parser] Raw Qwen response length:', response.message.content.length);
  console.log('[Hybrid Parser] Raw Qwen response (first 500 chars):', response.message.content.slice(0, 500));
  
  try {
    const parsed = JSON.parse(response.message.content);
    console.log('[Hybrid Parser] Parsed JSON keys:', Object.keys(parsed));
    console.log('[Hybrid Parser] Performance model:', JSON.stringify(parsed.performanceModel, null, 2));
    return convertToContractModel(parsed);
  } catch (error) {
    console.error('[Hybrid Parser] Failed to parse Qwen response:', error);
    console.error('[Hybrid Parser] Full response:', response.message.content);
    throw new Error('Failed to interpret contract with AI model');
  }
}

/**
 * Convert Qwen JSON response to ContractModel schema
 */
function convertToContractModel(qwenResponse: any): ContractModel {
  const performanceModel = qwenResponse.performanceModel || {};
  const equationsArray = performanceModel.equations || [];
  const parameters = performanceModel.parameters || [];
  
  // Build performance metrics from equations array
  const performanceMetrics = equationsArray.map((eq: any) => {
    const variables = (eq.variables || []).map((v: any) => ({
      name: v.symbol || v.name,
      meaning: v.meaning || v.description,
      units: v.unit,
      evidence: { page: 1, snippet: v.meaning || v.name }
    }));
    
    return {
      metricName: eq.name || 'Unknown Metric',
      symbol: eq.symbol || extractSymbolFromLatex(eq.latex),
      expressionString: eq.latex,
      variables: variables,
      evidence: { page: 1, snippet: eq.description || eq.name }
    };
  });
  
  // Helper to extract left-hand symbol from LaTeX (e.g., "PR_{Act}" from "PR_{Act} = ...")
  function extractSymbolFromLatex(latex: string): string {
    const match = latex.match(/^([A-Za-z_{}^]+)\s*=/);
    return match ? match[1] : 'Unknown';
  }
  
  // Convert parameters to ContractParameter format
  const contractParameters = parameters.map((param: any) => ({
    name: param.name,
    value: param.value,
    units: param.unit,
    evidence: { page: 1, snippet: param.name }
  }));
  
  // Build tariff structure
  const tariffs = [];
  if (qwenResponse.tariffStructure?.baseRate) {
    tariffs.push({
      type: 'Fixed',
      rate: qwenResponse.tariffStructure.baseRate.value,
      currency: 'USD',
      evidence: { page: 1, snippet: 'Base rate' }
    });
  }
  
  // Calculate confidence scores
  const hasEquations = performanceMetrics.length > 0;
  const hasParameters = parameters.length > 0;
  const hasTariffs = tariffs.length > 0;
  
  return {
    contractMetadata: {
      filename: 'contract.pdf',
      pageCount: 1,
      extractedAt: new Date().toISOString()
    },
    performanceMetrics,
    parameters: contractParameters,
    tariffs,
    guarantees: [],
    tests: [],
    exclusions: [],
    exceptions: [],
    overallConfidence: {
      equations: hasEquations ? 0.85 : 0,
      parameters: hasParameters ? 0.85 : 0,
      tariffs: hasTariffs ? 0.85 : 0,
      overall: (hasEquations && hasParameters) ? 0.85 : 0.5
    }
  };
}

/**
 * Wrapper function for backwards compatibility with V2 interface
 * Extracts contract from PDF using hybrid pipeline
 */
export async function extractContractFromPdf(pdfPath: string): Promise<ContractModel> {
  const result = await extractContractHybrid(pdfPath);
  return result.model;
}

/**
 * Convert V3 ContractModel schema to legacy UI format
 * UI expects: confidence (%), equations[], parameters {}, tariffs.baseRate
 * V3 returns: overallConfidence (0-1), performanceMetrics[], parameters[], tariffs[]
 */
export function convertToLegacyFormat(model: ContractModel): any {
  // Convert confidence scores from 0-1 to 0-100 percentages
  const confidence = {
    equations: Math.round((model.overallConfidence.equations || 0) * 100),
    parameters: Math.round((model.overallConfidence.parameters || 0) * 100),
    tariffs: Math.round((model.overallConfidence.tariffs || 0) * 100),
    overall: Math.round((model.overallConfidence.overall || 0) * 100)
  };
  
  // Convert performanceMetrics to equations format
  const equations = model.performanceMetrics.map(metric => ({
    name: metric.metricName,
    symbol: metric.symbol,
    formula: metric.expressionString,
    description: `${metric.metricName} calculation`,
    variables: metric.variables.map(v => ({
      name: v.name,
      description: v.meaning,
      unit: v.units || ''
    }))
  }));
  
  // Convert parameters array to object format
  const parameters: Record<string, any> = {};
  model.parameters.forEach(param => {
    // Create a camelCase key from the parameter name
    const key = param.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word, idx) => idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    parameters[key] = param.value !== null ? param.value : 'Not specified';
  });
  
  // Convert tariffs array to single baseRate object
  const tariffs: any = {};
  if (model.tariffs.length > 0) {
    const firstTariff = model.tariffs[0];
    tariffs.baseRate = firstTariff.rate;
    tariffs.currency = firstTariff.currency || 'USD';
    tariffs.type = firstTariff.type;
  }
  
  return {
    confidence,
    equations,
    parameters,
    tariffs,
    // Pass through other fields
    undefinedTerms: model.exceptions.filter(e => e.category === 'undefined_term'),
    missingParameters: model.exceptions.filter(e => e.category === 'missing_parameter'),
    ambiguities: model.exceptions.filter(e => e.category === 'ambiguous_clause'),
    _validation: {
      needsClarification: model.exceptions.length > 0,
      clarificationCount: model.exceptions.length
    }
  };
}
