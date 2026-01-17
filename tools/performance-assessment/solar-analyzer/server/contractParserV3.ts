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
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';

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
  const tempDir = join(tmpdir(), `contract-hybrid-${Date.now()}`);
  
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

  try {
    const parsed = JSON.parse(response.message.content);
    return convertToContractModel(parsed);
  } catch (error) {
    console.error('[Hybrid Parser] Failed to parse Qwen response:', error);
    throw new Error('Failed to interpret contract with AI model');
  }
}

/**
 * Convert Qwen JSON response to ContractModel schema
 */
function convertToContractModel(qwenResponse: any): ContractModel {
  return {
    contractMetadata: {
      filename: 'contract.pdf',
      pageCount: 1,
      extractedAt: new Date().toISOString()
    },
    performanceMetrics: qwenResponse.performanceModel?.equations ? [
      {
        metricName: 'Performance Ratio',
        symbol: 'PR',
        expressionString: qwenResponse.performanceModel.equations.performanceRatio || '',
        variables: qwenResponse.performanceModel.parameters || [],
        evidence: { page: 1, snippet: '' }
      }
    ] : [],
    parameters: qwenResponse.performanceModel?.parameters || [],
    tariffs: qwenResponse.tariffStructure ? [{
      type: 'Fixed',
      rate: qwenResponse.tariffStructure.baseRate?.value,
      currency: 'USD',
      evidence: { page: 1, snippet: '' }
    }] : [],
    guarantees: [],
    tests: [],
    exclusions: [],
    exceptions: [],
    overallConfidence: {
      equations: 0.5,
      parameters: 0.5,
      tariffs: 0.5,
      overall: 0.5
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
 * Wrapper function for backwards compatibility with V2 interface
 * V3 already returns the correct format, so this is a pass-through
 */
export function convertToLegacyFormat(model: ContractModel): any {
  return model;
}
