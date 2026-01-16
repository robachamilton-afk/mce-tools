/**
 * JSON Schema for Solar Contract Extraction
 * 
 * This schema is used to constrain LLM output when parsing contract PDFs.
 * All fields are nullable to allow the model to indicate missing data.
 */

export const contractExtractionSchema = {
  type: "object",
  properties: {
    equations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          formula: { type: "string" },
          variables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: ["string", "null"] },
                unit: { type: ["string", "null"] }
              },
              required: ["name"]
            }
          },
          description: { type: ["string", "null"] }
        },
        required: ["name", "formula"]
      }
    },
    parameters: {
      type: "object",
      properties: {
        contractCapacityMw: { type: ["number", "null"] },
        contractStartDate: { type: ["string", "null"] },
        contractEndDate: { type: ["string", "null"] },
        guaranteedPR: { type: ["number", "null"] },
        guaranteedAvailability: { type: ["number", "null"] }
      }
    },
    tariffs: {
      type: "object",
      properties: {
        baseRate: { type: ["number", "null"] },
        timeOfUse: {
          type: ["array", "null"],
          items: {
            type: "object",
            properties: {
              period: { type: "string" },
              rate: { type: "number" },
              hours: { type: "string" }
            },
            required: ["period", "rate"]
          }
        },
        escalation: { type: ["number", "null"] }
      }
    },
    guarantees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          metric: { type: "string" },
          threshold: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          penaltyFormula: { type: ["string", "null"] }
        },
        required: ["metric"]
      }
    },
    revenueCalculations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          formula: { type: "string" },
          description: { type: ["string", "null"] }
        },
        required: ["name", "formula"]
      }
    },
    undefinedTerms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          context: { type: ["string", "null"] },
          requiredFor: { type: ["string", "null"] }
        },
        required: ["term"]
      }
    },
    missingParameters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          parameter: { type: "string" },
          description: { type: ["string", "null"] },
          suggestedValue: { type: ["string", "null"] }
        },
        required: ["parameter"]
      }
    },
    ambiguities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          issue: { type: "string" },
          location: { type: ["string", "null"] },
          options: {
            type: ["array", "null"],
            items: { type: "string" }
          }
        },
        required: ["issue"]
      }
    },
    confidence: {
      type: "object",
      properties: {
        equations: { type: "number", minimum: 0, maximum: 1 },
        parameters: { type: "number", minimum: 0, maximum: 1 },
        tariffs: { type: "number", minimum: 0, maximum: 1 },
        overall: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["overall"]
    }
  },
  required: ["equations", "parameters", "tariffs", "guarantees", "confidence"]
  // Note: revenueCalculations is optional - not all contract excerpts contain revenue formulas
};

export type ContractExtraction = {
  equations: Array<{
    name: string;
    formula: string;
    variables: Array<{
      name: string;
      description?: string | null;
      unit?: string | null;
    }>;
    description?: string | null;
  }>;
  parameters: {
    contractCapacityMw?: number | null;
    contractStartDate?: string | null;
    contractEndDate?: string | null;
    guaranteedPR?: number | null;
    guaranteedAvailability?: number | null;
  };
  tariffs: {
    baseRate?: number | null;
    timeOfUse?: Array<{
      period: string;
      rate: number;
      hours?: string;
    }> | null;
    escalation?: number | null;
  };
  guarantees: Array<{
    metric: string;
    threshold?: number | null;
    unit?: string | null;
    penaltyFormula?: string | null;
  }>;
  revenueCalculations?: Array<{
    name: string;
    formula: string;
    description?: string | null;
  }>;
  undefinedTerms: Array<{
    term: string;
    context?: string | null;
    requiredFor?: string | null;
  }>;
  missingParameters: Array<{
    parameter: string;
    description?: string | null;
    suggestedValue?: string | null;
  }>;
  ambiguities: Array<{
    issue: string;
    location?: string | null;
    options?: string[] | null;
  }>;
  confidence: {
    equations?: number;
    parameters?: number;
    tariffs?: number;
    overall: number;
  };
};
