# Ollama Setup Guide - ACC Asset Extractor

This guide explains how to set up and use Ollama for local LLM inference in the ACC Asset Extractor application.

## Overview

The ACC Asset Extractor supports **Ollama** as an alternative to the Manus LLM/Vision APIs. Ollama allows you to run AI models locally on your machine, providing:

- **Cost savings** - No API usage fees
- **Privacy** - Data stays on your machine
- **Offline capability** - Works without internet connection
- **Customization** - Choose and configure your own models

## Features

### ✅ PDF Asset Extraction with Vision Models

The asset extractor uses **vision models** to analyze PDF documents:

1. **PDF-to-Image Conversion**: Converts each PDF page to a 300 DPI PNG image
2. **Vision Analysis**: Ollama vision model analyzes the image to extract assets
3. **Structured Output**: Returns JSON with asset details, specifications, and confidence scores

**Supported Models:**
- `llava:34b` - Best accuracy for document extraction (recommended)
- `llava:13b` - Good balance of speed and accuracy
- `llava:7b` - Fastest, suitable for simple documents

## Installation

### 1. Install Ollama

**macOS / Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [https://ollama.com/download](https://ollama.com/download)

### 2. Install PDF Processing Dependencies (REQUIRED)

The asset extractor converts PDFs to images before analysis. This requires **GraphicsMagick** and **Ghostscript**.

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

### 3. Pull Required Models

```bash
# Vision model for document analysis (REQUIRED - 20GB download)
ollama pull llava:34b

# Alternative: Smaller/faster vision models
ollama pull llava:13b  # 7.4GB - good balance
ollama pull llava:7b   # 4.7GB - fastest

# Text model for chat (optional - 9GB download)
ollama pull qwen2.5:14b
```

**Model Selection Guide:**

| Model | Size | Speed | Quality | RAM Required |
|-------|------|-------|---------|--------------|
| llava:34b | 20GB | Slow (30-60s/page) | Excellent (95%+) | 32GB+ |
| llava:13b | 7.4GB | Medium (15-30s/page) | Good (85-90%) | 16GB+ |
| llava:7b | 4.7GB | Fast (10-20s/page) | Fair (70-80%) | 8GB+ |
| qwen2.5:14b | 9GB | Fast | Excellent | 16GB+ |

**Recommendation:**
- For best results: `llava:34b`
- For balanced performance: `llava:13b`
- For limited hardware: `llava:7b`

### 4. Start Ollama Server

```bash
ollama serve
```

This starts the Ollama API server on `http://localhost:11434`.

**Note**: On macOS/Windows, Ollama runs as a background service automatically after installation.

## Configuration

### Environment Variables

Create or update `.env` file in the webapp directory:

```bash
# Database
DATABASE_URL="mysql://root:password@localhost:3306/acc_assets"
NODE_ENV=development

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TEXT_MODEL=qwen2.5:14b
OLLAMA_VISION_MODEL=llava:34b
```

### Model Configuration

You can change models by updating the environment variables:

```bash
# Use faster but less accurate model
OLLAMA_VISION_MODEL=llava:13b

# Or use even faster model
OLLAMA_VISION_MODEL=llava:7b
```

## Usage

### Starting the Application

```bash
cd tools/acc-asset-extractor/webapp

# Install dependencies (first time only)
pnpm install

# Start development server
pnpm dev
```

The application will automatically use Ollama if it's running and configured.

### Extraction Process

1. **Upload Documents**: Upload PDF engineering documents through the web interface
2. **Start Extraction**: Click "Extract Assets" to begin processing
3. **PDF Conversion**: Each PDF page is converted to a 300 DPI PNG image
4. **Vision Analysis**: Ollama analyzes each page image to extract assets
5. **Results**: Extracted assets appear in the validation table with confidence scores

### Performance Expectations

**Processing Time** (per page):
- llava:34b: 30-60 seconds
- llava:13b: 15-30 seconds
- llava:7b: 10-20 seconds

**Accuracy**:
- llava:34b: Excellent (95%+ for clear documents)
- llava:13b: Good (85-90% for clear documents)
- llava:7b: Fair (70-80% for clear documents)

**Hardware Requirements**:
- llava:34b: 32GB+ RAM, GPU recommended
- llava:13b: 16GB+ RAM
- llava:7b: 8GB+ RAM

## Troubleshooting

### "Cannot connect to Ollama"

**Cause**: Ollama server is not running.

**Solution**:
```bash
ollama serve
```

### "Model not found"

**Cause**: Required model hasn't been downloaded.

**Solution**:
```bash
ollama pull llava:34b
```

### "PDF conversion failed"

**Cause**: GraphicsMagick or Ghostscript not installed.

**Solution**: Follow step 2 in Installation section above.

**Verify installation:**
```bash
gm version
gs -version
```

### "Out of memory"

**Cause**: Model is too large for available RAM.

**Solution**: Use a smaller model:
```bash
# In .env
OLLAMA_VISION_MODEL=llava:13b
```

Or add swap space:
```bash
# Linux
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Slow Processing

**Causes**:
- Large model on CPU
- High-resolution PDFs
- Many pages

**Solutions**:
1. Use GPU acceleration (NVIDIA/AMD)
2. Use smaller model (llava:13b or llava:7b)
3. Reduce PDF resolution (edit `server/ollamaExtraction.ts`, change density from 300 to 150)

## Advanced Configuration

### GPU Acceleration

Ollama automatically uses GPU if available. To verify:

```bash
ollama ps
```

Look for GPU utilization in the output.

**Check GPU usage:**
```bash
# NVIDIA
watch -n 1 nvidia-smi

# AMD
watch -n 1 rocm-smi
```

### Custom Models

You can use custom fine-tuned models:

```bash
# Pull your custom model
ollama pull your-username/custom-llava

# Update .env
OLLAMA_VISION_MODEL=your-username/custom-llava
```

### Batch Processing

For large document sets, consider:

1. Process during off-hours
2. Use multiple Ollama instances on different ports
3. Implement queue system for parallel processing

## Fallback to Manus API

If Ollama is not available, the application can fall back to Manus APIs:

```bash
# In .env, add:
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key
```

The application will automatically use Manus APIs if Ollama connection fails.

## Comparison: Ollama vs Manus API

| Feature | Ollama | Manus API |
|---------|--------|-----------|
| Cost | Free | Pay per use |
| Privacy | Local | Cloud |
| Speed | Depends on hardware | Fast |
| Setup | Complex | Simple |
| Offline | Yes | No |
| Accuracy | Model-dependent | High |
| PDF Support | Yes (via vision models) | Yes |

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [LLaVA Model Card](https://ollama.com/library/llava)
- [Qwen2.5 Model Card](https://ollama.com/library/qwen2.5)
- [GraphicsMagick Documentation](http://www.graphicsmagick.org/)
- [Solar Analyzer Ollama Setup](../../performance-assessment/solar-analyzer/OLLAMA_SETUP.md) - Similar implementation

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Ollama logs: `ollama logs`
3. Check application logs in the console
4. Open an issue on the GitHub repository
