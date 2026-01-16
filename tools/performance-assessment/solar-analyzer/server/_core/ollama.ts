/**
 * Ollama Integration Module
 * 
 * Provides a unified interface for interacting with local Ollama models
 * for both text generation and vision tasks.
 */

import { ENV } from './env';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images for vision models
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaGenerateOptions {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  format?: 'json'; // Request JSON output
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    num_ctx?: number;
  };
}

/**
 * Call Ollama chat completion API
 */
export async function ollamaChat(options: OllamaGenerateOptions): Promise<OllamaResponse> {
  const ollamaUrl = ENV.OLLAMA_BASE_URL || 'http://localhost:11434';
  const endpoint = `${ollamaUrl}/api/chat`;

  console.log(`[Ollama] Calling ${endpoint} with model ${options.model}`);
  console.log(`[Ollama] Message count: ${options.messages.length}`);
  console.log(`[Ollama] Has images: ${options.messages.some(m => m.images?.length)}`);

  try {
    // Vision models can take 60+ seconds, especially with high-res images
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...options,
        stream: false, // Always disable streaming for now
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Ollama] Chat API error:', error);
    console.error('[Ollama] Endpoint:', endpoint);
    console.error('[Ollama] Model:', options.model);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out after 2 minutes. The model may be overloaded or the image is too large.');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error(`Cannot connect to Ollama at ${ollamaUrl}. Make sure Ollama is running (try: ollama serve)`);
      }
    }
    
    throw error;
  }
}

/**
 * Generate text using Ollama with a simple prompt
 */
export async function ollamaGenerate(
  model: string,
  prompt: string,
  systemPrompt?: string,
  options?: OllamaGenerateOptions['options']
): Promise<string> {
  const messages: OllamaMessage[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });

  const response = await ollamaChat({
    model,
    messages,
    options,
  });

  return response.message.content;
}

/**
 * Generate structured JSON output using Ollama
 */
export async function ollamaGenerateJSON<T = any>(
  model: string,
  prompt: string,
  systemPrompt?: string,
  options?: OllamaGenerateOptions['options']
): Promise<T> {
  const messages: OllamaMessage[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });

  const response = await ollamaChat({
    model,
    messages,
    format: 'json',
    options,
  });

  console.log(`[Ollama] Response received from ${model}`);
  console.log(`[Ollama] Response length: ${response.message.content.length} characters`);
  console.log(`[Ollama] Generation time: ${response.total_duration ? (response.total_duration / 1e9).toFixed(2) + 's' : 'unknown'}`);

  try {
    const parsed = JSON.parse(response.message.content);
    console.log(`[Ollama] Successfully parsed JSON with keys:`, Object.keys(parsed));
    return parsed;
  } catch (error) {
    console.error('[Ollama] Failed to parse JSON response');
    console.error('[Ollama] Raw response (first 500 chars):', response.message.content.substring(0, 500));
    console.error('[Ollama] Parse error:', error);
    throw new Error(`Ollama returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyze an image using Ollama vision model (LLaVA)
 * 
 * @param imageUrl - URL or base64 encoded image
 * @param prompt - Question or instruction about the image
 * @param model - Vision model to use (default: llava:13b)
 */
export async function ollamaVision(
  imageUrl: string,
  prompt: string,
  model: string = 'llava:13b',
  systemPrompt?: string
): Promise<string> {
  // If imageUrl is a URL, fetch and convert to base64
  let imageBase64: string;
  
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString('base64');
  } else if (imageUrl.startsWith('data:image')) {
    // Extract base64 from data URL
    imageBase64 = imageUrl.split(',')[1];
  } else {
    // Assume it's already base64
    imageBase64 = imageUrl;
  }

  const messages: OllamaMessage[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({
    role: 'user',
    content: prompt,
    images: [imageBase64],
  });

  const response = await ollamaChat({
    model,
    messages,
  });

  return response.message.content;
}

/**
 * Analyze an image and return structured JSON using Ollama vision model
 */
export async function ollamaVisionJSON<T = any>(
  imageUrl: string,
  prompt: string,
  model: string = 'llava:13b',
  systemPrompt?: string
): Promise<T> {
  // If imageUrl is a URL, fetch and convert to base64
  let imageBase64: string;
  
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString('base64');
  } else if (imageUrl.startsWith('data:image')) {
    // Extract base64 from data URL
    imageBase64 = imageUrl.split(',')[1];
  } else {
    // Assume it's already base64
    imageBase64 = imageUrl;
  }

  const messages: OllamaMessage[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({
    role: 'user',
    content: prompt,
    images: [imageBase64],
  });

  const response = await ollamaChat({
    model,
    messages,
    format: 'json',
  });

  try {
    return JSON.parse(response.message.content);
  } catch (error) {
    console.error('[Ollama] Failed to parse JSON response:', response.message.content);
    throw new Error('Ollama returned invalid JSON');
  }
}

/**
 * Check if Ollama is available and running
 */
export async function checkOllamaHealth(): Promise<boolean> {
  const ollamaUrl = ENV.OLLAMA_BASE_URL || 'http://localhost:11434';
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('[Ollama] Health check failed:', error);
    return false;
  }
}

/**
 * List available Ollama models
 */
export async function listOllamaModels(): Promise<string[]> {
  const ollamaUrl = ENV.OLLAMA_BASE_URL || 'http://localhost:11434';
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.error('[Ollama] Failed to list models:', error);
    return [];
  }
}
