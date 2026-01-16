# Ollama Integration Setup Guide

This guide explains how to set up and use Ollama for local LLM inference in the Solar Analyzer application.

## Overview

The Solar Analyzer now supports **Ollama** as an alternative to the Manus LLM/Vision APIs. Ollama allows you to run AI models locally on your machine, providing:

- **Cost savings** - No API usage fees
- **Privacy** - Data stays on your machine
- **Offline capability** - Works without internet connection
- **Customization** - Choose and configure your own models

## Integrated Features

### ✅ Fully Integrated (Ready to Use)

1. **Contract Parser** (`server/contractParser.ts`)
   - Model: `llava:34b` (vision model for document understanding)
   - Converts PDF pages to 300 DPI images for analysis
   - Extracts equations, tariffs, guarantees from PPA PDFs (including scanned documents)
   - Returns structured JSON with performance model
   - **Note**: Requires GraphicsMagick + Ghostscript for PDF processing

2. **Satellite Vision Analysis** (`server/satelliteVisionAnalysis.ts`)
   - Model: `llava:13b`
   - Analyzes satellite imagery for tracking type, GCR, pitch
   - Detects equipment and estimates configuration

### ⚠️ Requires Redesign (Not Yet Compatible)

3. **Satellite Config Analysis** (`server/satelliteConfigAnalysis.ts`)
   - Uses iterative function calling to request multiple images
   - Ollama doesn't support function calling as robustly
   - **Workaround**: Continue using Manus API for now

4. **PCU Detection** (`server/satellitePCUDetection.ts`)
   - Uses iterative function calling for multi-stage detection
   - Requires workflow redesign for Ollama compatibility
   - **Workaround**: Continue using Manus API for now

## Installation

### 1. Install Ollama

**macOS / Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [https://ollama.com/download](https://ollama.com/download)

### 1.5. Install PDF Processing Dependencies (REQUIRED)

The contract parser converts PDFs to images before analysis. This requires GraphicsMagick and Ghostscript.

**Windows:**
```powershell
# Using Chocolatey (recommended)
choco install graphicsmagick
choco install ghostscript

# Verify installation
gm version
gswin64c -version
```

**macOS:**
```bash
brew install graphicsmagick
brew install ghostscript

# Verify installation
gm version
gs -version
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install graphicsmagick ghostscript

# Verify installation
gm version
gs -version
```

**Why these are needed:**
- **GraphicsMagick**: Converts PDF pages to PNG images at 300 DPI
- **Ghostscript**: PDF delegate for GraphicsMagick (handles PDF rendering)

### 2. Pull Required Models

```bash
# Vision model for contract parsing (REQUIRED - 20GB download)
ollama pull llava:34b

# Vision model for satellite image analysis
ollama pull llava:13b

# Text model for general tasks
ollama pull qwen2.5:14b

# Optional: Smaller/faster alternatives
ollama pull llava:13b          # Faster contract parsing (less accurate)
ollama pull llava:7b           # Faster satellite analysis
ollama pull llama3.1:8b        # Faster text model
```

**Important**: The `llava:34b` model is ~20GB and requires 32GB+ RAM for contract extraction. If you have limited resources, use `llava:13b` instead (update `OLLAMA_VISION_MODEL` in `.env`).

### 3. Verify Installation

```bash
# Check Ollama is running
ollama list

# Test text generation
ollama run qwen2.5:14b "Hello, test"

# Test vision (requires image)
ollama run llava:13b "Describe this image" --image path/to/image.jpg
```

## Configuration

### Environment Variables
Add to your `.env` file:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TEXT_MODEL=qwen2.5:14b
OLLAMA_VISION_MODEL=llava:34b
```

**Defaults** (if not specified):
- `OLLAMA_BASE_URL`: `http://localhost:11434`
- `OLLAMA_TEXT_MODEL`: `qwen2.5:14b`
- `OLLAMA_VISION_MODEL`: `llava:34b``

### Model Selection

You can switch models by changing the environment variables:

```env
# Use faster models (if you have limited RAM)
OLLAMA_TEXT_MODEL=llama3.1:8b
OLLAMA_VISION_MODEL=llava:13b

# Use larger models (if you have 64GB+ RAM)
OLLAMA_TEXT_MODEL=qwen2.5:32b
OLLAMA_VISION_MODEL=llava:34b  # Default for contract parsing
```

**Model comparison for contract parsing:**

| Model | Size | RAM Required | Accuracy | Speed |
|-------|------|--------------|----------|-------|
| `llava:34b` | ~20GB | 32GB+ | ⭐⭐⭐⭐⭐ | Slow (3-5 min) |
| `llava:13b` | ~8GB | 16GB+ | ⭐⭐⭐ | Medium (1-2 min) |
| `llama3.2-vision:11b` | ~7GB | 16GB+ | ⭐ | Fast (30-60 sec) |

**Recommendation**: Use `llava:34b` for production contract extraction. It provides significantly better accuracy for complex documents.

## Usage

### Contract Parsing

```typescript
import { extractContractModel } from './server/contractParser';

const model = await extractContractModel(contractPdfUrl);
// Returns: equations, parameters, tariffs, guarantees, etc.
```

**How it works:**
1. Fetches PDF from URL
2. Converts each page to 300 DPI PNG image using GraphicsMagick
3. Analyzes first 10 pages with llava:34b vision model
4. Extracts structured data (equations, parameters, tariffs, guarantees)
5. Returns parsed contract model with confidence scores

**Performance:**
- **llava:34b**: ~3-5 minutes per contract (high accuracy, handles scanned PDFs)
- **llava:13b**: ~1-2 minutes (medium accuracy, may miss complex equations)
- **llama3.2-vision:11b**: ~30-60 seconds (low accuracy, not recommended)

**Why vision models?**
- Handles scanned PDFs (no native text layer)
- Understands document layout and structure
- Extracts equations from images
- More robust than text-only models

### Satellite Image Analysis

```typescript
import { analyzeSolarFarmSatellite } from './server/satelliteVisionAnalysis';

const analysis = await analyzeSolarFarmSatellite(
  "Clare Solar Farm",
  -34.123,
  138.456,
  100 // capacity in MW
);
// Returns: tracking type, GCR, pitch, equipment count, etc.
```

**How it works:**
1. Fetches satellite image from Google Maps
2. Converts to base64
3. Sends to Ollama llava:13b with analysis prompt
4. Returns structured configuration data

**Performance:**
- **llava:13b**: ~45-90 seconds per image (accurate)
- **llava:7b**: ~20-40 seconds (faster, less accurate)

## API Reference

### Core Functions

#### `ollamaGenerate(model, prompt, systemPrompt?, options?)`
Generate text using Ollama.

```typescript
const response = await ollamaGenerate(
  "qwen2.5:14b",
  "Explain solar tracking systems",
  "You are a solar energy expert",
  { temperature: 0.7 }
);
```

#### `ollamaGenerateJSON<T>(model, prompt, systemPrompt?, options?)`
Generate structured JSON output.

```typescript
const data = await ollamaGenerateJSON<{ type: string, angle: number }>(
  "qwen2.5:14b",
  "Extract tracking type and tilt angle from this description: ...",
  "You are a solar analyst"
);
```

#### `ollamaVision(imageUrl, prompt, model?, systemPrompt?)`
Analyze an image with vision model.

```typescript
const description = await ollamaVision(
  "https://example.com/solar-farm.jpg",
  "Describe the solar tracking system in this image",
  "llava:13b"
);
```

#### `ollamaVisionJSON<T>(imageUrl, prompt, model?, systemPrompt?)`
Analyze an image and return structured JSON.

```typescript
const config = await ollamaVisionJSON<{ trackingType: string, gcr: number }>(
  imageUrl,
  "Analyze this solar farm and return tracking type and GCR",
  "llava:13b"
);
```

### Utility Functions

#### `checkOllamaHealth()`
Check if Ollama is running and accessible.

```typescript
const isHealthy = await checkOllamaHealth();
if (!isHealthy) {
  console.error("Ollama is not running!");
}
```

#### `listOllamaModels()`
List all available Ollama models.

```typescript
const models = await listOllamaModels();
console.log("Available models:", models);
// ["qwen2.5:14b", "llava:13b", "llama3.1:8b", ...]
```

## Performance Tuning

### Model Parameters

Control generation behavior with options:

```typescript
const response = await ollamaGenerate(
  "qwen2.5:14b",
  prompt,
  systemPrompt,
  {
    temperature: 0.1,     // Lower = more deterministic (0.0-1.0)
    top_p: 0.9,          // Nucleus sampling threshold
    top_k: 40,           // Top-k sampling
    num_predict: 4096,   // Max tokens to generate
  }
);
```

**Recommended settings:**
- **Contract parsing**: `temperature: 0.1` (consistency)
- **Creative writing**: `temperature: 0.7-0.9` (variety)
- **JSON output**: `temperature: 0.0-0.2` (reliability)

### Hardware Requirements

**Minimum:**
- 16 GB RAM
- 8 GB available for Ollama
- CPU-only mode (slow)

**Recommended:**
- 32 GB RAM
- NVIDIA GPU with 8+ GB VRAM
- CUDA support enabled

**Optimal:**
- 64 GB RAM
- NVIDIA GPU with 24+ GB VRAM (RTX 4090, A6000)
- NVMe SSD for model storage

### GPU Acceleration

Ollama automatically uses GPU if available. Check with:

```bash
ollama ps
# Shows running models and GPU usage
```

**Enable GPU on Linux:**
```bash
# Install NVIDIA drivers and CUDA toolkit
sudo apt install nvidia-driver-535 nvidia-cuda-toolkit

# Verify GPU is detected
nvidia-smi
```

## Troubleshooting

### Ollama Not Running

**Error:** `Failed to fetch http://localhost:11434`

**Solution:**
```bash
# Start Ollama service
ollama serve

# Or check if it's running
ps aux | grep ollama
```

### Model Not Found

**Error:** `model 'qwen2.5:14b' not found`

**Solution:**
```bash
# Pull the model
ollama pull qwen2.5:14b

# Verify it's installed
ollama list
```

### Out of Memory

**Error:** `failed to allocate memory`

**Solution:**
1. Use smaller models: `llama3.1:8b` instead of `qwen2.5:14b`
2. Close other applications
3. Increase system swap space
4. Use quantized models: `qwen2.5:14b-q4` (4-bit quantization)

### Slow Performance

**Issue:** Generation takes too long

**Solutions:**
1. **Use GPU**: Ensure CUDA/Metal is enabled
2. **Smaller models**: Switch to 7B-8B models
3. **Reduce context**: Limit input size
4. **Quantization**: Use Q4/Q5 quantized models

```bash
# Pull quantized version (faster, slightly less accurate)
ollama pull qwen2.5:14b-q4_K_M
```

### JSON Parsing Errors

**Error:** `Ollama returned invalid JSON`

**Solution:**
1. Lower temperature: `temperature: 0.0-0.1`
2. Add explicit JSON format instruction in prompt
3. Use `format: 'json'` parameter
4. Try different model (Qwen is better at JSON than Llama)

### PDF Processing Errors

**Error:** `Command failed: gm identify` or `Postscript delegate failed`

**Cause:** GraphicsMagick or Ghostscript not installed

**Solution (Windows):**
```powershell
choco install graphicsmagick
choco install ghostscript

# Restart terminal and verify
gm version
gswin64c -version
```

**Solution (macOS):**
```bash
brew install graphicsmagick ghostscript
```

**Solution (Linux):**
```bash
sudo apt-get install graphicsmagick ghostscript
```

### Contract Extraction Quality Issues

**Issue:** Model returns garbage like `Pr / Pr / Pr...` or very low confidence scores

**Cause:** Model not capable enough for complex document understanding

**Solutions:**
1. **Upgrade to llava:34b** (recommended):
   ```bash
   ollama pull llava:34b
   ```
   Update `.env`: `OLLAMA_VISION_MODEL=llava:34b`

2. **Try OCR + text model approach** (alternative):
   - Use Tesseract OCR to extract text from PDF
   - Feed text to qwen2.5:14b for structured extraction
   - More reliable for text-heavy documents

3. **Reduce image resolution** if model runs out of memory:
   - Edit `server/pdfToImages.ts`
   - Change `density: 300` to `density: 150`

### Windows-Specific Issues

**Issue:** `Cannot find package 'pdf2pic'` or module resolution errors

**Solution:**
```powershell
# Delete lockfile and reinstall
del pnpm-lock.yaml
git checkout origin/master -- pnpm-lock.yaml
pnpm install
```

**Issue:** `ECONNREFUSED` when connecting to Ollama

**Solution:**
```powershell
# Check if Ollama is running
Get-Process ollama

# If not running, start it
ollama serve

# Verify API is accessible
curl http://localhost:11434/api/tags
```

## Comparison: Ollama vs Manus API

| Feature | Ollama | Manus API |
|---------|--------|-----------|
| **Cost** | Free (local) | Pay per token |
| **Privacy** | 100% local | Data sent to cloud |
| **Speed** | Depends on hardware | Fast (cloud GPU) |
| **Offline** | ✅ Yes | ❌ No |
| **Setup** | Install + download models | Just API key |
| **Function Calling** | ⚠️ Limited | ✅ Full support |
| **Model Selection** | Any Ollama model | GPT-4, Claude, etc. |
| **Consistency** | ✅ Deterministic | ✅ Deterministic |

## Migration Strategy

### Hybrid Approach (Recommended)

Use Ollama for some features, Manus API for others:

```typescript
// Use Ollama for contract parsing (cost savings)
const model = await extractContractModel(contractUrl); // Uses Ollama

// Use Manus API for iterative satellite analysis (function calling)
const config = await analyzeConfigurationOnly(lat, lon); // Uses Manus API
```

### Full Ollama Migration

To fully migrate to Ollama:

1. ✅ **Contract parsing** - Already integrated
2. ✅ **Basic satellite vision** - Already integrated
3. ⚠️ **Config analysis** - Needs redesign (remove function calling)
4. ⚠️ **PCU detection** - Needs redesign (remove function calling)

**Redesign approach:**
- Replace iterative function calling with single-shot analysis
- Pre-fetch all required images before LLM call
- Use multi-image input instead of sequential requests

## Implementation Notes

### Recent Changes (2026-01-16)

**✅ Switched from text-only to vision models for contract parsing:**
- Previous: `qwen2.5:14b` (text model) - failed on scanned PDFs
- Current: `llava:34b` (vision model) - handles scanned + native PDFs

**✅ Added PDF-to-image conversion pipeline:**
- Uses `pdf2pic` + GraphicsMagick + Ghostscript
- Converts PDF pages to 300 DPI PNG images
- Sends images to vision model for analysis

**✅ Tested models:**
- `llama3.2-vision:11b`: ❌ Poor quality (hallucinated formulas)
- `llava:13b`: ⚠️ Medium quality (misses complex equations)
- `llava:34b`: ✅ High quality (recommended)

**Why vision models for contracts?**
- Many contracts are scanned PDFs (no text layer)
- Vision models understand document layout
- Can extract equations from images
- More robust than OCR + text model

### Alternative Approach: OCR + Text Model

If vision models don't work well:

1. **Extract text with Tesseract OCR:**
   ```bash
   sudo apt-get install tesseract-ocr
   ```

2. **Feed text to qwen2.5:14b:**
   - Faster processing
   - More reliable structured extraction
   - Better for text-heavy documents

3. **Trade-offs:**
   - Misses visual elements (charts, diagrams)
   - May struggle with complex layouts
   - Requires good OCR quality

## Future Enhancements

- [ ] Add fallback to Manus API if Ollama unavailable
- [ ] Implement OCR + text model approach as alternative
- [ ] Add caching for repeated analyses
- [ ] Add model performance benchmarking
- [ ] Support for custom fine-tuned models
- [ ] Batch processing for multiple contracts/sites
- [ ] Redesign config/PCU detection for Ollama compatibility
- [ ] Add progress indicators for long-running extractions

## Support

For issues or questions:
- Ollama docs: https://ollama.com/docs
- Solar Analyzer repo: https://github.com/robachamilton-afk/mce-tools
- Ollama models: https://ollama.com/library

## License

Ollama is MIT licensed. Models have their own licenses - check before commercial use.
