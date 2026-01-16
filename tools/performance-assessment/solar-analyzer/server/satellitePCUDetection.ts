/**
 * Two-stage PCU detection from satellite imagery
 * Stage 1: Wide scan at zoom 17-18 to identify potential PCU locations
 * Stage 2: Zoom confirmation at zoom 19-20 to verify and count PCUs
 */

import { invokeLLM } from "./_core/llm";
import { getMapboxSatelliteUrl, isMapboxConfigured } from "./_core/mapbox";
import { ENV } from "./_core/env";

interface PCULocation {
  latitude: number;
  longitude: number;
  confidence: number;
  verified: boolean;
}

interface PCUDetectionResult {
  pcuCount: number;
  pcuLocations: PCULocation[];
  inverterCount: number; // Estimated: pcuCount * 3 (typical)
  detectionConfidence: number;
  detectionNotes: string;
  imagesAnalyzed: number;
}

async function fetchSatelliteImage(lat: number, lon: number, zoom: number): Promise<string> {
  if (!isMapboxConfigured()) {
    throw new Error(
      "Mapbox not configured. Add MAPBOX_ACCESS_TOKEN to your .env file. " +
      "Get a free token at https://account.mapbox.com/"
    );
  }
  return getMapboxSatelliteUrl(lat, lon, zoom, 640, 640);
}

export async function detectPCUs(
  siteName: string,
  centerLat: number,
  centerLon: number,
  capacityMW?: number
): Promise<PCUDetectionResult> {
  
  // Estimate site coverage area based on capacity (rough: 2.5 MW/hectare = 0.025 MW per 100m²)
  const estimatedRadiusKm = capacityMW ? Math.sqrt(capacityMW / 2.5) * 0.1 : 0.5;
  const estimatedPCUCount = capacityMW ? Math.round(capacityMW / 4.5) : 20; // Rough: 4.5MW per PCU
  
  const systemPrompt = `You are an expert at detecting solar farm equipment from satellite imagery.

**Your task: Detect and count PCUs (Power Conversion Units) in ${siteName}**

**Site info:**
- Center: ${centerLat}, ${centerLon}
- Estimated radius: ~${(estimatedRadiusKm * 1000).toFixed(0)}m
- Expected PCU count: ~${estimatedPCUCount} (this is just an estimate, actual count may vary)

**TWO-STAGE DETECTION PROCESS:**

**STAGE 1: WIDE SCAN (zoom 17-18)**
1. Scan different sections of the solar farm systematically
2. Look for potential PCU locations (white/grey rectangular containers)
3. Note coordinates of suspected PCUs
4. Cover the entire site - scan north, south, east, west sections
5. PCUs are typically along access roads or between panel blocks

**STAGE 2: ZOOM CONFIRMATION (zoom 19-20)**
1. For each suspected location, zoom in to verify
2. Measure dimensions: 40ft container ≈ 12m × 2.4m
3. At zoom 20: 12m ≈ 80 pixels, 2.4m ≈ 16 pixels
4. Confirm it's a PCU, not a control building or other equipment
5. Record confirmed PCU locations

**What PCUs look like:**
- 40ft shipping container size (~12m × 2.4m)
- White or grey color
- Rectangular shape
- Located along access roads or between panel rows
- Often in regular patterns
- May have cooling equipment visible on sides

**Scale factors:**
- Zoom 17: ~1.2 m/pixel (~770m coverage)
- Zoom 18: ~0.6 m/pixel (~385m coverage)
- Zoom 19: ~0.3 m/pixel (~192m coverage)
- Zoom 20: ~0.15 m/pixel (~96m coverage)

**Scanning strategy:**
1. Start at center with zoom 17-18 for wide view
2. Identify potential PCU clusters
3. Scan adjacent areas (shift by ~300-400m) to cover entire site
4. Once you've identified all potential locations, zoom to 19-20 to confirm each
5. Count only CONFIRMED PCUs

**Important:**
- Be systematic - don't miss sections of the farm
- Don't count the same PCU twice
- If you can't confirm dimensions, mark as uncertain
- It's better to undercount than overcount`;

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
              description: "Zoom level: 17-18 for wide scan, 19-20 for confirmation" 
            },
            reason: { type: "string", description: "Why you want this image (e.g., 'scan north section', 'confirm PCU at X,Y')" }
          },
          required: ["latitude", "longitude", "zoom", "reason"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "submit_pcu_detection",
        description: "Submit your PCU detection results after scanning and confirming",
        parameters: {
          type: "object",
          properties: {
            pcuCount: { 
              type: "integer", 
              description: "Total number of confirmed PCUs detected" 
            },
            pcuLocations: {
              type: "array",
              description: "List of confirmed PCU locations",
              items: {
                type: "object",
                properties: {
                  latitude: { type: "number", description: "PCU latitude" },
                  longitude: { type: "number", description: "PCU longitude" },
                  confidence: { 
                    type: "integer", 
                    description: "Confidence this is a PCU (0-100)" 
                  },
                  verified: { 
                    type: "boolean", 
                    description: "Did you zoom in to verify dimensions?" 
                  }
                },
                required: ["latitude", "longitude", "confidence", "verified"]
              }
            },
            detectionConfidence: { 
              type: "integer", 
              description: "Overall confidence in the count (0-100)" 
            },
            detectionNotes: { 
              type: "string", 
              description: "Notes on detection process, challenges, uncertainties" 
            }
          },
          required: ["pcuCount", "pcuLocations", "detectionConfidence", "detectionNotes"]
        }
      }
    }
  ];

  // Start with wide view at center
  const initialImageUrl = await fetchSatelliteImage(centerLat, centerLon, 17);
  
  const messages: Array<any> = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { 
          type: "text", 
          text: `Begin PCU detection for ${siteName}. Start with this wide view and systematically scan the site.` 
        },
        { type: "image_url", image_url: { url: initialImageUrl } }
      ]
    }
  ];

  let result: PCUDetectionResult | null = null;
  const maxIterations = 20; // Allow more iterations for thorough scanning
  let iterationCount = 0;

  for (let i = 1; i <= maxIterations; i++) {
    iterationCount = i;
    console.log(`📡 PCU Detection Iteration ${i}/${maxIterations}`);
    
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
            
            messages.push({
              role: "user",
              content: [
                { type: "text", text: `Image at (${latitude}, ${longitude}) zoom ${zoom}:` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            });
          } else if (functionName === "submit_pcu_detection") {
            console.log(`✅ PCU detection submitted!`);
            const inverterCount = args.pcuCount * 3; // Typical: 3 inverters per PCU
            result = {
              ...args,
              inverterCount,
              imagesAnalyzed: iterationCount
            };
            break;
          }
        }

        if (result) break;
      } else {
        // LLM made observations but didn't call a tool
        // Prompt it to continue scanning or submit results
        console.log(`💭 LLM made observations, prompting to continue...`);
        messages.push({
          role: "user",
          content: "Continue scanning other sections of the farm, or if you've covered the entire site and counted all PCUs, submit your detection results using submit_pcu_detection."
        });
      }
    } catch (error) {
      console.error(`❌ Error in iteration ${i}:`, error);
      throw error;
    }
  }

  if (!result) {
    throw new Error(`Failed to complete PCU detection after ${iterationCount} iterations`);
  }

  return result;
}
