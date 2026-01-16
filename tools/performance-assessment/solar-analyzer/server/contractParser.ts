import { ollamaGenerateJSON } from "./_core/ollama";
import { ENV } from "./_core/env";

/**
 * Extract performance model from contract PDF
 * Returns equations, parameters, tariffs, and guarantees
 */
export async function extractContractModel(contractFileUrl: string) {
  // Fetch the PDF file
  const pdfResponse = await fetch(contractFileUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
  
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

PDF (base64): ${pdfBase64}`;
  
  const model = await ollamaGenerateJSON(
    ENV.OLLAMA_TEXT_MODEL,
    userPrompt,
    systemPrompt,
    {
      temperature: 0.1, // Low temperature for consistency
      num_predict: 4096, // Allow long responses
    }
  );
  
  return model;
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
  
  if (!model.revenueCalculations || !Array.isArray(model.revenueCalculations)) {
    errors.push("Missing or invalid revenueCalculations array");
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
