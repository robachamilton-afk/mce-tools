/**
 * Ollama LLM Integration
 * 
 * Provides local LLM inference using Ollama with configurable models.
 * Supports both extraction (structured data) and chat (conversational) tasks.
 */

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaConfig {
  baseURL: string;
  extractionModel: string;
  chatModel: string;
}

// Load configuration from environment
const config: OllamaConfig = {
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  extractionModel: process.env.OLLAMA_EXTRACTION_MODEL || "qwen2.5:14b",
  chatModel: process.env.OLLAMA_CHAT_MODEL || "mistral:7b",
};

/**
 * Call Ollama API for chat completion
 */
async function callOllama(
  messages: OllamaMessage[],
  model: string,
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const response = await fetch(`${config.baseURL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p ?? 0.9,
        num_predict: options?.max_tokens ?? 2048,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${error}`);
  }

  const data: OllamaResponse = await response.json();
  return data.message.content;
}

/**
 * Extract structured asset data from document text
 * Uses the larger, more accurate model (Qwen2.5:14b)
 */
export async function extractAssets(
  documentText: string,
  projectName: string
): Promise<any[]> {
  const messages: OllamaMessage[] = [
    {
      role: "system",
      content: `You are an expert at extracting asset information from engineering documentation.
Extract all assets mentioned in the document and return them as a JSON array.

Each asset should have:
- name: Asset name/identifier
- category: Type of asset (Inverter, Transformer, Switchboard, Cable, etc.)
- location: Physical location or zone
- specifications: Technical specifications as a string
- confidence: Your confidence in the extraction (0-100)

Return ONLY valid JSON, no markdown formatting or explanation.`,
    },
    {
      role: "user",
      content: `Project: ${projectName}\n\nDocument content:\n${documentText}`,
    },
  ];

  const response = await callOllama(messages, config.extractionModel, {
    temperature: 0.3, // Lower temperature for more consistent structured output
    max_tokens: 4096,
  });

  // Parse JSON response
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch (error) {
    console.error("Failed to parse Ollama response:", response);
    throw new Error("Invalid JSON response from Ollama");
  }
}

/**
 * Chat completion for conversational tasks
 * Uses the faster, more efficient model (Mistral:7b)
 */
export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  return callOllama(messages, config.chatModel, {
    temperature: 0.7,
    max_tokens: 2048,
  });
}

/**
 * Check if Ollama is available and models are loaded
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  models: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${config.baseURL}/api/tags`);
    if (!response.ok) {
      return {
        available: false,
        models: [],
        error: `Ollama API returned ${response.status}`,
      };
    }

    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];

    return {
      available: true,
      models,
    };
  } catch (error) {
    return {
      available: false,
      models: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get current Ollama configuration
 */
export function getOllamaConfig(): OllamaConfig {
  return { ...config };
}
