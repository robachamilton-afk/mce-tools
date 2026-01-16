# Contract Parser Implementation Architecture

This document explains the technical implementation of the Ollama-based contract parser for the Solar Farm Performance Analyzer.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Data Flow](#data-flow)
5. [API Reference](#api-reference)
6. [Testing](#testing)
7. [Deployment](#deployment)

---

## Overview

The contract parser extracts structured performance data from solar farm Power Purchase Agreement (PPA) contracts. It uses a vision model (llava:34b) to analyze PDF documents and extract:

- **Equations**: Performance ratio formulas, availability calculations
- **Parameters**: Irradiance thresholds, temperature coefficients, degradation rates
- **Tariffs**: Energy pricing structures, time-of-use rates
- **Guarantees**: Minimum performance levels, availability requirements
- **Compliance terms**: Penalties, measurement periods, exclusions

### Why Vision Models?

Traditional text extraction (OCR + parsing) fails for:
- **Scanned PDFs** without text layers
- **Complex layouts** with tables, charts, and multi-column text
- **Mathematical equations** with special symbols and formatting
- **Mixed content** combining text, images, and diagrams

Vision models understand document structure and can extract information from visual representations.

---

## Architecture

### High-Level Flow

```
PDF Contract (URL)
    ↓
[Download & Validate]
    ↓
[Convert to Images] (pdf2pic + GraphicsMagick)
    ↓
[Analyze with Vision Model] (llava:34b via Ollama)
    ↓
[Parse JSON Response]
    ↓
[Store in Database]
    ↓
Structured Contract Model
```

### Components

#### 1. PDF Processing (`server/pdfToImages.ts`)

Converts PDF pages to high-resolution PNG images for vision analysis.

**Dependencies:**
- `pdf2pic`: Node.js library for PDF-to-image conversion
- `graphicsmagick`: Image processing system
- `ghostscript`: PDF rendering engine (delegate for GraphicsMagick)

**Configuration:**
- **Resolution**: 300 DPI (balance between quality and file size)
- **Format**: PNG (lossless, supports transparency)
- **Page limit**: First 10 pages (most contracts have key terms early)

**Why 300 DPI?**
- Sufficient for text recognition
- Reasonable file size (~500KB-1MB per page)
- Fast processing time
- Good balance for vision models

#### 2. Ollama Integration (`server/_core/ollama.ts`)

Provides API client for local Ollama server.

**Functions:**
- `ollamaVision()`: Analyze single image with vision model
- `ollamaVisionJSON()`: Analyze image and return structured JSON
- `ollamaGenerate()`: Text generation with text models
- `ollamaGenerateJSON()`: Structured text extraction
- `checkOllamaHealth()`: Verify Ollama is running
- `listOllamaModels()`: Get available models

**Configuration:**
- **Base URL**: `http://localhost:11434` (default)
- **Text model**: `qwen2.5:14b`
- **Vision model**: `llava:34b`
- **Temperature**: 0.1 (deterministic output)

#### 3. Contract Parser (`server/contractParser.ts`)

Main extraction logic that orchestrates the entire pipeline.

**Key Functions:**
- `extractContractModel(pdfUrl)`: Main entry point
- `extractAndStoreContractModel(assessmentId, pdfUrl)`: Extract and save to DB
- `updateContractDetails(assessmentId, updates)`: Update extracted data

**Extraction Process:**
1. Download PDF from S3 URL
2. Convert first 10 pages to images
3. Send images to llava:34b with structured prompt
4. Parse JSON response
5. Validate extracted data
6. Calculate confidence scores
7. Store in database

**Prompt Engineering:**

The prompt is carefully designed to extract structured data:

```typescript
const prompt = `
Analyze this solar farm Power Purchase Agreement (PPA) contract and extract:

1. EQUATIONS (performance formulas):
   - Performance Ratio (PR) calculation
   - Availability calculation
   - Energy yield formulas
   - Any other performance metrics

2. PARAMETERS (numerical values):
   - Irradiance thresholds (kWh/m²)
   - Temperature coefficients
   - Degradation rates (%/year)
   - Capacity factors
   - Any other technical parameters

3. TARIFFS (pricing structures):
   - Energy prices ($/MWh)
   - Time-of-use rates
   - Escalation rates
   - Any other pricing terms

4. GUARANTEES (minimum requirements):
   - Minimum performance ratio (%)
   - Minimum availability (%)
   - Minimum energy yield (MWh/year)
   - Any other guaranteed levels

5. UNDEFINED TERMS (terms used but not defined):
   - Flag any terms that are referenced but not clearly defined
   - Examples: "Excluded Period", "Force Majeure", "Commissioning Date"
   - ONLY flag terms that are truly undefined, not standard industry terminology

6. MISSING PARAMETERS (values needed but not found):
   - List any parameters required for calculations but not provided
   - Suggest reasonable default values if possible

7. AMBIGUITIES (unclear or contradictory terms):
   - Flag any terms that have multiple interpretations
   - Note any contradictions between sections

Return JSON with this structure:
{
  "equations": {
    "performanceRatio": "string (formula)",
    "availability": "string (formula)",
    ...
  },
  "parameters": {
    "irradianceThreshold": { "value": number, "unit": "string" },
    ...
  },
  "tariffs": {
    "basePrice": { "value": number, "unit": "string" },
    ...
  },
  "guarantees": {
    "minPerformanceRatio": { "value": number, "unit": "%" },
    ...
  },
  "undefinedTerms": ["term1", "term2"],
  "missingParameters": [
    { "parameter": "string", "suggestedValue": "string" }
  ],
  "ambiguities": [
    { "term": "string", "issue": "string", "interpretations": ["option1", "option2"] }
  ],
  "confidence": {
    "equations": 0.0-1.0,
    "parameters": 0.0-1.0,
    "tariffs": 0.0-1.0,
    "guarantees": 0.0-1.0,
    "overall": 0.0-1.0
  }
}

IMPORTANT:
- Be deterministic: same contract should produce same output
- Only flag truly undefined terms, not standard industry terminology
- Provide confidence scores for each section
- If a value is not found, omit it rather than guessing
`;
```

**Why This Prompt Works:**

1. **Structured sections**: Clear categories for different data types
2. **Examples**: Shows what to look for in each category
3. **JSON schema**: Defines exact output format
4. **Confidence scores**: Allows quality assessment
5. **Undefined terms**: Catches missing definitions
6. **Deterministic**: Emphasizes consistency across runs

---

## File Structure

```
server/
├── _core/
│   ├── ollama.ts              # Ollama API client
│   └── env.ts                 # Environment configuration
├── contractParser.ts          # Main extraction logic
├── pdfToImages.ts             # PDF-to-image conversion
├── db.ts                      # Database queries
└── routers.ts                 # tRPC API endpoints

drizzle/
└── schema.ts                  # Database schema

package.json                   # Dependencies (pdf2pic, graphicsmagick)
```

### Key Files

#### `server/_core/ollama.ts`

```typescript
import { OLLAMA_BASE_URL, OLLAMA_VISION_MODEL, OLLAMA_TEXT_MODEL } from './env';

export async function ollamaVisionJSON<T>(
  imageUrl: string,
  prompt: string,
  model: string = OLLAMA_VISION_MODEL,
  systemPrompt?: string
): Promise<T> {
  // 1. Fetch image from URL
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');

  // 2. Send to Ollama vision API
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system: systemPrompt,
      images: [base64Image],
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for consistency
        num_predict: 4096, // Max tokens
      },
    }),
  });

  const data = await response.json();
  
  // 3. Parse JSON from response
  const jsonMatch = data.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Ollama returned invalid JSON');
  }

  return JSON.parse(jsonMatch[0]);
}
```

#### `server/pdfToImages.ts`

```typescript
import { fromPath } from 'pdf2pic';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export async function convertPdfToImages(pdfPath: string): Promise<string[]> {
  const outputDir = path.join(os.tmpdir(), `pdf-images-${Date.now()}`);
  await fs.mkdir(outputDir, { recursive: true });

  const converter = fromPath(pdfPath, {
    density: 300,        // 300 DPI for quality
    saveFilename: 'page',
    savePath: outputDir,
    format: 'png',
    width: 2480,         // A4 width at 300 DPI
    height: 3508,        // A4 height at 300 DPI
  });

  // Convert first 10 pages
  const images: string[] = [];
  for (let page = 1; page <= 10; page++) {
    try {
      const result = await converter(page);
      if (result.path) {
        images.push(result.path);
      }
    } catch (error) {
      console.log(`[PDF] Page ${page} conversion failed, stopping`);
      break;
    }
  }

  return images;
}
```

#### `server/contractParser.ts`

```typescript
import { ollamaVisionJSON } from './_core/ollama';
import { convertPdfToImages } from './pdfToImages';
import { db, insertCustomAnalysis, updateCustomAnalysis } from './db';

export async function extractContractModel(pdfUrl: string) {
  console.log('[Contract Parser] Starting extraction...');

  // 1. Download PDF
  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const tempPdfPath = `/tmp/contract-${Date.now()}.pdf`;
  await fs.writeFile(tempPdfPath, Buffer.from(pdfBuffer));

  // 2. Convert to images
  console.log('[Contract Parser] Converting PDF to images...');
  const imagePaths = await convertPdfToImages(tempPdfPath);
  console.log(`[Contract Parser] Converted ${imagePaths.length} pages`);

  // 3. Analyze with vision model (only first page for now)
  console.log('[Contract Parser] Analyzing with vision model...');
  const firstImageUrl = `file://${imagePaths[0]}`;
  
  const extractedData = await ollamaVisionJSON<ContractModel>(
    firstImageUrl,
    EXTRACTION_PROMPT,
    undefined, // Use default vision model
    SYSTEM_PROMPT
  );

  // 4. Cleanup temp files
  await fs.unlink(tempPdfPath);
  for (const imagePath of imagePaths) {
    await fs.unlink(imagePath);
  }

  console.log('[Contract Parser] Extraction complete');
  return extractedData;
}
```

---

## Data Flow

### 1. User Uploads Contract PDF

```
Frontend (CustomAnalysis.tsx)
    ↓
[Upload to S3] (storagePut)
    ↓
[Store URL in DB] (contractPdfUrl field)
```

### 2. Backend Extracts Data

```
tRPC Procedure (customAnalysis.extractContract)
    ↓
extractAndStoreContractModel(assessmentId, pdfUrl)
    ↓
[Download PDF from S3]
    ↓
[Convert to images] (pdfToImages.ts)
    ↓
[Analyze with llava:34b] (ollama.ts)
    ↓
[Parse JSON response]
    ↓
[Update database] (db.ts)
```

### 3. User Reviews Extracted Data

```
Frontend (CustomAnalysis.tsx)
    ↓
[Display extracted model]
    ↓
[Show undefined terms, missing params, ambiguities]
    ↓
[User provides clarifications]
    ↓
[Update database] (updateContractDetails)
```

### 4. Model Execution

```
Frontend (clicks "Run Analysis")
    ↓
tRPC Procedure (customAnalysis.runAnalysis)
    ↓
[Load contract model from DB]
    ↓
[Load SCADA + meteo data]
    ↓
[Execute equations] (modelExecutor.ts)
    ↓
[Calculate PR, availability, compliance]
    ↓
[Store results in DB]
```

---

## API Reference

### tRPC Procedures

#### `customAnalysis.extractContract`

Extract contract model from PDF.

**Input:**
```typescript
{
  assessmentId: string;
  contractPdfUrl: string;
}
```

**Output:**
```typescript
{
  equations: {
    performanceRatio: string;
    availability: string;
  };
  parameters: {
    [key: string]: { value: number; unit: string };
  };
  tariffs: {
    [key: string]: { value: number; unit: string };
  };
  guarantees: {
    [key: string]: { value: number; unit: string };
  };
  undefinedTerms: string[];
  missingParameters: Array<{
    parameter: string;
    suggestedValue: string;
  }>;
  ambiguities: Array<{
    term: string;
    issue: string;
    interpretations: string[];
  }>;
  confidence: {
    equations: number;
    parameters: number;
    tariffs: number;
    guarantees: number;
    overall: number;
  };
}
```

#### `customAnalysis.updateContractDetails`

Update extracted contract data with user clarifications.

**Input:**
```typescript
{
  assessmentId: string;
  updates: {
    equations?: object;
    parameters?: object;
    tariffs?: object;
    guarantees?: object;
  };
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

---

## Testing

### Local Testing

1. **Start Ollama:**
   ```bash
   ollama serve
   ```

2. **Pull required model:**
   ```bash
   ollama pull llava:34b
   ```

3. **Upload test contract:**
   - Use the web interface to upload a PDF contract
   - Check browser console for extraction logs

4. **Verify extraction:**
   - Check database for extracted data
   - Review confidence scores
   - Check for undefined terms and missing parameters

### Test Contracts

Create test contracts with known values to verify extraction accuracy:

**Test Case 1: Simple Contract**
- Single PR formula
- Fixed tariff
- Clear guarantees
- Expected: High confidence (>0.9)

**Test Case 2: Complex Contract**
- Multiple equations
- Time-of-use tariffs
- Conditional guarantees
- Expected: Medium confidence (0.7-0.9)

**Test Case 3: Scanned Contract**
- Low-quality scan
- Handwritten annotations
- Expected: Lower confidence (0.5-0.7)

### Debugging

Enable detailed logging:

```typescript
// In contractParser.ts
console.log('[Contract Parser] PDF downloaded:', pdfBuffer.byteLength, 'bytes');
console.log('[Contract Parser] Images converted:', imagePaths.length);
console.log('[Contract Parser] Vision model response:', JSON.stringify(extractedData, null, 2));
```

Check Ollama logs:

```bash
# View Ollama server logs
journalctl -u ollama -f

# Or if running manually
ollama serve
# Logs appear in terminal
```

---

## Deployment

### System Requirements

**Minimum:**
- 32GB RAM
- 50GB free disk space
- Ubuntu 20.04+ / macOS 11+ / Windows 10+

**Recommended:**
- 64GB RAM
- 100GB SSD
- NVIDIA GPU with 16GB+ VRAM

### Installation Steps

1. **Install system dependencies:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install graphicsmagick ghostscript
   
   # macOS
   brew install graphicsmagick ghostscript
   
   # Windows
   choco install graphicsmagick ghostscript
   ```

2. **Install Ollama:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

3. **Pull models:**
   ```bash
   ollama pull llava:34b
   ollama pull qwen2.5:14b
   ```

4. **Configure environment:**
   ```bash
   echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
   echo "OLLAMA_VISION_MODEL=llava:34b" >> .env
   echo "OLLAMA_TEXT_MODEL=qwen2.5:14b" >> .env
   ```

5. **Install Node.js dependencies:**
   ```bash
   pnpm install
   ```

6. **Start services:**
   ```bash
   # Terminal 1: Ollama
   ollama serve
   
   # Terminal 2: Application
   pnpm dev
   ```

### Production Considerations

**Performance:**
- Use GPU acceleration for faster inference
- Consider model quantization (Q4/Q5) for memory savings
- Cache frequently accessed contracts

**Reliability:**
- Add retry logic for Ollama API calls
- Implement fallback to Manus API if Ollama unavailable
- Monitor model response quality

**Security:**
- Keep Ollama on localhost (don't expose to internet)
- Validate PDF files before processing
- Sanitize extracted data before storing

**Monitoring:**
- Log extraction times and confidence scores
- Alert on low confidence extractions
- Track model performance over time

---

## Troubleshooting

### Common Issues

**1. Ollama not responding**
- Check if service is running: `ps aux | grep ollama`
- Restart service: `ollama serve`
- Check port availability: `lsof -i :11434`

**2. Low extraction quality**
- Upgrade to llava:34b if using smaller model
- Increase PDF resolution (300 DPI → 600 DPI)
- Try OCR + text model approach

**3. Out of memory**
- Use smaller model (llava:13b)
- Reduce image resolution
- Process fewer pages at once

**4. Slow processing**
- Enable GPU acceleration
- Use quantized models
- Reduce image size

---

## License

This implementation is part of the MCE Solar Farm Performance Analyzer project.
