/**
 * Model Execution Engine
 * Parses equations from extracted contract models, substitutes variables with data,
 * evaluates formulas, and calculates performance metrics.
 */

import { parseExcelFile } from "./excelParser";

interface DataRow {
  [key: string]: string | number;
}

interface EquationResult {
  equation_name: string;
  result: number;
  unit: string;
  timestamp?: Date;
}

/**
 * Fetch and parse data file (CSV or Excel)
 */
async function fetchDataFile(fileUrl: string): Promise<DataRow[]> {
  const response = await fetch(fileUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  if (fileUrl.endsWith('.csv')) {
    // Parse CSV
    const text = buffer.toString();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: DataRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: DataRow = {};
      headers.forEach((header, idx) => {
        const value = values[idx];
        // Try to parse as number
        const numValue = parseFloat(value);
        row[header] = isNaN(numValue) ? value : numValue;
      });
      rows.push(row);
    }
    
    return rows;
  } else {
    // Parse Excel
    const data = await parseExcelFile(buffer);
    if (data.length < 2) return [];
    
    const headers = data[0];
    const rows: DataRow[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const row: DataRow = {};
      headers.forEach((header, idx) => {
        const value = data[i][idx];
        const numValue = parseFloat(value);
        row[header] = isNaN(numValue) ? value : numValue;
      });
      rows.push(row);
    }
    
    return rows;
  }
}

/**
 * Substitute variables in equation with actual values
 */
function substituteVariables(
  equation: string,
  variables: Record<string, number>
): string {
  let result = equation;
  
  // Replace variable names with values
  for (const [varName, value] of Object.entries(variables)) {
    // Match whole words only (not partial matches)
    const regex = new RegExp(`\\b${varName}\\b`, 'g');
    result = result.replace(regex, value.toString());
  }
  
  return result;
}

/**
 * Safely evaluate mathematical expression
 * Only allows numbers, operators, and Math functions
 */
function evaluateExpression(expr: string): number {
  // Remove whitespace
  expr = expr.replace(/\s+/g, '');
  
  // Security: only allow safe characters
  if (!/^[0-9+\-*/().eE\s]+$/.test(expr)) {
    throw new Error(`Invalid expression: ${expr}`);
  }
  
  try {
    // Use Function constructor for safe evaluation
    const result = new Function(`return ${expr}`)();
    return typeof result === 'number' ? result : NaN;
  } catch (error) {
    throw new Error(`Failed to evaluate expression: ${expr}`);
  }
}

/**
 * Execute model equations with data
 */
export async function executeModel(
  extractedModel: any,
  scadaData: DataRow[],
  meteoData: DataRow[],
  scadaMappings: any[],
  meteoMappings: any[]
): Promise<{
  performance_ratio: number;
  availability: number;
  energy_generation_kwh: number;
  revenue: number;
  penalties: number;
  detailed_results: EquationResult[];
}> {
  const results: EquationResult[] = [];
  
  // Build variable mapping (model variable -> data column)
  const scadaVarMap: Record<string, string> = {};
  const meteoVarMap: Record<string, string> = {};
  
  scadaMappings.forEach(m => {
    scadaVarMap[m.variable_name] = m.suggested_column;
  });
  
  meteoMappings.forEach(m => {
    meteoVarMap[m.variable_name] = m.suggested_column;
  });
  
  // Calculate aggregate metrics
  let totalPR = 0;
  let totalAvailability = 0;
  let totalEnergy = 0;
  let dataPoints = 0;
  
  // Process each row of data
  const minLength = Math.min(scadaData.length, meteoData.length);
  
  for (let i = 0; i < minLength; i++) {
    const scadaRow = scadaData[i];
    const meteoRow = meteoData[i];
    
    // Build variable values for this row
    const variables: Record<string, number> = {};
    
    // Map SCADA variables
    for (const [varName, columnName] of Object.entries(scadaVarMap)) {
      const value = scadaRow[columnName];
      if (typeof value === 'number') {
        variables[varName] = value;
      }
    }
    
    // Map meteo variables
    for (const [varName, columnName] of Object.entries(meteoVarMap)) {
      const value = meteoRow[columnName];
      if (typeof value === 'number') {
        variables[varName] = value;
      }
    }
    
    // Evaluate each equation
    if (extractedModel.equations) {
      for (const eq of extractedModel.equations) {
        try {
          const substituted = substituteVariables(eq.formula, variables);
          const result = evaluateExpression(substituted);
          
          if (!isNaN(result)) {
            results.push({
              equation_name: eq.name,
              result,
              unit: eq.unit || '',
            });
            
            // Accumulate for aggregates
            if (eq.name.toLowerCase().includes('performance ratio') || eq.name.toLowerCase().includes('pr')) {
              totalPR += result;
              dataPoints++;
            }
            if (eq.name.toLowerCase().includes('availability')) {
              totalAvailability += result;
            }
            if (eq.name.toLowerCase().includes('energy') || eq.name.toLowerCase().includes('generation')) {
              totalEnergy += result;
            }
          }
        } catch (error) {
          console.error(`Failed to evaluate equation ${eq.name}:`, error);
        }
      }
    }
  }
  
  // Calculate averages
  const avgPR = dataPoints > 0 ? totalPR / dataPoints : 0;
  const avgAvailability = dataPoints > 0 ? totalAvailability / dataPoints : 0;
  
  // Calculate revenue and penalties based on contract terms
  let revenue = 0;
  let penalties = 0;
  
  if (extractedModel.tariff_structure) {
    const tariff = extractedModel.tariff_structure.base_tariff || 0;
    revenue = totalEnergy * tariff / 1000; // Convert kWh to MWh
  }
  
  if (extractedModel.capacity_guarantees) {
    const minPR = extractedModel.capacity_guarantees.min_performance_ratio || 0;
    if (avgPR < minPR) {
      const penaltyRate = extractedModel.capacity_guarantees.penalty_rate || 0;
      penalties = (minPR - avgPR) * revenue * penaltyRate;
    }
  }
  
  return {
    performance_ratio: avgPR,
    availability: avgAvailability,
    energy_generation_kwh: totalEnergy,
    revenue,
    penalties,
    detailed_results: results,
  };
}

/**
 * Execute analysis and store results
 */
export async function executeAnalysis(
  analysisId: number,
  scadaFileUrl: string,
  meteoFileUrl: string,
  extractedModel: any,
  scadaMappings: any[],
  meteoMappings: any[]
): Promise<any> {
  // Fetch data files
  const scadaData = await fetchDataFile(scadaFileUrl);
  const meteoData = await fetchDataFile(meteoFileUrl);
  
  if (scadaData.length === 0 || meteoData.length === 0) {
    throw new Error("No data found in uploaded files");
  }
  
  // Execute model
  const results = await executeModel(
    extractedModel,
    scadaData,
    meteoData,
    scadaMappings,
    meteoMappings
  );
  
  return results;
}
