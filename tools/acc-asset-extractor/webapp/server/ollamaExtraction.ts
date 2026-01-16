/**
 * Ollama-based Asset Extraction
 * 
 * Uses local Ollama vision models to extract assets from PDF documents
 */

import { convertPdfUrlToImages } from './pdfToImages';
import { ollamaVisionJSON } from './_core/ollama';
import { ENV } from './_core/env';

export interface ExtractedAsset {
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  quantity?: number;
  location?: string;
  specifications?: Record<string, any>;
  confidence: number;
  sourceDocument: string;
  sourcePage: number;
}

export interface ExtractionResult {
  assets: ExtractedAsset[];
  totalPages: number;
  processingTime: number;
  model: string;
}

/**
 * Extract assets from a PDF document using Ollama vision model
 */
export async function extractAssetsFromPdf(
  pdfUrl: string,
  projectName: string,
  documentName: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  console.log(`[Ollama Extraction] Starting extraction for: ${documentName}`);
  console.log(`[Ollama Extraction] PDF URL: ${pdfUrl}`);
  
  // Convert PDF to images at 300 DPI for better OCR
  const pages = await convertPdfUrlToImages(pdfUrl, {
    density: 300,
    format: 'png',
  });
  
  console.log(`[Ollama Extraction] Converted ${pages.length} pages`);
  
  const systemPrompt = `You are an expert at extracting solar farm asset information from engineering documentation.

Your task:
1. ANALYZE the document image carefully - this is a high-resolution scan of technical documentation
2. IDENTIFY all solar farm assets mentioned (panels, inverters, transformers, cables, etc.)
3. EXTRACT specifications, quantities, locations, manufacturers, and models
4. STRUCTURE the information into the requested JSON format

Key information to find:
- Asset names and types (e.g., "Solar Panel", "String Inverter", "MV Transformer")
- Manufacturers and model numbers
- Technical specifications (power ratings, voltage, capacity, etc.)
- Quantities and locations
- Any identifying codes or reference numbers

Categories to look for:
- Solar Panels/Modules
- Inverters (String, Central, Micro)
- Transformers (MV, HV)
- Cables (DC, AC, MV)
- Switchgear and Protection
- Monitoring Equipment
- Mounting Structures
- Other Equipment

IMPORTANT:
- Read ALL visible text, tables, and diagrams
- Extract exact specifications as written
- If you see a table with multiple assets, extract each one
- Assign confidence scores (0-1) based on clarity of information
- If information is unclear or ambiguous, note it but still extract what you can

Return valid JSON only. No markdown, no explanations.`;

  const userPrompt = `Extract all solar farm assets from this engineering document page. 

Return a JSON object with this structure:
{
  "assets": [
    {
      "name": "Asset name",
      "category": "Category (Solar Panel, Inverter, Transformer, Cable, etc.)",
      "manufacturer": "Manufacturer name if visible",
      "model": "Model number if visible",
      "quantity": number (if specified),
      "location": "Location description if specified",
      "specifications": {
        "key": "value pairs of technical specs"
      },
      "confidence": 0.0 to 1.0,
      "notes": "Any additional relevant information"
    }
  ]
}

If no assets are found on this page, return {"assets": []}.`;

  // Process each page
  const allAssets: ExtractedAsset[] = [];
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`[Ollama Extraction] Processing page ${page.pageNumber}/${pages.length}`);
    
    try {
      const result = await ollamaVisionJSON<{ assets: any[] }>(
        page.base64,
        userPrompt,
        ENV.OLLAMA_VISION_MODEL,
        systemPrompt
      );
      
      if (result && result.assets && Array.isArray(result.assets)) {
        // Add source information to each asset
        const assetsWithSource = result.assets.map(asset => ({
          ...asset,
          sourceDocument: documentName,
          sourcePage: page.pageNumber,
          projectName,
        }));
        
        allAssets.push(...assetsWithSource);
        console.log(`[Ollama Extraction] Found ${result.assets.length} assets on page ${page.pageNumber}`);
      } else {
        console.log(`[Ollama Extraction] No assets found on page ${page.pageNumber}`);
      }
    } catch (error) {
      console.error(`[Ollama Extraction] Error processing page ${page.pageNumber}:`, error);
      // Continue with next page even if one fails
    }
  }
  
  const processingTime = Date.now() - startTime;
  
  console.log(`[Ollama Extraction] Completed extraction`);
  console.log(`[Ollama Extraction] Total assets: ${allAssets.length}`);
  console.log(`[Ollama Extraction] Processing time: ${(processingTime / 1000).toFixed(2)}s`);
  
  return {
    assets: allAssets,
    totalPages: pages.length,
    processingTime,
    model: ENV.OLLAMA_VISION_MODEL,
  };
}

/**
 * Batch extract assets from multiple PDF documents
 */
export async function batchExtractAssets(
  documents: Array<{ url: string; name: string }>,
  projectName: string,
  onProgress?: (current: number, total: number, documentName: string) => void
): Promise<ExtractedAsset[]> {
  const allAssets: ExtractedAsset[] = [];
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    if (onProgress) {
      onProgress(i + 1, documents.length, doc.name);
    }
    
    try {
      const result = await extractAssetsFromPdf(doc.url, projectName, doc.name);
      allAssets.push(...result.assets);
    } catch (error) {
      console.error(`[Batch Extraction] Failed to process ${doc.name}:`, error);
      // Continue with next document
    }
  }
  
  return allAssets;
}
