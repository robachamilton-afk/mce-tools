# Ollama Setup Guide for ACC Asset Extractor

This guide will help you configure the ACC Asset Extractor to use your local Ollama instance with Qwen2.5:14b, Mistral:7b, and Llama3.1:8b models.

---

## Model Configuration Strategy

Based on your available models, here's the optimal configuration:

### Primary Configuration (Recommended)

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EXTRACTION_MODEL=qwen2.5:14b
OLLAMA_CHAT_MODEL=mistral:7b
```

**Why this configuration?**

- **Qwen2.5:14b for extraction**: Superior at structured data extraction and JSON generation. The 14B parameter size provides excellent accuracy for parsing complex engineering documents.
- **Mistral:7b for chat**: Fast and efficient for conversational tasks, user assistance, and quick responses.

### Alternative Configuration

If you experience performance issues or want faster extraction:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EXTRACTION_MODEL=llama3.1:8b
OLLAMA_CHAT_MODEL=mistral:7b
```

---

## Performance Comparison

| Model | Task | Speed | Accuracy | Memory | Best For |
|-------|------|-------|----------|--------|----------|
| **Qwen2.5:14b** | Extraction | ⭐⭐⭐ (8-12s/page) | ⭐⭐⭐⭐⭐ | ~10GB | Complex documents, high accuracy needs |
| **Llama3.1:8b** | Extraction | ⭐⭐⭐⭐ (3-5s/page) | ⭐⭐⭐⭐ | ~6GB | Balanced speed/accuracy |
| **Mistral:7b** | Chat | ⭐⭐⭐⭐⭐ (2-4s) | ⭐⭐⭐⭐ | ~5GB | Fast responses, conversations |

---

## Setup Instructions

### 1. Verify Ollama Installation

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start Ollama
ollama serve
```

### 2. Verify Models are Pulled

```bash
# List available models
ollama list

# You should see:
# qwen2.5:14b
# mistral:7b
# llama3.1:8b
```

If any models are missing:

```bash
ollama pull qwen2.5:14b
ollama pull mistral:7b
ollama pull llama3.1:8b
```

### 3. Configure Environment

Create a `.env` file in the project root (copy from ENV_TEMPLATE.md):

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EXTRACTION_MODEL=qwen2.5:14b
OLLAMA_CHAT_MODEL=mistral:7b

# Database
DATABASE_URL=mysql://user:password@localhost:3306/acc_extractor

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-here
```

### 4. Test Ollama Connection

```bash
# Start the development server
pnpm dev

# The server will log Ollama health check on startup
# Look for: "Ollama available: true, models: [...]"
```

---

## Model Selection Decision Tree

```
┌─────────────────────────────────────┐
│ What's your priority?               │
└──────────┬──────────────────────────┘
           │
           ├─ High Accuracy (Engineering docs)
           │  └─> Use Qwen2.5:14b for extraction
           │
           ├─ Fast Processing (Many documents)
           │  └─> Use Llama3.1:8b for extraction
           │
           └─ Balanced (Default)
              └─> Use Qwen2.5:14b + Mistral:7b
```

---

## Troubleshooting

### Issue: "Ollama API error: ECONNREFUSED"

**Solution:**
```bash
# Start Ollama server
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### Issue: "Model not found: qwen2.5:14b"

**Solution:**
```bash
# Pull the model
ollama pull qwen2.5:14b

# Verify it's available
ollama list
```

### Issue: Extraction is too slow

**Solutions:**
1. Switch to Llama3.1:8b for faster extraction:
   ```env
   OLLAMA_EXTRACTION_MODEL=llama3.1:8b
   ```

2. Reduce context window (edit `server/_core/ollama.ts`):
   ```typescript
   max_tokens: 2048  // Reduce from 4096
   ```

3. Enable GPU acceleration (if available):
   ```bash
   # Ollama automatically uses GPU if CUDA is available
   nvidia-smi  # Check GPU availability
   ```

### Issue: Out of memory errors

**Solutions:**
1. Use smaller models:
   ```env
   OLLAMA_EXTRACTION_MODEL=llama3.1:8b  # 6GB instead of 10GB
   ```

2. Process fewer documents concurrently (edit `server/extraction.ts`):
   ```typescript
   const MAX_CONCURRENT = 2  // Reduce from 5
   ```

3. Increase system swap space:
   ```bash
   sudo fallocate -l 16G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

---

## Advanced Configuration

### Custom Model Parameters

Edit `server/_core/ollama.ts` to customize model behavior:

```typescript
// For more creative/varied extraction
temperature: 0.5  // Increase from 0.3

// For more deterministic extraction
temperature: 0.1  // Decrease from 0.3

// For longer responses
max_tokens: 8192  // Increase from 4096
```

### Using Different Models

You can use any Ollama-compatible model:

```env
# Example: Using CodeLlama for code-heavy documents
OLLAMA_EXTRACTION_MODEL=codellama:13b

# Example: Using Mixtral for chat
OLLAMA_CHAT_MODEL=mixtral:8x7b
```

---

## Performance Optimization Tips

1. **Pre-warm models**: Run a test extraction before processing large batches to load models into memory.

2. **Batch processing**: Process multiple documents in parallel (configured in `server/extraction.ts`).

3. **GPU acceleration**: Ensure Ollama is using your GPU:
   ```bash
   # Check GPU usage while extraction is running
   watch -n 1 nvidia-smi
   ```

4. **Model quantization**: Use quantized models for faster inference:
   ```bash
   ollama pull qwen2.5:14b-q4_0  # 4-bit quantized version
   ```

---

## Monitoring

### Check Ollama Logs

```bash
# View Ollama server logs
journalctl -u ollama -f

# Or if running manually
# Check terminal where you ran `ollama serve`
```

### Monitor Resource Usage

```bash
# CPU and Memory
htop

# GPU (if available)
nvidia-smi -l 1

# Disk I/O
iotop
```

---

## Next Steps

1. ✅ Verify Ollama is running and models are loaded
2. ✅ Configure `.env` with your preferred models
3. ✅ Start the development server: `pnpm dev`
4. ✅ Test extraction with demo data
5. ✅ Monitor performance and adjust configuration as needed

For more help, see the main [README.md](README.md) or open an issue on GitHub.
