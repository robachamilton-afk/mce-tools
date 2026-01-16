import { invokeLLM } from "./_core/llm";

/**
 * Analyze CSV/Excel headers and suggest column mappings to model variables
 */
export async function analyzeColumnMappings(
  scadaHeaders: string[],
  meteoHeaders: string[],
  modelVariables: Array<{ name: string; description: string; unit: string }>
) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert in solar farm data analysis and SCADA systems.
Analyze the provided CSV/Excel column headers and suggest mappings to the required model variables.

Guidelines:
- Match columns based on semantic meaning, not just exact names
- Common SCADA columns: timestamp, active_power, reactive_power, availability, irradiance, temperature
- Common meteo columns: timestamp, GHI, POA, ambient_temp, module_temp, wind_speed
- Handle variations: "Power (kW)" = "active_power", "Temp" = "temperature"
- Flag unmapped required variables as missing
- Be consistent: same headers should always produce same mappings

Return structured JSON with suggested mappings.`
      },
      {
        role: "user",
        content: `SCADA file headers: ${scadaHeaders.join(", ")}

Meteo file headers: ${meteoHeaders.join(", ")}

Required model variables:
${modelVariables.map(v => `- ${v.name}: ${v.description} (${v.unit})`).join("\n")}

Suggest the best column mapping for each required variable.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "column_mappings",
        strict: true,
        schema: {
          type: "object",
          properties: {
            scada_mappings: {
              type: "array",
              description: "Mappings for SCADA data columns",
              items: {
                type: "object",
                properties: {
                  variable_name: { type: "string", description: "Model variable name" },
                  suggested_column: { type: "string", description: "Suggested CSV column name" },
                  confidence: { type: "number", description: "Confidence score 0-100" },
                  reasoning: { type: "string", description: "Why this mapping was suggested" }
                },
                required: ["variable_name", "suggested_column", "confidence", "reasoning"],
                additionalProperties: false
              }
            },
            meteo_mappings: {
              type: "array",
              description: "Mappings for meteorological data columns",
              items: {
                type: "object",
                properties: {
                  variable_name: { type: "string", description: "Model variable name" },
                  suggested_column: { type: "string", description: "Suggested CSV column name" },
                  confidence: { type: "number", description: "Confidence score 0-100" },
                  reasoning: { type: "string", description: "Why this mapping was suggested" }
                },
                required: ["variable_name", "suggested_column", "confidence", "reasoning"],
                additionalProperties: false
              }
            },
            missing_variables: {
              type: "array",
              description: "Required variables that couldn't be mapped",
              items: {
                type: "object",
                properties: {
                  variable_name: { type: "string" },
                  reason: { type: "string", description: "Why it couldn't be mapped" }
                },
                required: ["variable_name", "reason"],
                additionalProperties: false
              }
            },
            warnings: {
              type: "array",
              description: "Warnings about data quality or mapping issues",
              items: { type: "string" }
            }
          },
          required: ["scada_mappings", "meteo_mappings", "missing_variables", "warnings"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
}

/**
 * Validate that all required variables are mapped
 */
export function validateMappings(
  mappings: any,
  requiredVariables: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const mappedVariables = new Set([
    ...mappings.scada_mappings.map((m: any) => m.variable_name),
    ...mappings.meteo_mappings.map((m: any) => m.variable_name)
  ]);

  for (const required of requiredVariables) {
    if (!mappedVariables.has(required)) {
      errors.push(`Required variable "${required}" is not mapped`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
