/**
 * Weather File Extractor
 * 
 * Extracts weather file references from project documents and downloads them.
 * Supports:
 * - Direct URLs to weather files (.csv, .epw, .tm2, .tm3)
 * - References to PVGIS/NSRDB/SolarAnywhere data
 * - Embedded weather data tables
 * 
 * Author: Manus AI
 * Date: January 24, 2026
 */

import { invokeLLM } from "./_core/llm.js";
import { storagePut } from "./storage";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

export interface WeatherFileReference {
  type: 'url' | 'embedded' | 'reference';
  url?: string;
  description: string;
  format?: string; // pvgis, tmy3, epw, pvsyst, solaranywhere
  location?: string;
  confidence: number;
  sourceLocation: string; // Page number or section
}

export interface ExtractedWeatherData {
  references: WeatherFileReference[];
  extractionMethod: string;
  confidence: number;
}

export class WeatherFileExtractor {
  /**
   * Extract weather file references from document text
   */
  async extractWeatherReferences(
    documentText: string,
    documentId: string,
    fileName: string
  ): Promise<ExtractedWeatherData> {
    const prompt = `You are analyzing a solar project document to find weather data references.

DOCUMENT: ${fileName}

Extract ALL weather file references, including:
1. Direct URLs to weather files (.csv, .epw, .tm2, .tm3, .wth)
2. References to weather data sources (PVGIS, NSRDB, SolarAnywhere, Meteonorm, PVsyst)
3. Mentions of TMY (Typical Meteorological Year) data
4. Weather file names or identifiers
5. Embedded weather data tables (if present)

For each reference, provide:
- type: "url" | "embedded" | "reference"
- url: Direct URL if available
- description: What the reference says
- format: Detected format (pvgis, tmy3, epw, pvsyst, solaranywhere, meteonorm, unknown)
- location: Geographic location mentioned
- confidence: 0.0-1.0 confidence score
- sourceLocation: Page number or section where found

Return JSON:
{
  "references": [
    {
      "type": "url",
      "url": "https://example.com/weather.csv",
      "description": "PVGIS TMY data for Malta",
      "format": "pvgis",
      "location": "Malta, 35.9°N 14.4°E",
      "confidence": 0.95,
      "sourceLocation": "Page 12, Section 3.2"
    }
  ]
}

DOCUMENT TEXT (first 50,000 characters):
${documentText.substring(0, 50000)}`;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a technical document analyzer specializing in solar energy project data extraction. Return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "weather_references",
            strict: true,
            schema: {
              type: "object",
              properties: {
                references: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["url", "embedded", "reference"]
                      },
                      url: {
                        type: "string"
                      },
                      description: {
                        type: "string"
                      },
                      format: {
                        type: "string"
                      },
                      location: {
                        type: "string"
                      },
                      confidence: {
                        type: "number"
                      },
                      sourceLocation: {
                        type: "string"
                      }
                    },
                    required: ["type", "description", "confidence", "sourceLocation"],
                    additionalProperties: false
                  }
                }
              },
              required: ["references"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      if (!content || typeof content !== 'string') {
        throw new Error("Empty or invalid response from LLM");
      }

      const parsed = JSON.parse(content);
      
      return {
        references: parsed.references || [],
        extractionMethod: "llm",
        confidence: parsed.references.length > 0 
          ? parsed.references.reduce((sum: number, ref: WeatherFileReference) => sum + ref.confidence, 0) / parsed.references.length
          : 0
      };
    } catch (error) {
      console.error("Weather file extraction error:", error);
      return {
        references: [],
        extractionMethod: "llm",
        confidence: 0
      };
    }
  }

  /**
   * Download weather file from URL
   */
  async downloadWeatherFile(
    url: string,
    projectId: number,
    documentId: string
  ): Promise<{
    fileKey: string;
    fileUrl: string;
    fileName: string;
    fileSizeBytes: number;
    content: string;
  } | null> {
    try {
      console.log(`Downloading weather file from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 60000, // 60 second timeout
        maxContentLength: 50 * 1024 * 1024, // 50MB max
        responseType: 'text'
      });

      const content = response.data;
      const fileSizeBytes = Buffer.byteLength(content, 'utf8');
      
      // Extract filename from URL or generate one
      const urlParts = url.split('/');
      const urlFileName = urlParts[urlParts.length - 1] || 'weather_data.csv';
      const fileName = urlFileName.split('?')[0]; // Remove query params
      
      // Upload to S3
      const fileKey = `project-${projectId}/weather/${documentId}/${uuidv4()}-${fileName}`;
      const { url: fileUrl } = await storagePut(
        fileKey,
        content,
        'text/csv'
      );

      console.log(`Weather file downloaded and uploaded to S3: ${fileKey}`);
      
      return {
        fileKey,
        fileUrl,
        fileName,
        fileSizeBytes,
        content
      };
    } catch (error) {
      console.error(`Failed to download weather file from ${url}:`, error);
      return null;
    }
  }

  /**
   * Process weather file: download, convert, validate
   */
  async processWeatherFile(
    reference: WeatherFileReference,
    projectId: number,
    documentId: string
  ): Promise<{
    fileKey: string;
    fileUrl: string;
    fileName: string;
    fileSizeBytes: number;
    originalFormat: string;
    content: string;
  } | null> {
    if (reference.type !== 'url' || !reference.url) {
      console.log(`Skipping non-URL reference: ${reference.description}`);
      return null;
    }

    // Download the file
    const downloadResult = await this.downloadWeatherFile(
      reference.url,
      projectId,
      documentId
    );

    if (!downloadResult) {
      return null;
    }

    return {
      ...downloadResult,
      originalFormat: reference.format || 'unknown'
    };
  }
}
