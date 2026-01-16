import { ollamaGenerateJSON } from "./_core/ollama";
import { ENV } from "./_core/env";

/**
 * Extract text from PDF using pdf-parse
 */
async function extractPdfText(pdfBuffer: ArrayBuffer): Promise<string> {
  // Use pdf-parse to extract text from PDF
  const pdf = await import('pdf-parse/lib/pdf-parse.js');
  const data = await pdf.default(Buffer.from(pdfBuffer));
  return data.text;
}

/**
 * Extract performance model from contract PDF
 * Returns equations, parameters, tariffs, and guarantees
 */
export async function extractContractModel(contractFileUrl: string) {
  console.log('[Contract Parser] Fetching PDF from:', contractFileUrl);
  
  // Fetch the PDF file
  const pdfResponse = await fetch(contractFileUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
  }
  
  const pdfBuffer = await pdfResponse.arrayBuffer();
  console.log(`[Contract Parser] PDF downloaded: ${(pdfBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
  
  // Extract text from PDF
  console.log('[Contract Parser] Extracting text from PDF...');
  const pdfText = await extractPdfText(pdfBuffer);
  console.log(`[Contract Parser] Extracted ${pdfText.length} characters of text`);
  console.log(`[Contract Parser] First 200 chars: ${pdfText.substring(0, 200)}...`);
  
  const systemPrompt = `You are an expert in solar power purchase agreements and performance contracts. 
Extract all relevant performance equations, tariff structures, capacity guarantees, and penalty clauses from the contract.

Focus on:
- Performance Ratio (PR) calculation formulas
- Availability calculations
- Energy generation requirements
- Tariff rates ($/MWh) and time-of-use structures
- Capacity guarantees (MW)
- Revenue and penalty formulas
- Any mathematical equations or thresholds

For undefined terms:
- ONLY flag a term as undefined if it is explicitly referenced in the contract but its definition is NOT provided anywhere in the document
- Do NOT flag terms that are standard industry terminology (e.g., "Performance Ratio", "Availability", "Force Majeure")
- Do NOT flag terms that can be reasonably inferred from context
- Be consistent: the same contract should always produce the same list of undefined terms

For missing parameters:
- ONLY flag parameters that are required for calculations but not specified
- Do NOT flag optional or industry-standard default values

Return structured JSON with all extracted information. Be deterministic and consistent.`;
  
  const userPrompt = `Extract the complete performance model from this solar contract PDF. Include all equations, parameters, tariffs, and guarantees.

Return a JSON object with this exact structure:
{
  "equations": [{ "name": string, "formula": string, "variables": [{ "name": string, "description": string, "unit": string }], "description": string }],
  "parameters": { "contractCapacityMw": number, "contractStartDate": string, "contractEndDate": string, "guaranteedPR": number, "guaranteedAvailability": number, ... },
  "tariffs": { "baseRate": number, "timeOfUse": [{ "period": string, "rate": number, "hours": string }], "escalation": number },
  "guarantees": [{ "metric": string, "threshold": number, "unit": string, "penaltyFormula": string }],
  "revenueCalculations": [{ "name": string, "formula": string, "description": string }],
  "undefinedTerms": [{ "term": string, "context": string, "requiredFor": string }],
  "missingParameters": [{ "parameter": string, "description": string, "suggestedValue": string }],
  "ambiguities": [{ "issue": string, "location": string, "options": [string] }],
  "confidence": { "equations": number, "parameters": number, "tariffs": number, "overall": number }
}

Contract text:
${pdfText}`;
  
  try {
    console.log('[Contract Parser] Starting extraction with Ollama...');
    console.log(`[Contract Parser] Model: ${ENV.OLLAMA_TEXT_MODEL}`);
    console.log(`[Contract Parser] Text length: ${pdfText.length} characters`);
    console.log(`[Contract Parser] Context window: 128k tokens, Max response: 8k tokens`);
    
    const model = await ollamaGenerateJSON(
      ENV.OLLAMA_TEXT_MODEL,
      userPrompt,
      systemPrompt,
      {
        temperature: 0.1, // Low temperature for consistency
        num_predict: 8192, // Allow long responses for complex contracts
        num_ctx: 131072, // 128k context window (qwen2.5:14b supports up to 128k)
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
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if model exists
  if (!model || typeof model !== 'object') {
    errors.push("Invalid model: Expected object, got " + typeof model);
    return {
      valid: false,
      errors,
      warnings,
      needsClarification: false,
      clarificationCount: 0
    };
  }
  
  // Check required fields with detailed messages
  if (!model.equations || !Array.isArray(model.equations)) {
    errors.push("Missing or invalid equations array" + (model.equations ? " (got: " + typeof model.equations + ")" : ""));
  } else if (model.equations.length === 0) {
    warnings.push("Equations array is empty - no performance equations found in contract");
  }
  
  if (!model.parameters || typeof model.parameters !== 'object') {
    errors.push("Missing or invalid parameters object" + (model.parameters ? " (got: " + typeof model.parameters + ")" : ""));
  } else if (Object.keys(model.parameters).length === 0) {
    warnings.push("Parameters object is empty - no contract parameters found");
  }
  
  if (!model.tariffs || typeof model.tariffs !== 'object') {
    errors.push("Missing or invalid tariffs object" + (model.tariffs ? " (got: " + typeof model.tariffs + ")" : ""));
  }
  
  if (!model.guarantees || !Array.isArray(model.guarantees)) {
    errors.push("Missing or invalid guarantees array" + (model.guarantees ? " (got: " + typeof model.guarantees + ")" : ""));
  }
  
  if (!model.revenueCalculations || !Array.isArray(model.revenueCalculations)) {
    errors.push("Missing or invalid revenueCalculations array" + (model.revenueCalculations ? " (got: " + typeof model.revenueCalculations + ")" : ""));
  }
  
  // Log validation results
  if (errors.length > 0) {
    console.error('[Contract Parser] Validation errors:', errors);
  }
  if (warnings.length > 0) {
    console.warn('[Contract Parser] Validation warnings:', warnings);
  }
  
  // Check for clarifications needed
  const undefinedTermsCount = model.undefinedTerms?.length || 0;
  const missingParamsCount = model.missingParameters?.length || 0;
  const ambiguitiesCount = model.ambiguities?.length || 0;
  const clarificationCount = undefinedTermsCount + missingParamsCount + ambiguitiesCount;
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    needsClarification: clarificationCount > 0,
    clarificationCount
  };
}
