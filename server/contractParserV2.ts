/**
 * Contract Parser V2 - OCR-First Pipeline
 * Orchestrates the full extraction pipeline:
 * PDF → Images → OCR → Text Model → Equations → Validation
 */

import path from 'path';
import { promises as fs } from 'fs';
import { processContractPdf } from './documentAssembly';
import { extractContractModel } from './textModelExtraction';
import { extractEquations } from './equationExtraction';
import type { ContractModel } from './contractSchemaV2';

/**
 * Main contract extraction pipeline
 */
export async function extractContractFromPdf(
  pdfPath: string,
  workDir?: string
): Promise<ContractModel> {
  console.log(`[Contract Parser V2] Starting extraction: ${pdfPath}`);
  
  // Create work directory
  const outputDir = workDir || path.join('/tmp', `contract-${Date.now()}`);
  await fs.mkdir(outputDir, { recursive: true });
  console.log(`[Contract Parser V2] Work directory: ${outputDir}`);

  try {
    // Stages A-C: PDF → Images → OCR → Document Packet
    const packet = await processContractPdf(pdfPath, outputDir, {
      dpi: 350, // High DPI for good OCR quality
      useCache: true,
    });

    console.log(`[Contract Parser V2] Document packet ready: ${packet.pages.length} pages`);

    // Stage D: Text model extraction with schema validation
    const model = await extractContractModel(packet);

    console.log(`[Contract Parser V2] Base extraction complete`);
    console.log(`  - Performance metrics: ${model.performanceMetrics.length}`);
    console.log(`  - Parameters: ${model.parameters.length}`);
    console.log(`  - Tariffs: ${model.tariffs.length}`);
    console.log(`  - Guarantees: ${model.guarantees.length}`);

    // Stage E: 3-pass equation extraction (optional enhancement)
    // If base extraction has low confidence, try equation-specific extraction
    if (model.overallConfidence.equations < 0.5) {
      console.log(`[Contract Parser V2] Low equation confidence, running 3-pass extraction`);
      
      try {
        const equations = await extractEquations(packet);
        if (equations.length > 0) {
          console.log(`[Contract Parser V2] Enhanced with ${equations.length} equations from 3-pass`);
          // Merge or replace equations
          model.performanceMetrics = equations;
        }
      } catch (error) {
        console.warn(`[Contract Parser V2] 3-pass equation extraction failed:`, error);
        // Continue with base extraction
      }
    }

    console.log(`[Contract Parser V2] Extraction complete`);
    console.log(`  - Overall confidence: ${(model.overallConfidence.overall * 100).toFixed(1)}%`);
    console.log(`  - Exceptions: ${model.exceptions.length}`);

    return model;
  } catch (error) {
    console.error(`[Contract Parser V2] Extraction failed:`, error);
    throw error;
  } finally {
    // Optional: Clean up work directory
    // await fs.rm(outputDir, { recursive: true, force: true });
  }
}

/**
 * Convert V2 model to legacy format for backwards compatibility
 */
export function convertToLegacyFormat(model: ContractModel): any {
  return {
    equations: model.performanceMetrics.map((metric) => ({
      name: metric.metricName,
      formula: metric.expressionString,
      variables: metric.variables.map((v) => v.name).join(', '),
    })),
    parameters: Object.fromEntries(
      model.parameters.map((p) => [p.name, p.value])
    ),
    tariffs: model.tariffs.length > 0 ? model.tariffs[0] : {},
    guarantees: model.guarantees.map((g) => ({
      type: g.metric,
      value: g.threshold,
      units: g.units,
    })),
    undefinedTerms: model.exceptions
      .filter((e) => e.category === 'undefined_term')
      .map((e) => ({
        term: e.issue,
        context: e.location,
        requiredFor: 'Contract execution',
      })),
    missingParameters: model.exceptions
      .filter((e) => e.category === 'missing_parameter')
      .map((e) => ({
        parameter: e.issue,
        description: e.location,
        suggestedValue: '',
      })),
    ambiguities: model.exceptions
      .filter((e) => e.category === 'ambiguous_clause')
      .map((e) => ({
        issue: e.issue,
        location: e.location,
        options: e.possibleInterpretations || [],
      })),
    confidence: {
      equations: model.overallConfidence.equations,
      parameters: model.overallConfidence.parameters,
      tariffs: model.overallConfidence.tariffs,
      overall: model.overallConfidence.overall,
    },
  };
}
