/**
 * Stage E: 3-Pass Equation Extraction
 * Pass 1: Detect equation mentions and variable definitions
 * Pass 2: Reconstruct computational form from definitions
 * Pass 3: Validate equation consistency
 */

import { ollamaChat } from './_core/ollama';
import type { DocumentPacket } from './documentAssembly';
import type { PerformanceEquation, EquationVariable } from './contractSchemaV2';

const TEXT_MODEL = 'qwen2.5:14b';

/**
 * Pass 1: Detect equation mentions and variable definition blocks
 */
export async function detectEquations(packet: DocumentPacket): Promise<{
  formulas: Array<{
    page: number;
    formulaText: string;
    variableDefinitions: string[];
  }>;
}> {
  console.log(`[Equation Pass 1] Detecting equation mentions`);

  const fullText = packet.pages
    .map((page) => `=== PAGE ${page.pageNumber} ===\n${page.ocrText}`)
    .join('\n\n');

  const prompt = `Identify all performance equations and their variable definitions in this contract.

DOCUMENT TEXT:
${fullText}

DETECTION RULES:
1. Look for phrases like "will be calculated as follows", "formula", "equation"
2. Find "Where:" sections that define variables
3. Extract the formula text and all variable definitions
4. Note the page number for each formula

OUTPUT FORMAT (JSON):
{
  "formulas": [
    {
      "page": 1,
      "formulaText": "The PR will be calculated as follows: ...",
      "variableDefinitions": [
        "PR_Act: Actual Performance Ratio",
        "EN_Act: Actual energy output in kWh",
        ...
      ]
    }
  ]
}

Return only valid JSON.`;

  const response = await ollamaChat({
    model: TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a technical document analyzer. Extract equation information and return JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    format: 'json',
    options: {
      temperature: 0.1,
    },
  });

  const result = JSON.parse(response.message.content);
  console.log(`[Equation Pass 1] Detected ${result.formulas?.length || 0} formulas`);
  
  return result;
}

/**
 * Pass 2: Reconstruct computational form from variable definitions
 */
export async function reconstructEquation(
  formulaText: string,
  variableDefinitions: string[],
  page: number
): Promise<{
  metricName: string;
  symbol: string;
  expressionString: string;
  variables: Array<{
    name: string;
    meaning: string;
    units?: string;
  }>;
}> {
  console.log(`[Equation Pass 2] Reconstructing computational form`);

  const prompt = `Reconstruct this equation in computational form using the variable definitions.

FORMULA TEXT:
${formulaText}

VARIABLE DEFINITIONS:
${variableDefinitions.join('\n')}

RECONSTRUCTION RULES:
1. Do NOT transcribe visual math notation (LaTeX, fractions, etc.)
2. Use computational operators: + - * / ( )
3. Use sum_over_t() for summations
4. Normalize starred variables: I* → I_star, P_{STC}^{*} → P_STC_star
5. Extract metric name and symbol (e.g., "Performance Ratio", "PR")
6. Parse each variable definition into name, meaning, and units

EXAMPLE OUTPUT:
{
  "metricName": "Performance Ratio",
  "symbol": "PR",
  "expressionString": "PR_Act = (sum_over_t(EN_Act_t) * I_star) / (P_STC_star * sum_over_t(I_t * t))",
  "variables": [
    { "name": "PR_Act", "meaning": "Actual Performance Ratio", "units": null },
    { "name": "EN_Act_t", "meaning": "Actual energy output at time t", "units": "kWh" },
    { "name": "I_star", "meaning": "Reference irradiance", "units": "W/m²" },
    { "name": "P_STC_star", "meaning": "Nominal peak power at STC", "units": "kW" },
    { "name": "I_t", "meaning": "Irradiance at time t", "units": "W/m²" },
    { "name": "t", "meaning": "Time period", "units": "hours" }
  ]
}

Return only valid JSON.`;

  const response = await ollamaChat({
    model: TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a mathematical equation parser. Reconstruct equations in computational form.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    format: 'json',
    options: {
      temperature: 0.1,
    },
  });

  const result = JSON.parse(response.message.content);
  console.log(`[Equation Pass 2] Reconstructed: ${result.expressionString}`);
  
  return result;
}

/**
 * Pass 3: Validate equation consistency
 */
export async function validateEquation(
  expressionString: string,
  variables: Array<{ name: string; meaning: string; units?: string }>
): Promise<{
  valid: boolean;
  exceptions: Array<{
    type: string;
    message: string;
  }>;
}> {
  console.log(`[Equation Pass 3] Validating equation consistency`);

  const exceptions: Array<{ type: string; message: string }> = [];

  // Extract variable names used in expression
  const usedVariables = new Set<string>();
  const varPattern = /[A-Za-z_][A-Za-z0-9_]*/g;
  let match;
  while ((match = varPattern.exec(expressionString)) !== null) {
    const varName = match[0];
    // Skip function names
    if (!['sum_over_t'].includes(varName)) {
      usedVariables.add(varName);
    }
  }

  // Check all used variables are defined
  const definedVariables = new Set(variables.map((v) => v.name));
  for (const usedVar of Array.from(usedVariables)) {
    if (!definedVariables.has(usedVar)) {
      exceptions.push({
        type: 'undefined_variable',
        message: `Variable "${usedVar}" used in expression but not defined`,
      });
    }
  }

  // Check all defined variables have units or flag missing
  for (const variable of variables) {
    if (!variable.units) {
      exceptions.push({
        type: 'missing_units',
        message: `Variable "${variable.name}" missing units`,
      });
    }
  }

  // Check for starred variables that weren't normalized
  if (expressionString.includes('*}') || expressionString.includes('^{*}')) {
    exceptions.push({
      type: 'unnormalized_variable',
      message: 'Expression contains unnormalized starred variables (should use _star suffix)',
    });
  }

  const valid = exceptions.length === 0;
  console.log(`[Equation Pass 3] Validation ${valid ? 'passed' : 'failed'}: ${exceptions.length} exceptions`);

  return { valid, exceptions };
}

/**
 * Full 3-pass equation extraction pipeline
 */
export async function extractEquations(
  packet: DocumentPacket
): Promise<PerformanceEquation[]> {
  console.log(`[Stage E] Starting 3-pass equation extraction`);

  // Pass 1: Detect
  const detected = await detectEquations(packet);

  if (!detected.formulas || detected.formulas.length === 0) {
    console.warn(`[Stage E] No equations detected`);
    return [];
  }

  const equations: PerformanceEquation[] = [];

  // Pass 2 & 3: Reconstruct and validate each formula
  for (const formula of detected.formulas) {
    try {
      // Pass 2: Reconstruct
      const reconstructed = await reconstructEquation(
        formula.formulaText,
        formula.variableDefinitions,
        formula.page
      );

      // Pass 3: Validate
      const validation = await validateEquation(
        reconstructed.expressionString,
        reconstructed.variables
      );

      // Build equation object
      const equation: PerformanceEquation = {
        metricName: reconstructed.metricName,
        symbol: reconstructed.symbol,
        expressionString: reconstructed.expressionString,
        variables: reconstructed.variables.map((v) => ({
          name: v.name,
          meaning: v.meaning,
          units: v.units,
          evidence: {
            page: formula.page,
            snippet: formula.formulaText.substring(0, 100), // First 100 chars
          },
        })),
        evidence: {
          page: formula.page,
          snippet: formula.formulaText.substring(0, 100),
        },
      };

      // Add validation exceptions if any
      if (!validation.valid) {
        console.warn(`[Stage E] Equation validation issues:`, validation.exceptions);
      }

      equations.push(equation);
    } catch (error) {
      console.error(`[Stage E] Failed to process formula on page ${formula.page}:`, error);
    }
  }

  console.log(`[Stage E] Extracted ${equations.length} equations`);
  return equations;
}
