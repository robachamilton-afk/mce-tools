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
import { extractMultipleLaTeX, cleanLaTeX, type LaTeXResult } from './latexOCR';
import { ollamaChat } from './_core/ollama';
import type { ContractModel } from './contractSchemaV2';
import { join, resolve, dirname } from 'path';
import { mkdir, rm } from 'fs/promises';
import { fileURLToPath } from 'url';

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
    const convertedPages = await convertPdfToImages(pdfBuffer, { density: 300 });
    const imagePaths = convertedPages.map(p => p.path);
    console.log(`[Hybrid Parser] Rendered ${imagePaths.length} pages`);
    
    // Stage 2: OCR extraction with Tesseract
    onProgress?.({
      stage: 'ocr',
      message: 'Extracting text with OCR...',
      progress: 25
    });
    
    const allOcrLines: OCRLine[] = [];
    const pageImages: { page: number; path: string }[] = [];
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const pageNum = i + 1;
      
      const ocrResult = await extractTextFromImage(imagePath, pageNum);
      allOcrLines.push(...ocrResult.lines.map(line => ({ ...line, page: pageNum })));
      pageImages.push({ page: pageNum, path: imagePath });
      
      console.log(`[Hybrid Parser] OCR page ${pageNum}: ${ocrResult.lines.length} lines`);
    }
    
    // Stage 3: Detect equation regions
    onProgress?.({
      stage: 'equation_detection',
      message: 'Detecting mathematical equations...',
      progress: 40
    });
    
    const allRegions: EquationRegion[] = [];
    for (const { page, path } of pageImages) {
      const pageLines = allOcrLines.filter((line: any) => line.page === page);
      const regions = detectEquationRegions(pageLines, page);
      allRegions.push(...regions);
    }
    
    const mergedRegions = mergeNearbyRegions(allRegions);
    console.log(`[Hybrid Parser] Detected ${mergedRegions.length} equation regions`);
    
    // Stage 4: Crop and extract LaTeX from equations
    onProgress?.({
      stage: 'latex_extraction',
      message: `Extracting LaTeX from ${mergedRegions.length} equations...`,
      progress: 55
    });
    
    const allCroppedImages: CroppedImage[] = [];
    for (const { page, path } of pageImages) {
      const pageRegions = mergedRegions.filter(r => r.page === page);
      if (pageRegions.length > 0) {
        const cropped = await cropMultipleRegions(path, pageRegions, true, 200);
        allCroppedImages.push(...cropped);
      }
    }
    
    const latexResults = await extractMultipleLaTeX(allCroppedImages);
    console.log(`[Hybrid Parser] Extracted ${latexResults.length} LaTeX equations`);
    
    // Stage 5: Interpret with Qwen text model
    onProgress?.({
      stage: 'interpretation',
      message: 'Interpreting contract terms with AI...',
      progress: 75
    });
    
    const proseText = allOcrLines
      .map((line: OCRLine) => line.text)
      .join('\n');
    
    const equationsText = latexResults
      .map((result, idx) => {
        const cleaned = cleanLaTeX(result.latex);
        return `Equation ${idx + 1} (Page ${result.region.page}, confidence ${result.confidence}%):\nLaTeX: ${cleaned}\nContext: ${result.region.text}`;
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
  const prompt = `You are analyzing a solar power purchase agreement (PPA) contract. Extract the following information:

## Contract Text (OCR):
${proseText.slice(0, 10000)} ${proseText.length > 10000 ? '...(truncated)' : ''}

## Extracted Equations (LaTeX):
${equationsText}

Extract the following contract terms and return as JSON:

{
  "performanceModel": {
    "equations": {
      "performanceRatio": "LaTeX formula for PR calculation",
      "availability": "LaTeX formula for availability calculation",
      "energyGeneration": "LaTeX formula for energy generation"
    },
    "parameters": [
      {
        "name": "parameter name",
        "symbol": "variable symbol",
        "value": "numeric value if specified",
        "unit": "unit of measurement",
        "description": "what this parameter represents"
      }
    ]
  },
  "tariffStructure": {
    "baseRate": { "value": number, "unit": "$/MWh" },
    "escalation": { "value": number, "unit": "%/year" },
    "timeOfUseRates": [
      { "period": "peak/off-peak", "rate": number, "hours": "time range" }
    ]
  },
  "capacityGuarantees": {
    "guaranteedCapacity": { "value": number, "unit": "MW" },
    "degradationLimit": { "value": number, "unit": "%/year" },
    "testingFrequency": "annual/biannual/etc",
    "penaltyRate": { "value": number, "unit": "$/MW" }
  },
  "performanceRequirements": {
    "minimumPR": { "value": number, "unit": "%" },
    "minimumAvailability": { "value": number, "unit": "%" },
    "measurementPeriod": "monthly/annual",
    "penaltyStructure": "description of penalty calculation"
  }
}

Return ONLY valid JSON. Use null for missing values. For equations, use the LaTeX format extracted above.`;

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
  const equations = performanceModel.equations || {};
  const parameters = performanceModel.parameters || [];
  
  // Convert Qwen parameters to EquationVariable format
  const variables = parameters.map((param: any) => ({
    name: param.symbol || param.name,
    meaning: param.description || param.name,
    units: param.unit,
    evidence: { page: 1, snippet: param.name }
  }));
  
  // Build performance metrics from equations
  const performanceMetrics = [];
  
  if (equations.performanceRatio) {
    performanceMetrics.push({
      metricName: 'Performance Ratio',
      symbol: 'PR',
      expressionString: equations.performanceRatio,
      variables: variables,
      evidence: { page: 1, snippet: 'Performance Ratio calculation' }
    });
  }
  
  if (equations.availability) {
    performanceMetrics.push({
      metricName: 'Availability',
      symbol: 'A',
      expressionString: equations.availability,
      variables: variables,
      evidence: { page: 1, snippet: 'Availability calculation' }
    });
  }
  
  if (equations.energyGeneration) {
    performanceMetrics.push({
      metricName: 'Energy Generation',
      symbol: 'E',
      expressionString: equations.energyGeneration,
      variables: variables,
      evidence: { page: 1, snippet: 'Energy generation calculation' }
    });
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
