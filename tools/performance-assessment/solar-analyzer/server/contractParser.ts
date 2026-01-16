import { ollamaVisionJSON } from "./_core/ollama";
import { ENV } from "./_core/env";
import { convertPdfUrlToImages } from "./pdfToImages";
import { contractExtractionSchema, type ContractExtraction } from "./contractSchema";

/**
 * Extract performance model from contract PDF using vision model
 * Converts PDF pages to images first, then analyzes with qwen2.5vl:7b
 */
export async function extractContractModel(contractFileUrl: string): Promise<ContractExtraction> {
  console.log('[Contract Parser] Fetching and converting PDF from:', contractFileUrl);
  
  // Convert PDF to images (one per page)
  // Reduced DPI to 150 for faster vision model processing
  // qwen2.5vl can handle lower resolution for text extraction
  const pages = await convertPdfUrlToImages(contractFileUrl, {
    density: 150, // Balance between quality and speed
    format: 'png',
  });
  
  console.log(`[Contract Parser] Converted PDF to ${pages.length} images`);
  
  const systemPrompt = `You are an expert document analyzer specializing in solar power purchase agreements.

Your task:
1. READ the entire document image carefully - this is a scanned PDF converted to high-resolution image
2. EXTRACT all text, numbers, formulas, and equations you can see
3. IDENTIFY performance metrics, tariffs, guarantees, and penalties
4. STRUCTURE the extracted information into the requested JSON format

Key information to find:
- Mathematical formulas (Performance Ratio, Availability, Revenue, Penalties)
- Numeric values (capacity in MW, percentages, dollar amounts, dates)
- Tariff rates and time-of-use schedules
- Threshold values and penalty structures

IMPORTANT:
- Read ALL visible text in the image
- Pay attention to tables, equations, and fine print
- Extract exact numbers and formulas as written
- If you cannot read something clearly, note it in ambiguities
- Be thorough - missing a key formula means the analysis will fail

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object. Do not include:
- Markdown code blocks (no \`\`\`json or \`\`\`)
- HTML tags (no <h1>, <div>, etc.)
- Explanatory text before or after the JSON
- Any other formatting

Start your response with { and end with }. Nothing else.`;
  
  const userPrompt = `Extract the complete performance model from this solar contract. The contract is provided as ${pages.length} page image(s). Analyze ALL pages to extract equations, parameters, tariffs, and guarantees.

Return a JSON object with this exact structure:
{
  "equations": [{ "name": string, "formula": string, "variables": [{ "name": string, "description": string, "unit": string }], "description": string }],
  "parameters": { "contractCapacityMw": number, "contractStartDate": string, "contractEndDate": string, "guaranteedPR": number, "guaranteedAvailability": number },
  "tariffs": { "baseRate": number, "timeOfUse": [{ "period": string, "rate": number, "hours": string }], "escalation": number },
  "guarantees": [{ "metric": string, "threshold": number, "unit": string, "penaltyFormula": string }],
  "revenueCalculations": [{ "name": string, "formula": string, "description": string }],
  "undefinedTerms": [{ "term": string, "context": string, "requiredFor": string }],
  "missingParameters": [{ "parameter": string, "description": string, "suggestedValue": string }],
  "ambiguities": [{ "issue": string, "location": string, "options": [string] }],
  "confidence": { "equations": number, "parameters": number, "tariffs": number, "overall": number }
}`;
  
  try {
    console.log('[Contract Parser] Starting extraction with Ollama vision model...');
    console.log(`[Contract Parser] Model: qwen2.5vl:7b`);
    console.log(`[Contract Parser] Processing ${pages.length} pages`);
    
    // For multi-page PDFs, we need to process all pages
    // Option 1: Send all pages to vision model at once (if model supports multiple images)
    // Option 2: Process each page separately and merge results
    
    // For now, we'll send the first few pages (most contracts have key info in first 2 pages)
    const pagesToAnalyze = pages.slice(0, Math.min(2, pages.length));
    
    console.log(`[Contract Parser] Analyzing first ${pagesToAnalyze.length} pages`);
    
    // Create a combined prompt with page numbers
    const pagesInfo = pagesToAnalyze.map((p, idx) => `Page ${p.pageNumber}`).join(', ');
    const finalPrompt = `${userPrompt}\n\nPages provided: ${pagesInfo}`;
    
    // Send first page with prompt (llama3.2-vision can handle one image at a time)
    // For better results with multi-page docs, we should process each page and merge
    // But for now, let's try with the first page which usually has the key terms
    
    const model = await ollamaVisionJSON<ContractExtraction>(
      pagesToAnalyze[0].base64, // Use first page
      finalPrompt,
      'qwen2.5vl:7b', // Qwen2.5-VL is better at structured outputs from scans
      systemPrompt,
      {
        format: contractExtractionSchema, // Pass JSON schema for structured output
        options: {
          temperature: 0.1, // Low temperature for more deterministic output
          stop: ['</', '<h', '<reserved', '\n\n\n'], // Stop tokens to prevent tag spill
        }
      }
    );
    
    console.log('[Contract Parser] Ollama response received');
    console.log('[Contract Parser] Response keys:', Object.keys(model || {}));
    
    // Log what we got for debugging
    if (model) {
      console.log('[Contract Parser] Equations:', model.equations?.length || 0);
      console.log('[Contract Parser] Parameters:', Object.keys(model.parameters || {}).length);
      console.log('[Contract Parser] Tariffs:', Object.keys(model.tariffs || {}).length);
      console.log('[Contract Parser] Guarantees:', model.guarantees?.length || 0);
    } else {
      console.error('[Contract Parser] ERROR: Ollama returned null/undefined');
    }
    
    return model;
  } catch (error) {
    console.error('[Contract Parser] Extraction failed:', error);
    throw new Error(`Contract extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate and sanitize extracted model
 */
export function validateContractModel(model: any): { 
  valid: boolean; 
  errors: string[];
  needsClarification: boolean;
  clarificationCount: number;
} {
  const errors: string[] = [];
  
  if (!model.equations || !Array.isArray(model.equations)) {
    errors.push("Missing or invalid equations array");
  }
  
  if (!model.parameters || typeof model.parameters !== 'object') {
    errors.push("Missing or invalid parameters object");
  }
  
  if (!model.tariffs || typeof model.tariffs !== 'object') {
    errors.push("Missing or invalid tariffs object");
  }
  
  if (!model.guarantees || !Array.isArray(model.guarantees)) {
    errors.push("Missing or invalid guarantees array");
  }
  
  // revenueCalculations is optional - not all contract excerpts have revenue formulas
  // If present, it must be an array
  if (model.revenueCalculations !== undefined && !Array.isArray(model.revenueCalculations)) {
    errors.push("Invalid revenueCalculations - must be an array if provided");
  }
  
  // Check for clarifications needed
  const undefinedTermsCount = model.undefinedTerms?.length || 0;
  const missingParamsCount = model.missingParameters?.length || 0;
  const ambiguitiesCount = model.ambiguities?.length || 0;
  const clarificationCount = undefinedTermsCount + missingParamsCount + ambiguitiesCount;
  
  return {
    valid: errors.length === 0,
    errors,
    needsClarification: clarificationCount > 0,
    clarificationCount
  };
}
