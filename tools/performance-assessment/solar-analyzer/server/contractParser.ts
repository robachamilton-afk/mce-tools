import { invokeLLM } from "./_core/llm";

/**
 * Extract performance model from contract PDF
 * Returns equations, parameters, tariffs, and guarantees
 */
export async function extractContractModel(contractFileUrl: string) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert in solar power purchase agreements and performance contracts. 
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

Return structured JSON with all extracted information. Be deterministic and consistent.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the complete performance model from this solar contract PDF. Include all equations, parameters, tariffs, and guarantees."
          },
          {
            type: "file_url",
            file_url: {
              url: contractFileUrl,
              mime_type: "application/pdf"
            }
          }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "contract_model",
        strict: true,
        schema: {
          type: "object",
          properties: {
            equations: {
              type: "array",
              description: "List of performance equations extracted from contract",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Equation name (e.g., 'Performance Ratio')" },
                  formula: { type: "string", description: "Mathematical formula (e.g., 'PR = (Actual_Energy / Expected_Energy) * 100')" },
                  variables: {
                    type: "array",
                    description: "List of variables used in the equation",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        unit: { type: "string" }
                      },
                      required: ["name", "description", "unit"],
                      additionalProperties: false
                    }
                  },
                  description: { type: "string" }
                },
                required: ["name", "formula", "variables", "description"],
                additionalProperties: false
              }
            },
            parameters: {
              type: "object",
              description: "Fixed parameters and constants",
              properties: {
                contractCapacityMw: { type: "number", description: "Contracted capacity in MW" },
                contractStartDate: { type: "string", description: "Contract start date (ISO format)" },
                contractEndDate: { type: "string", description: "Contract end date (ISO format)" },
                guaranteedPR: { type: "number", description: "Guaranteed Performance Ratio (%)" },
                guaranteedAvailability: { type: "number", description: "Guaranteed availability (%)" }
              },
              required: [],
              additionalProperties: true
            },
            tariffs: {
              type: "object",
              description: "Energy tariff structure",
              properties: {
                baseRate: { type: "number", description: "Base tariff rate ($/MWh)" },
                timeOfUse: {
                  type: "array",
                  description: "Time-of-use tariff rates",
                  items: {
                    type: "object",
                    properties: {
                      period: { type: "string", description: "Time period (e.g., 'Peak', 'Off-peak')" },
                      rate: { type: "number", description: "Rate for this period ($/MWh)" },
                      hours: { type: "string", description: "Hours when this rate applies" }
                    },
                    required: ["period", "rate"],
                    additionalProperties: false
                  }
                },
                escalation: { type: "number", description: "Annual escalation rate (%)" }
              },
              required: [],
              additionalProperties: true
            },
            guarantees: {
              type: "array",
              description: "Performance guarantees and thresholds",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string", description: "Metric name (e.g., 'Annual Energy', 'Availability')" },
                  threshold: { type: "number", description: "Threshold value" },
                  unit: { type: "string", description: "Unit of measurement" },
                  penaltyFormula: { type: "string", description: "Formula for calculating penalties if threshold not met" }
                },
                required: ["metric", "threshold", "unit"],
                additionalProperties: false
              }
            },
            revenueCalculations: {
              type: "array",
              description: "Revenue and penalty calculation formulas",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  formula: { type: "string" },
                  description: { type: "string" }
                },
                required: ["name", "formula", "description"],
                additionalProperties: false
              }
            },
            undefinedTerms: {
              type: "array",
              description: "Capitalized terms or definitions referenced but not defined in the contract",
              items: {
                type: "object",
                properties: {
                  term: { type: "string", description: "The undefined term (e.g., 'Excluded Period')" },
                  context: { type: "string", description: "Where this term is used in the contract" },
                  requiredFor: { type: "string", description: "What calculation or clause requires this definition" }
                },
                required: ["term", "context", "requiredFor"],
                additionalProperties: false
              }
            },
            missingParameters: {
              type: "array",
              description: "Parameters or values that are needed but not found in the contract",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string", description: "Name of missing parameter" },
                  description: { type: "string", description: "What this parameter is used for" },
                  suggestedValue: { type: "string", description: "Industry standard or suggested value if known" }
                },
                required: ["parameter", "description"],
                additionalProperties: false
              }
            },
            ambiguities: {
              type: "array",
              description: "Ambiguous clauses or conflicting information that needs clarification",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string", description: "Description of the ambiguity" },
                  location: { type: "string", description: "Section or clause reference" },
                  options: {
                    type: "array",
                    description: "Possible interpretations",
                    items: { type: "string" }
                  }
                },
                required: ["issue", "location", "options"],
                additionalProperties: false
              }
            },
            confidence: {
              type: "object",
              description: "Confidence scores for extracted information",
              properties: {
                equations: { type: "number", description: "Confidence in equations (0-100)" },
                parameters: { type: "number", description: "Confidence in parameters (0-100)" },
                tariffs: { type: "number", description: "Confidence in tariffs (0-100)" },
                overall: { type: "number", description: "Overall confidence (0-100)" }
              },
              required: ["equations", "parameters", "tariffs", "overall"],
              additionalProperties: false
            }
          },
          required: ["equations", "parameters", "tariffs", "guarantees", "revenueCalculations", "undefinedTerms", "missingParameters", "ambiguities", "confidence"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  const model = JSON.parse(typeof content === 'string' ? content : '{}');
  
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
