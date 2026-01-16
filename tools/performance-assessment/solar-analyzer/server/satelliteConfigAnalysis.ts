/**
 * Focused satellite configuration analysis
 * Phase 1: Site location (2 iterations max)
 * Phase 2: Configuration measurement (1 iteration at zoom 20)
 * 
 * PCU detection is handled separately in satellitePCUDetection.ts
 */

import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

interface ConfigAnalysisResult {
  // Site location
  refinedLatitude: number;
  refinedLongitude: number;
  coordinateConfidence: number;
  
  // Site boundaries (for grid calibration)
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  estimatedSizeKm: {
    width: number;  // E-W dimension in km
    height: number; // N-S dimension in km
  };
  
  // Configuration
  trackingType: "single_axis" | "fixed_tilt" | "dual_axis" | "unknown";
  azimuthAngle: number;
  tiltAngle: number;
  gcr: number;
  pitch: number;
  
  // Confidence scores
  trackingConfidence: number;
  azimuthConfidence: number;
  gcrConfidence: number;
  pitchConfidence: number;
  
  // Metadata
  imagesAnalyzed: number;
  analysisNotes: string;
}

async function fetchSatelliteImage(lat: number, lon: number, zoom: number): Promise<string> {
  const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "") || "";
  const apiKey = ENV.forgeApiKey || "";
  const size = "640x640";
  const mapType = "satellite";
  return `${baseUrl}/v1/maps/proxy/maps/api/staticmap?center=${lat},${lon}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${apiKey}`;
}

export async function analyzeConfigurationOnly(
  siteName: string,
  initialLat: number,
  initialLon: number
): Promise<ConfigAnalysisResult> {
  
  const systemPrompt = `You are an expert solar farm analyst using satellite imagery to detect site configuration.

**Your task is split into TWO focused phases:**

**PHASE 1: SITE LOCATION & BOUNDARY DETECTION (2-3 iterations max)**
1. Start with the provided coordinates at zoom 15-16 (wide view)
2. Locate the solar farm (it may be offset by 100-1000m from provided coordinates)
3. Estimate site boundaries - where do panels start/end in each direction?
4. Calculate approximate site dimensions (width E-W, height N-S in km)
5. Identify center coordinates
6. If needed, request ONE more image to verify boundaries
7. Once located and boundaries estimated, proceed to Phase 2

**PHASE 2: CONFIGURATION MEASUREMENT (1 iteration at zoom 20)**
1. Request a zoom 20 image focused on a clear section of panel rows
2. Measure pitch and panel width using pixel counting
3. Determine tracking type and azimuth from panel orientation
4. Submit your analysis

**Scale factors for measurement:**
- Zoom 16: ~10 m/pixel (wide view for locating)
- Zoom 20: ~0.15 m/pixel (detailed measurement)

**At zoom 20 (640x640 pixels, ~0.15 m/pixel):**
- Image covers ~96m × 96m
- Typical pitch (5-9m) = 33-60 pixels
- Typical panel width (2m) = 13 pixels
- Measure multiple rows and average for accuracy

**Measurement process:**
1. Count pixels between row centers for pitch
2. Count pixels across panel width
3. Measure at least 3-4 rows and average
4. Calculate GCR = panel_width / pitch

**Tracking type identification:**
- **Single-axis**: Long parallel rows, panels rotate E-W, tilt = 0°
- **Fixed-tilt**: Panels at fixed angle, no rotation, tilt = 15-30°
- **Dual-axis**: Rare, panels track both axes

**Azimuth determination:**
- 0° = North-South rows (single-axis tracking E-W)
- 90° = East-West rows (single-axis tracking N-S)
- For fixed-tilt: direction panels face

**Important:**
- Be efficient: 2 iterations for location, 1 for measurement = 3 total
- Always use zoom 20 for measurements
- Measure multiple rows and average
- Don't guess - if you can't measure accurately, note low confidence`;

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "fetch_satellite_image",
        description: "Fetch a satellite image at specific coordinates and zoom level",
        parameters: {
          type: "object",
          properties: {
            latitude: { type: "number", description: "Latitude in decimal degrees" },
            longitude: { type: "number", description: "Longitude in decimal degrees" },
            zoom: { 
              type: "number", 
              description: "Zoom level: 16 (wide, locate site), 20 (detailed, measure pitch)" 
            },
            reason: { type: "string", description: "Why you want this image" }
          },
          required: ["latitude", "longitude", "zoom", "reason"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "submit_config_analysis",
        description: "Submit your configuration analysis after measuring at zoom 20",
        parameters: {
          type: "object",
          properties: {
            refinedLatitude: { type: "number", description: "Refined center latitude of solar farm" },
            refinedLongitude: { type: "number", description: "Refined center longitude of solar farm" },
            coordinateConfidence: { type: "integer", description: "Confidence in coordinates (0-100)" },
            boundingBox: {
              type: "object",
              description: "Site boundaries for grid calibration",
              properties: {
                minLat: { type: "number", description: "Southern boundary" },
                maxLat: { type: "number", description: "Northern boundary" },
                minLon: { type: "number", description: "Western boundary" },
                maxLon: { type: "number", description: "Eastern boundary" }
              },
              required: ["minLat", "maxLat", "minLon", "maxLon"]
            },
            estimatedSizeKm: {
              type: "object",
              description: "Estimated site dimensions",
              properties: {
                width: { type: "number", description: "East-West dimension in km" },
                height: { type: "number", description: "North-South dimension in km" }
              },
              required: ["width", "height"]
            },
            trackingType: { 
              type: "string", 
              enum: ["single_axis", "fixed_tilt", "dual_axis", "unknown"],
              description: "Type of tracking system" 
            },
            azimuthAngle: { 
              type: "number", 
              description: "Azimuth angle in degrees (0=N-S, 90=E-W)" 
            },
            tiltAngle: { 
              type: "number", 
              description: "Tilt angle: 0° for single-axis tracking, 15-30° for fixed-tilt" 
            },
            gcr: { 
              type: "number", 
              description: "Ground coverage ratio (panel_width / pitch)" 
            },
            pitch: { 
              type: "number", 
              description: "Row-to-row spacing in meters (measured at zoom 20)" 
            },
            trackingConfidence: { type: "integer", description: "Confidence in tracking type (0-100)" },
            azimuthConfidence: { type: "integer", description: "Confidence in azimuth (0-100)" },
            gcrConfidence: { type: "integer", description: "Confidence in GCR (0-100)" },
            pitchConfidence: { type: "integer", description: "Confidence in pitch (0-100)" },
            analysisNotes: { 
              type: "string", 
              description: "Brief notes on what you observed and how you measured" 
            }
          },
          required: [
            "refinedLatitude", "refinedLongitude", "coordinateConfidence",
            "boundingBox", "estimatedSizeKm",
            "trackingType", "azimuthAngle", "tiltAngle", "gcr", "pitch",
            "trackingConfidence", "azimuthConfidence", "gcrConfidence", "pitchConfidence",
            "analysisNotes"
          ]
        }
      }
    }
  ];

  // Start with wide view
  const initialImageUrl = await fetchSatelliteImage(initialLat, initialLon, 16);
  
  const messages: Array<any> = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { 
          type: "text", 
          text: `Analyze ${siteName} starting at coordinates ${initialLat}, ${initialLon}. Begin Phase 1: locate the solar farm.` 
        },
        { type: "image_url", image_url: { url: initialImageUrl } }
      ]
    }
  ];

  let result: ConfigAnalysisResult | null = null;
  const maxIterations = 4; // 2 for location, 1 for measurement, 1 buffer
  let iterationCount = 0;

  for (let i = 1; i <= maxIterations; i++) {
    iterationCount = i;
    console.log(`📡 Config Analysis Iteration ${i}/${maxIterations}`);
    
    try {
      const response = await invokeLLM({
        messages,
        tools,
        tool_choice: "auto"
      });

      const choice = response.choices[0];
      const message = choice.message;

      if (message.content) {
        const contentStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        console.log(`   Message: ${contentStr.substring(0, 150)}...`);
      }

      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          console.log(`🔧 Function: ${functionName}`);

          if (functionName === "fetch_satellite_image") {
            const { latitude, longitude, zoom, reason } = args;
            console.log(`   Fetching: (${latitude}, ${longitude}) @ zoom ${zoom}`);
            console.log(`   Reason: ${reason}`);
            
            const imageUrl = await fetchSatelliteImage(latitude, longitude, zoom);
            
            // Add image to conversation for LLM to analyze
            messages.push({
              role: "user",
              content: [
                { type: "text", text: `Image at (${latitude}, ${longitude}) zoom ${zoom}:` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            });
          } else if (functionName === "submit_config_analysis") {
            console.log(`✅ Configuration analysis submitted!`);
            result = {
              ...args,
              imagesAnalyzed: iterationCount
            };
            break;
          }
        }

        if (result) break;
      } else {
        // LLM made observations but didn't call a tool
        // Prompt it to continue or submit
        console.log(`💭 LLM made observations, prompting to continue...`);
        messages.push({
          role: "user",
          content: "If you've completed Phase 2 measurements at zoom 20, submit your analysis using submit_config_analysis. Otherwise, request the zoom 20 image to measure pitch and GCR."
        });
      }
    } catch (error) {
      console.error(`❌ Error in iteration ${i}:`, error);
      throw error;
    }
  }

  if (!result) {
    throw new Error(`Failed to complete configuration analysis after ${iterationCount} iterations`);
  }

  return result;
}
