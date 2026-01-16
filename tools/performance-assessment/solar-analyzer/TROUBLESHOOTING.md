# Ollama Integration Troubleshooting Guide

This guide covers common issues encountered when using Ollama for local LLM processing in the Solar Farm Performance Analyzer, with special focus on Windows compatibility.

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [PDF Processing Errors](#pdf-processing-errors)
3. [Model Quality Issues](#model-quality-issues)
4. [Performance Problems](#performance-problems)
5. [Windows-Specific Issues](#windows-specific-issues)
6. [Alternative Approaches](#alternative-approaches)

---

## Connection Issues

### Error: `ECONNREFUSED` - Cannot connect to Ollama

**Symptoms:**
```
[Ollama] Chat API error: TypeError: fetch failed
[cause]: AggregateError [ECONNREFUSED]
```

**Cause:** Ollama service is not running

**Solutions:**

**Linux/macOS:**
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start Ollama service
ollama serve

# Or use systemd (Linux only)
sudo systemctl start ollama
sudo systemctl enable ollama  # Auto-start on boot
```

**Windows:**
```powershell
# Check if Ollama is running
Get-Process ollama

# Start Ollama (should auto-start after installation)
# If not, run from Start Menu or:
& "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe" serve

# Or restart the Ollama service
Restart-Service Ollama
```

**Verify connection:**
```bash
# Test API endpoint
curl http://localhost:11434/api/tags

# Should return JSON with installed models
```

---

### Error: Wrong Ollama URL

**Symptoms:**
```
Failed to fetch http://localhost:11434
Connection timeout
```

**Cause:** Ollama running on different port or host

**Solutions:**

1. **Check Ollama configuration:**
   ```bash
   # Default port is 11434
   # Check if Ollama is listening
   netstat -an | grep 11434  # Linux/macOS
   netstat -an | findstr 11434  # Windows
   ```

2. **Update environment variable:**
   ```bash
   # If Ollama is on different port
   echo "OLLAMA_BASE_URL=http://localhost:PORT" >> .env
   
   # If Ollama is on different machine
   echo "OLLAMA_BASE_URL=http://192.168.1.100:11434" >> .env
   ```

3. **Restart application:**
   ```bash
   pnpm dev
   ```

---

## PDF Processing Errors

### Error: `Command failed: gm identify`

**Symptoms:**
```
Error: Command failed: gm identify
gm: Unable to open file
```

**Cause:** GraphicsMagick not installed or not in PATH

**Solutions:**

**Windows:**
```powershell
# Install with Chocolatey
choco install graphicsmagick

# Verify installation
gm version

# If not in PATH, add manually:
$env:PATH += ";C:\Program Files\GraphicsMagick-1.3.40-Q16"
```

**macOS:**
```bash
brew install graphicsmagick
gm version
```

**Linux:**
```bash
sudo apt-get install graphicsmagick
gm version
```

---

### Error: `Postscript delegate failed`

**Symptoms:**
```
Error: Postscript delegate failed
gm convert: Postscript delegate failed
```

**Cause:** Ghostscript not installed (required for PDF processing)

**Solutions:**

**Windows:**
```powershell
# Install with Chocolatey
choco install ghostscript

# Verify installation
gswin64c -version

# If not in PATH, add manually:
$env:PATH += ";C:\Program Files\gs\gs10.02.1\bin"
```

**macOS:**
```bash
brew install ghostscript
gs -version
```

**Linux:**
```bash
sudo apt-get install ghostscript
gs -version
```

**Verify GraphicsMagick can use Ghostscript:**
```bash
gm version | grep Ghostscript
# Should show: Ghostscript (gs) 10.02
```

---

### Error: `Cannot find package 'pdf2pic'`

**Symptoms:**
```
Error: Cannot find package 'pdf2pic'
Module not found: pdf2pic
```

**Cause:** npm dependencies not installed or pnpm-lock.yaml out of sync

**Solutions:**

**Windows:**
```powershell
# Delete lockfile and reinstall
del pnpm-lock.yaml
git checkout origin/master -- pnpm-lock.yaml
pnpm install

# If still failing, clear pnpm cache
pnpm store prune
pnpm install --force
```

**Linux/macOS:**
```bash
rm pnpm-lock.yaml
git checkout origin/master -- pnpm-lock.yaml
pnpm install
```

---

### Error: `image: unknown format` (PDF sent directly to vision model)

**Symptoms:**
```
[Ollama] Vision API error: image: unknown format
```

**Cause:** Vision model received PDF file instead of image

**Solution:** This should not happen if using the current implementation (PDF-to-image conversion). If it does:

1. **Verify pdfToImages.ts is being used:**
   ```typescript
   // In contractParser.ts
   import { convertPdfToImages } from './pdfToImages';
   
   const imagePaths = await convertPdfToImages(tempPdfPath);
   ```

2. **Check image conversion is working:**
   ```bash
   # Test GraphicsMagick manually
   gm convert -density 300 contract.pdf contract.png
   ```

3. **Verify image files exist:**
   ```typescript
   console.log('[PDF] Converted images:', imagePaths);
   // Should show array of file paths
   ```

---

## Model Quality Issues

### Issue: Low confidence scores (<0.5)

**Symptoms:**
- Extraction confidence below 50%
- Many undefined terms flagged
- Missing critical parameters

**Causes:**
1. Model not capable enough (llama3.2-vision:11b)
2. Poor PDF quality (low resolution scan)
3. Complex document layout

**Solutions:**

**1. Upgrade to larger model:**
```bash
# Pull llava:34b (recommended)
ollama pull llava:34b

# Update environment
echo "OLLAMA_VISION_MODEL=llava:34b" >> .env

# Restart application
pnpm dev
```

**2. Increase PDF resolution:**
```typescript
// In server/pdfToImages.ts
const converter = fromPath(pdfPath, {
  density: 600,  // Increase from 300 to 600 DPI
  // ... other options
});
```

**3. Process more pages:**
```typescript
// In server/contractParser.ts
for (let page = 1; page <= 20; page++) {  // Increase from 10 to 20
  // ...
}
```

---

### Issue: Model hallucinating (returns garbage)

**Symptoms:**
```json
{
  "equations": {
    "performanceRatio": "Pr / Pr / Pr / Pr / Pr / Pr..."
  }
}
```

**Cause:** Model repeating patterns instead of extracting real data

**Solutions:**

**1. Switch to better model:**
```bash
# llama3.2-vision:11b is known to hallucinate
# Use llava:34b instead
ollama pull llava:34b
```

**2. Lower temperature:**
```typescript
// In server/_core/ollama.ts
options: {
  temperature: 0.0,  // More deterministic (was 0.1)
  num_predict: 4096,
}
```

**3. Try OCR + text model approach:**
See [Alternative Approaches](#alternative-approaches) section below.

---

### Issue: Inconsistent results (same contract, different output)

**Symptoms:**
- Running extraction twice gives different results
- Undefined terms list changes between runs
- Confidence scores vary significantly

**Causes:**
1. Temperature too high (non-deterministic)
2. Model not following instructions
3. Prompt ambiguity

**Solutions:**

**1. Lower temperature:**
```typescript
options: {
  temperature: 0.0,  // Completely deterministic
}
```

**2. Improve prompt specificity:**
```typescript
const prompt = `
IMPORTANT: Be deterministic. Same contract should produce same output.

ONLY flag terms that are truly undefined:
- ✅ Flag: "Excluded Period" if not defined in contract
- ❌ Don't flag: "Performance Ratio" (standard industry term)
- ❌ Don't flag: "Force Majeure" (standard legal term)

...
`;
```

**3. Use seed for reproducibility:**
```typescript
options: {
  temperature: 0.0,
  seed: 42,  // Fixed seed for deterministic output
}
```

---

## Performance Problems

### Issue: Extraction takes too long (>10 minutes)

**Symptoms:**
- Contract extraction timing out
- Application becomes unresponsive
- High CPU usage

**Causes:**
1. Using CPU instead of GPU
2. Model too large for available RAM
3. Processing too many pages

**Solutions:**

**1. Enable GPU acceleration:**

**Linux:**
```bash
# Install NVIDIA drivers
sudo apt install nvidia-driver-535

# Install CUDA toolkit
sudo apt install nvidia-cuda-toolkit

# Verify GPU is detected
nvidia-smi

# Ollama will automatically use GPU
ollama ps  # Check GPU usage
```

**Windows:**
```powershell
# Install NVIDIA drivers from nvidia.com
# Ollama will automatically detect and use GPU

# Verify GPU usage
nvidia-smi
```

**2. Use smaller/quantized model:**
```bash
# Smaller model (faster, less accurate)
ollama pull llava:13b

# Or quantized version (4-bit, much faster)
ollama pull llava:34b-q4_0
```

**3. Reduce pages processed:**
```typescript
// In server/contractParser.ts
for (let page = 1; page <= 5; page++) {  // Reduce from 10 to 5
  // ...
}
```

**4. Reduce image resolution:**
```typescript
// In server/pdfToImages.ts
const converter = fromPath(pdfPath, {
  density: 150,  // Reduce from 300 to 150 DPI
  // ...
});
```

---

### Issue: Out of memory error

**Symptoms:**
```
Error: failed to allocate memory
Ollama process killed
System freezes
```

**Cause:** Model requires more RAM than available

**Solutions:**

**1. Use smaller model:**
```bash
# llava:13b requires 16GB RAM (vs 32GB for llava:34b)
ollama pull llava:13b
echo "OLLAMA_VISION_MODEL=llava:13b" >> .env
```

**2. Use quantized model:**
```bash
# 4-bit quantization reduces memory by ~75%
ollama pull llava:34b-q4_0
echo "OLLAMA_VISION_MODEL=llava:34b-q4_0" >> .env
```

**3. Close other applications:**
```bash
# Free up RAM before extraction
# Close browsers, IDEs, etc.
```

**4. Increase swap space (Linux):**
```bash
# Create 16GB swap file
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Windows-Specific Issues

### Issue: GraphicsMagick not found in PATH

**Symptoms:**
```
'gm' is not recognized as an internal or external command
```

**Solution:**
```powershell
# Find GraphicsMagick installation
Get-ChildItem "C:\Program Files" -Recurse -Filter "gm.exe" -ErrorAction SilentlyContinue

# Add to PATH permanently
[Environment]::SetEnvironmentVariable(
  "Path",
  $env:Path + ";C:\Program Files\GraphicsMagick-1.3.40-Q16",
  "Machine"
)

# Restart terminal and verify
gm version
```

---

### Issue: Ghostscript not found in PATH

**Symptoms:**
```
Postscript delegate failed
gs: command not found
```

**Solution:**
```powershell
# Find Ghostscript installation
Get-ChildItem "C:\Program Files" -Recurse -Filter "gswin64c.exe" -ErrorAction SilentlyContinue

# Add to PATH permanently
[Environment]::SetEnvironmentVariable(
  "Path",
  $env:Path + ";C:\Program Files\gs\gs10.02.1\bin",
  "Machine"
)

# Restart terminal and verify
gswin64c -version
```

---

### Issue: pnpm-lock.yaml conflicts

**Symptoms:**
```
ERR_PNPM_LOCKFILE_BREAKING_CHANGE
Lockfile is broken
```

**Solution:**
```powershell
# Delete and restore lockfile
del pnpm-lock.yaml
git checkout origin/master -- pnpm-lock.yaml

# Clear pnpm cache
pnpm store prune

# Reinstall
pnpm install --force
```

---

### Issue: ESM/CommonJS import errors

**Symptoms:**
```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

**Solution:**

**Option 1: Use dynamic import**
```typescript
// Instead of:
import { fromPath } from 'pdf2pic';

// Use:
const { fromPath } = await import('pdf2pic');
```

**Option 2: Configure package.json**
```json
{
  "type": "module"
}
```

**Option 3: Use .mjs extension**
```bash
# Rename file
mv contractParser.ts contractParser.mjs
```

---

## Alternative Approaches

### Approach 1: OCR + Text Model (Recommended Fallback)

If vision models don't work well, use OCR to extract text first, then analyze with text model.

**Advantages:**
- Faster processing
- More reliable for text-heavy documents
- Lower RAM requirements
- Better structured data extraction

**Disadvantages:**
- Misses visual elements (charts, diagrams)
- May struggle with complex layouts
- Requires good OCR quality

**Implementation:**

**1. Install Tesseract OCR:**

**Windows:**
```powershell
choco install tesseract
```

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

**2. Create OCR extraction function:**

```typescript
// server/ocrExtractor.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { convertPdfToImages } from './pdfToImages';

const execAsync = promisify(exec);

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  // Convert PDF to images
  const imagePaths = await convertPdfToImages(pdfPath);
  
  // OCR each image
  const texts: string[] = [];
  for (const imagePath of imagePaths) {
    const { stdout } = await execAsync(`tesseract "${imagePath}" stdout`);
    texts.push(stdout);
  }
  
  return texts.join('\n\n--- PAGE BREAK ---\n\n');
}
```

**3. Update contract parser:**

```typescript
// server/contractParser.ts
import { extractTextFromPdf } from './ocrExtractor';
import { ollamaGenerateJSON } from './_core/ollama';

export async function extractContractModel(pdfUrl: string) {
  // 1. Download PDF
  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const tempPdfPath = `/tmp/contract-${Date.now()}.pdf`;
  await fs.writeFile(tempPdfPath, Buffer.from(pdfBuffer));

  // 2. Extract text with OCR
  console.log('[Contract Parser] Extracting text with OCR...');
  const extractedText = await extractTextFromPdf(tempPdfPath);

  // 3. Analyze with text model
  console.log('[Contract Parser] Analyzing with text model...');
  const extractedData = await ollamaGenerateJSON<ContractModel>(
    'qwen2.5:14b',
    `Extract performance model from this contract:\n\n${extractedText}`,
    SYSTEM_PROMPT
  );

  return extractedData;
}
```

**4. Test extraction:**
```bash
# Pull text model if not already installed
ollama pull qwen2.5:14b

# Run extraction
pnpm dev
```

---

### Approach 2: Hybrid (OCR + Vision)

Use OCR for text extraction, vision model for charts/diagrams.

**Implementation:**

```typescript
export async function extractContractModelHybrid(pdfUrl: string) {
  // 1. Extract text with OCR
  const extractedText = await extractTextFromPdf(tempPdfPath);
  
  // 2. Extract visual elements with vision model
  const imagePaths = await convertPdfToImages(tempPdfPath);
  const visualData = await ollamaVisionJSON(
    `file://${imagePaths[0]}`,
    'Extract any charts, diagrams, or visual elements',
    'llava:13b'
  );
  
  // 3. Combine results
  const combinedData = {
    ...extractedText,
    ...visualData,
  };
  
  return combinedData;
}
```

---

### Approach 3: Cloud API Fallback

If local processing fails, fallback to Manus API (cloud).

**⚠️ Security Warning:** Contract data will be sent to external servers.

**Implementation:**

```typescript
// server/contractParser.ts
import { invokeLLM } from './_core/llm';  // Manus API

export async function extractContractModel(pdfUrl: string) {
  try {
    // Try Ollama first
    return await extractWithOllama(pdfUrl);
  } catch (error) {
    console.warn('[Contract Parser] Ollama failed, falling back to Manus API');
    
    // Fallback to Manus API
    return await extractWithManusAPI(pdfUrl);
  }
}

async function extractWithManusAPI(pdfUrl: string) {
  const response = await invokeLLM({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'file_url', file_url: { url: pdfUrl, mime_type: 'application/pdf' } }
        ]
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'contract_model',
        schema: CONTRACT_SCHEMA,
      },
    },
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

---

### Approach 4: LM Studio (Alternative to Ollama)

LM Studio provides better Windows support and GPU utilization.

**Installation:**

1. Download from: https://lmstudio.ai/
2. Install and launch LM Studio
3. Download models through GUI (llava, qwen, etc.)
4. Start local server (OpenAI-compatible API)

**Configuration:**

```bash
# Update environment to point to LM Studio
echo "OLLAMA_BASE_URL=http://localhost:1234" >> .env
```

**Advantages:**
- Better GPU utilization on Windows
- Easier model management (GUI)
- Built-in performance monitoring
- More stable on Windows

**Disadvantages:**
- Larger installation size
- Not as lightweight as Ollama
- Fewer models available

---

## Getting Help

### Diagnostic Information

When reporting issues, include:

```bash
# System info
uname -a  # Linux/macOS
systeminfo  # Windows

# Ollama version
ollama --version

# Installed models
ollama list

# GraphicsMagick version
gm version

# Ghostscript version
gs -version  # Linux/macOS
gswin64c -version  # Windows

# Node.js version
node --version

# pnpm version
pnpm --version

# Application logs
# (from browser console or terminal)
```

### Support Channels

- **Ollama Documentation**: https://ollama.com/docs
- **Ollama GitHub**: https://github.com/ollama/ollama/issues
- **Solar Analyzer Repository**: https://github.com/robachamilton-afk/mce-tools
- **Ollama Discord**: https://discord.gg/ollama

---

## Quick Reference

### Common Commands

```bash
# Start Ollama
ollama serve

# Check Ollama status
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Pull new model
ollama pull llava:34b

# Remove model
ollama rm llama3.2-vision:11b

# Check running models
ollama ps

# Test GraphicsMagick
gm version

# Test Ghostscript
gs -version  # Linux/macOS
gswin64c -version  # Windows

# Test PDF conversion
gm convert -density 300 test.pdf test.png

# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
pnpm install --force
```

---

## License

This troubleshooting guide is part of the MCE Solar Farm Performance Analyzer project.
