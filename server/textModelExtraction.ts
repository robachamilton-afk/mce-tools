/**
 * Stage D: Text Model Extraction with Schema Validation
 * Use qwen2.5:14b text model (not vision) for structured JSON extraction
 * Includes self-healing retry logic for invalid JSON
 */

import { ollamaChat } from './_core/ollama';
import { contractJsonSchema, type ContractModel } from './contractSchemaV2';
import type { DocumentPacket } from './documentAssembly';

const TEXT_MODEL = 'qwen2.5:14b';
const MAX_RETRIES = 2;

/**
 * Build extraction prompt from document packet
 */
function buildExtractionPrompt(packet: DocumentPacket): string {
  // Combine all OCR text
  const fullText = packet.pages
    .map((page) => `=== PAGE ${page.pageNumber} ===\n${page.ocrText}`)
    .join('\n\n');

  return `You are a contract analysis expert. Extract structured information from this solar EPC contract.

DOCUMENT TEXT:
${fullText}

EXTRACTION RULES:
1. Extract performance equations (e.g., Performance Ratio formula)
2. Identify all variables used in equations with their definitions
3. Find contract parameters (capacity, dates, guaranteed values)
4. Locate tariff structures and payment terms
5. Extract performance guarantees and thresholds
6. Identify test specifications and acceptance criteria
7. Find exclusion clauses (curtailment, grid unavailability, etc.)
8. Flag ambiguities and undefined terms as exceptions

EQUATION EXTRACTION (CRITICAL):
- Do NOT transcribe visual math notation
- Reconstruct equations from variable definitions and surrounding text
- Use computational form: PR_Act = (sum_over_t(EN_Act_t) * I_star) / (P_STC_star * sum_over_t(I_t * t))
- Normalize starred variables: I* → I_star, P_{STC}^{*} → P_STC_star
- Extract "Where:" sections for variable definitions

EVIDENCE REQUIREMENTS:
- Every extracted field MUST include evidence
- Evidence format: { page: number, snippet: "exact text from OCR (max 20 words)" }
- Use actual page numbers and exact OCR text snippets

OUTPUT FORMAT:
Return valid JSON matching the schema. Include evidence for all fields.`;
}

/**
 * Validate extracted model against schema
 */
function validateModel(model: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required top-level fields
  if (!model.contractMetadata) errors.push('Missing contractMetadata');
  if (!model.performanceMetrics) errors.push('Missing performanceMetrics');
  if (!model.parameters) errors.push('Missing parameters');
  if (!model.tariffs) errors.push('Missing tariffs');
  if (!model.guarantees) errors.push('Missing guarantees');
  if (!model.tests) errors.push('Missing tests');
  if (!model.exclusions) errors.push('Missing exclusions');
  if (!model.exceptions) errors.push('Missing exceptions');
  if (!model.overallConfidence) errors.push('Missing overallConfidence');

  // Check arrays are actually arrays
  if (model.performanceMetrics && !Array.isArray(model.performanceMetrics)) {
    errors.push('performanceMetrics must be an array');
  }
  if (model.parameters && !Array.isArray(model.parameters)) {
    errors.push('parameters must be an array');
  }
  if (model.tariffs && !Array.isArray(model.tariffs)) {
    errors.push('tariffs must be an array');
  }
  if (model.guarantees && !Array.isArray(model.guarantees)) {
    errors.push('guarantees must be an array');
  }
  if (model.tests && !Array.isArray(model.tests)) {
    errors.push('tests must be an array');
  }
  if (model.exclusions && !Array.isArray(model.exclusions)) {
    errors.push('exclusions must be an array');
  }
  if (model.exceptions && !Array.isArray(model.exceptions)) {
    errors.push('exceptions must be an array');
  }

  // Check evidence fields exist
  if (model.performanceMetrics && Array.isArray(model.performanceMetrics)) {
    model.performanceMetrics.forEach((metric: any, index: number) => {
      if (!metric.evidence) {
        errors.push(`performanceMetrics[${index}] missing evidence`);
      }
      if (!metric.variables || !Array.isArray(metric.variables)) {
        errors.push(`performanceMetrics[${index}] missing or invalid variables array`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build repair prompt for invalid JSON
 */
function buildRepairPrompt(invalidJson: string, errors: string[]): string {
  return `The previous JSON output has validation errors. Please repair it.

INVALID JSON:
${invalidJson}

VALIDATION ERRORS:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

REPAIR INSTRUCTIONS:
1. Fix all validation errors listed above
2. Do NOT add new fields not in the schema
3. Ensure all required fields are present
4. Ensure all arrays are properly formatted
5. Add missing evidence fields where required
6. Return only the repaired JSON, no explanations

OUTPUT FORMAT:
Return valid JSON matching the schema.`;
}

/**
 * Extract contract model using text model with self-healing
 */
export async function extractContractModel(
  packet: DocumentPacket
): Promise<ContractModel> {
  console.log(`[Stage D] Starting text model extraction`);
  console.log(`[Stage D] Model: ${TEXT_MODEL}`);

  const prompt = buildExtractionPrompt(packet);

  let attempt = 0;
  let lastError: string | null = null;
  let lastResponse: string | null = null;

  while (attempt <= MAX_RETRIES) {
    attempt++;
    console.log(`[Stage D] Extraction attempt ${attempt}/${MAX_RETRIES + 1}`);

    try {
      const messages = attempt === 1
        ? [
            {
              role: 'system' as const,
              content: 'You are a contract analysis expert. Extract structured information and return valid JSON only.',
            },
            {
              role: 'user' as const,
              content: prompt,
            },
          ]
        : [
            {
              role: 'system' as const,
              content: 'You are a contract analysis expert. Repair the invalid JSON.',
            },
            {
              role: 'user' as const,
              content: buildRepairPrompt(lastResponse!, [lastError!]),
            },
          ];

      const response = await ollamaChat({
        model: TEXT_MODEL,
        messages,
        format: contractJsonSchema,
        options: {
          temperature: 0.1, // Low temperature for deterministic output
          stop: ['```', '</', '</json>'], // Stop tokens to prevent garbage
        },
      });

      const content = response.message.content;
      lastResponse = content;

      console.log(`[Stage D] Response length: ${content.length} characters`);

      // Try to parse JSON
      let model: any;
      try {
        model = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown or mixed content
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                         content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          model = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error(`Failed to parse JSON: ${parseError}`);
        }
      }

      // Validate model
      const validation = validateModel(model);
      
      if (validation.valid) {
        console.log(`[Stage D] Extraction successful on attempt ${attempt}`);
        return model as ContractModel;
      } else {
        console.warn(`[Stage D] Validation failed:`, validation.errors);
        lastError = validation.errors.join('; ');
        
        if (attempt > MAX_RETRIES) {
          throw new Error(`Validation failed after ${MAX_RETRIES} retries: ${lastError}`);
        }
        
        // Continue to next attempt with repair prompt
        continue;
      }
    } catch (error) {
      console.error(`[Stage D] Attempt ${attempt} failed:`, error);
      
      if (attempt > MAX_RETRIES) {
        throw new Error(`Extraction failed after ${MAX_RETRIES} retries: ${error}`);
      }
      
      lastError = error instanceof Error ? error.message : String(error);
      // Continue to next attempt
    }
  }

  throw new Error('Extraction failed: max retries exceeded');
}
