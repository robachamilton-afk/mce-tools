/**
 * Contract Schema V2 - OCR-First with Evidence References
 * Based on ChatGPT's document intelligence pipeline requirements
 */

// Evidence reference for all extracted fields
export type Evidence = {
  page: number;
  snippet: string; // OCR text snippet (<= 20 words)
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

// Equation variable definition
export type EquationVariable = {
  name: string; // e.g., "PR_Act", "EN_Act_t"
  meaning: string; // Human-readable description
  units?: string; // e.g., "kWh", "W/m²", "hours"
  evidence: Evidence;
};

// Performance equation with AST representation
export type PerformanceEquation = {
  metricName: string; // e.g., "Performance Ratio"
  symbol: string; // e.g., "PR"
  expressionAst?: string; // Computational AST (preferred)
  expressionString: string; // Safe expression string
  variables: EquationVariable[];
  evidence: Evidence;
};

// Contract parameter with evidence
export type ContractParameter = {
  name: string;
  value: string | number | null;
  units?: string;
  evidence?: Evidence;
};

// Tariff structure
export type Tariff = {
  type: string; // e.g., "Fixed", "Variable", "Performance-based"
  rate?: number;
  currency?: string;
  conditions?: string;
  evidence?: Evidence;
};

// Performance guarantee
export type Guarantee = {
  metric: string; // e.g., "Performance Ratio", "Availability"
  threshold: number;
  units?: string;
  penalty?: string;
  evidence?: Evidence;
};

// Test specification
export type Test = {
  name: string;
  description: string;
  acceptance: string;
  evidence?: Evidence;
};

// Exclusion clause (e.g., curtailment, grid unavailability)
export type Exclusion = {
  type: string; // e.g., "Curtailment", "Grid Unavailability"
  description: string;
  impact: string; // How it affects calculations
  evidence?: Evidence;
};

// Exception/ambiguity flag
export type Exception = {
  category: string; // e.g., "undefined_term", "missing_parameter", "ambiguous_clause"
  issue: string;
  location: string; // Page or section reference
  possibleInterpretations?: string[];
  confidence: number; // 0-1
  evidence?: Evidence;
};

// Main contract model
export type ContractModel = {
  contractMetadata: {
    filename: string;
    pageCount: number;
    extractedAt: string;
  };
  
  performanceMetrics: PerformanceEquation[];
  
  parameters: ContractParameter[];
  
  tariffs: Tariff[];
  
  guarantees: Guarantee[];
  
  tests: Test[];
  
  exclusions: Exclusion[];
  
  exceptions: Exception[];
  
  overallConfidence: {
    equations: number; // 0-1
    parameters: number;
    tariffs: number;
    overall: number;
  };
  
  // Optional revenue calculations (not all contracts have these)
  revenueCalculations?: {
    name: string;
    formula: string;
    description: string;
    evidence?: Evidence;
  }[];
};

// JSON Schema for Ollama structured output
export const contractJsonSchema = {
  type: "object",
  required: [
    "contractMetadata",
    "performanceMetrics",
    "parameters",
    "tariffs",
    "guarantees",
    "tests",
    "exclusions",
    "exceptions",
    "overallConfidence"
  ],
  properties: {
    contractMetadata: {
      type: "object",
      required: ["filename", "pageCount", "extractedAt"],
      properties: {
        filename: { type: "string" },
        pageCount: { type: "number" },
        extractedAt: { type: "string" }
      }
    },
    performanceMetrics: {
      type: "array",
      items: {
        type: "object",
        required: ["metricName", "symbol", "expressionString", "variables", "evidence"],
        properties: {
          metricName: { type: "string" },
          symbol: { type: "string" },
          expressionAst: { type: "string" },
          expressionString: { type: "string" },
          variables: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "meaning", "evidence"],
              properties: {
                name: { type: "string" },
                meaning: { type: "string" },
                units: { type: "string" },
                evidence: {
                  type: "object",
                  required: ["page", "snippet"],
                  properties: {
                    page: { type: "number" },
                    snippet: { type: "string" },
                    bbox: {
                      type: "object",
                      properties: {
                        x: { type: "number" },
                        y: { type: "number" },
                        width: { type: "number" },
                        height: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    },
    parameters: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "value"],
        properties: {
          name: { type: "string" },
          value: { type: ["string", "number", "null"] },
          units: { type: "string" },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    },
    tariffs: {
      type: "array",
      items: {
        type: "object",
        required: ["type"],
        properties: {
          type: { type: "string" },
          rate: { type: "number" },
          currency: { type: "string" },
          conditions: { type: "string" },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    },
    guarantees: {
      type: "array",
      items: {
        type: "object",
        required: ["metric", "threshold"],
        properties: {
          metric: { type: "string" },
          threshold: { type: "number" },
          units: { type: "string" },
          penalty: { type: "string" },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    },
    tests: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "description", "acceptance"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          acceptance: { type: "string" },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    },
    exclusions: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "description", "impact"],
        properties: {
          type: { type: "string" },
          description: { type: "string" },
          impact: { type: "string" },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    },
    exceptions: {
      type: "array",
      items: {
        type: "object",
        required: ["category", "issue", "location", "confidence"],
        properties: {
          category: { type: "string" },
          issue: { type: "string" },
          location: { type: "string" },
          possibleInterpretations: {
            type: "array",
            items: { type: "string" }
          },
          confidence: { type: "number" },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    },
    overallConfidence: {
      type: "object",
      required: ["equations", "parameters", "tariffs", "overall"],
      properties: {
        equations: { type: "number" },
        parameters: { type: "number" },
        tariffs: { type: "number" },
        overall: { type: "number" }
      }
    },
    revenueCalculations: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "formula", "description"],
        properties: {
          name: { type: "string" },
          formula: { type: "string" },
          description: { type: "string" },
          evidence: {
            type: "object",
            required: ["page", "snippet"],
            properties: {
              page: { type: "number" },
              snippet: { type: "string" }
            }
          }
        }
      }
    }
  }
};
