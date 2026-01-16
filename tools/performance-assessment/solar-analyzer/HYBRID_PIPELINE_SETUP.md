# Hybrid OCR Pipeline Setup Guide

This guide explains how to set up the hybrid OCR pipeline for contract extraction using Tesseract (prose text), Pix2Text (LaTeX equations), and Qwen (semantic interpretation).

## Architecture

```
PDF Document
 ├─→ Render to images (300 DPI)
 ├─→ Tesseract OCR → Extract prose text + detect equation regions
 ├─→ Crop equation regions → Upscale to 200px height
 ├─→ Pix2Text LaTeX OCR → Extract LaTeX from equations
 └─→ Qwen 2.5:14b → Interpret contract terms + build computational AST
```

## Prerequisites

### 1. Node.js Dependencies

```bash
cd tools/performance-assessment/solar-analyzer
pnpm install
```

This installs:
- `sharp` - Image processing for cropping and upscaling
- `tesseract.js` - OCR for prose text extraction
- Other project dependencies

### 2. Python Dependencies

**Option A: System-wide installation (Linux/Mac)**
```bash
pip install pix2text
```

**Option B: User installation (Windows)**
```bash
pip install --user pix2text
```

**Option C: Virtual environment (Recommended for Windows)**
```bash
# Create virtual environment
python -m venv ocr-env

# Activate (Windows)
ocr-env\Scripts\activate

# Activate (Linux/Mac)
source ocr-env/bin/activate

# Install Pix2Text
pip install pix2text
```

### 3. Ollama with Qwen Model

Install Ollama and download the Qwen 2.5:14b model:

```bash
# Install Ollama (see https://ollama.ai)
# Then pull the model
ollama pull qwen2.5:14b
```

## Pix2Text vs RapidLaTeXOCR

**Why Pix2Text?**
- ✅ Better Windows support (no build dependency issues)
- ✅ More mature project (2.8k stars, actively maintained)
- ✅ Same ONNX-based architecture (lightweight, CPU-friendly)
- ✅ Supports 80+ languages for text recognition
- ✅ Can handle mixed text + math documents
- ✅ Easier installation (`pip install pix2text`)

**Comparison:**
| Feature | Pix2Text | RapidLaTeXOCR |
|---------|----------|---------------|
| Installation | ✅ Simple | ❌ Build errors on Windows |
| Windows Support | ✅ Full | ❌ Broken dependencies |
| Model Size | ~50MB | ~50MB |
| Backend | ONNX Runtime | ONNX Runtime |
| LaTeX Accuracy | High | High |
| Maintenance | Active | Less active |

## Testing the Pipeline

### 1. Test Pix2Text Installation

```bash
# Test Python import
python -c "from pix2text import LatexOCR; print('Pix2Text installed successfully')"
```

### 2. Run the Test Script

```bash
cd tools/performance-assessment/solar-analyzer
node scripts/test-hybrid-parser.mjs /path/to/TestSchedule.pdf
```

Expected output:
```
=== Hybrid Contract Parser V3 Test ===
Processing: /path/to/TestSchedule.pdf

[1/4] Converting PDF to images...
✓ Rendered 3 pages

[2/4] Extracting text with Tesseract OCR...
✓ Extracted 2,451 words

[3/4] Detecting and extracting equations...
✓ Found 12 equation regions
✓ Extracted LaTeX from 12 equations

[4/4] Interpreting contract with Qwen...
✓ Extracted contract model

=== Results ===
Contract Type: Performance Ratio Agreement
Variables: PR, Pexp, Pstc, Irr, ...
Equations: 12 LaTeX formulas
Processing Time: 45.2s
```

### 3. Verify LaTeX Extraction

Check the output for LaTeX formulas like:
```latex
PR = \frac{P_{exp}}{P_{stc}} \times \frac{Irr_{stc}}{Irr_{actual}}
```

## Troubleshooting

### Pix2Text Installation Fails

**Error: "No module named 'pix2text'"**
- Solution: Ensure Python 3.6+ is installed
- Try: `pip3 install pix2text` or `python3 -m pip install pix2text`

**Error: "Could not find a version that satisfies the requirement"**
- Solution: Upgrade pip: `pip install --upgrade pip`
- Then retry: `pip install pix2text`

### Python Not Found in Node.js

**Error: "Failed to spawn Python"**
- Solution: Ensure `python3` is in PATH
- Windows: Add Python to system PATH or use full path in `latexOCR.ts`

### Ollama Not Running

**Error: "Failed to connect to Ollama"**
- Solution: Start Ollama service: `ollama serve`
- Verify model is downloaded: `ollama list`

### Low LaTeX Confidence

**Issue: Extracted LaTeX has low confidence scores**
- Check equation image quality (should be upscaled to 200px height)
- Verify equation regions are correctly detected
- Try adjusting detection thresholds in `equationDetection.ts`

## Performance Optimization

### 1. Parallel Processing

For large PDFs, process pages in parallel:
```typescript
const results = await Promise.all(
  pages.map(page => extractEquationsFromPage(page))
);
```

### 2. Caching

Cache Pix2Text model initialization:
```python
# In latexOCR.ts Python script
latex_ocr = LatexOCR()  # Initialize once
# Reuse for multiple images
```

### 3. Batch Processing

Process multiple equations in a single Python call:
```python
results = [latex_ocr(img) for img in image_paths]
```

## Module Reference

### `server/equationDetection.ts`
Detects math regions using heuristics:
- Symbol patterns (`∑`, `∫`, `√`, `±`, etc.)
- Subscripts and superscripts
- Fraction-like patterns
- Low OCR confidence (indicates complex notation)

### `server/imageCropping.ts`
Crops and upscales equation regions:
- Extracts bounding box from page image
- Upscales to 200px height for better OCR
- Adds padding to prevent edge clipping
- Uses Sharp for high-quality image processing

### `server/latexOCR.ts`
Wrapper for Pix2Text Python API:
- Spawns Python subprocess with Pix2Text
- Passes equation image path
- Returns LaTeX string
- Estimates confidence based on structure

### `server/contractParserV3.ts`
Main orchestrator:
1. Converts PDF to images
2. Runs Tesseract OCR on each page
3. Detects equation regions
4. Crops and extracts LaTeX
5. Sends to Qwen for interpretation
6. Returns structured contract model

## Next Steps

1. **Fine-tune equation detection**: Adjust heuristics in `equationDetection.ts` based on your contract patterns
2. **Add fallback handling**: Implement graceful degradation when Pix2Text fails
3. **Improve confidence scoring**: Enhance `estimateConfidence()` with domain-specific checks
4. **Add validation**: Verify LaTeX syntax before passing to Qwen
5. **Optimize performance**: Implement caching and parallel processing

## References

- [Pix2Text Documentation](https://pix2text.readthedocs.io/)
- [Pix2Text GitHub](https://github.com/breezedeus/Pix2Text)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Ollama Documentation](https://ollama.ai/docs)
- [Qwen Model Card](https://ollama.ai/library/qwen2.5)
