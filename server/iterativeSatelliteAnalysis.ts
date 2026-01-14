/**
 * Iterative Satellite Analysis Engine
 * 
 * Uses LLM function calling to let the AI explore satellite imagery iteratively:
 * 1. Start with wide view at approximate coordinates
 * 2. LLM requests more images as needed (different coords/zoom)
 * 3. LLM builds up knowledge until it can provide complete analysis
 * 4. Handles coordinate offsets, large farms, and complex layouts automatically
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { sites, siteConfigurations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface SatelliteImageRequest {
  latitude: number;
  longitude: number;
  zoom: number; // 15=wide view (~5km), 17=medium (~1km), 19=detailed (~250m)
  reason: string; // Why the LLM wants this image
}

interface AnalysisResult {
  refinedLat: number;
  refinedLon: number;
  coordinateConfidence: number; // 0-100
  trackingType: "fixed" | "single_axis" | "dual_axis";
  axisAzimuth: number; // degrees, 0=North
  tiltAngle: number; // degrees
  gcr: number; // Ground Coverage Ratio (0-1)
  pitch: number; // meters between rows
  inverterCount: number; // -1 if unknown
  pcuCount: number; // -1 if unknown
  trackingConfidence: number; // 0-100
  gcrConfidence: number; // 0-100
  pitchConfidence: number; // 0-100
  equipmentConfidence: number; // 0-100
  notes: string;
  imagesAnalyzed: number; // How many images the LLM requested
}

/**
 * Fetch a satellite image from Google Maps Static API
 */
async function fetchSatelliteImage(
  lat: number,
  lon: number,
  zoom: number
): Promise<string> {
  const { ENV } = await import("./_core/env");
  const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "") || "";
  const apiKey = ENV.forgeApiKey || "";
  
  const size = "640x640";
  const mapType = "satellite";
  const url = `${baseUrl}/v1/maps/proxy/maps/api/staticmap?center=${lat},${lon}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${apiKey}`;
  
  return url;
}

/**
 * Analyze a solar farm using iterative LLM exploration
 */
export async function analyzeSolarFarmIterative(
  siteName: string,
  approximateLat: number,
  approximateLon: number,
  capacityMw: number
): Promise<AnalysisResult> {
  console.log(`\n🔍 Starting iterative analysis of ${siteName}...`);
  
  const maxIterations = 10; // Prevent infinite loops
  let iteration = 0;
  const imagesFetched: Array<{ lat: number; lon: number; zoom: number; url: string }> = [];
  
  // Start with a wide view
  const initialZoom = 16; // ~2km coverage
  const initialImageUrl = await fetchSatelliteImage(approximateLat, approximateLon, initialZoom);
  imagesFetched.push({ lat: approximateLat, lon: approximateLon, zoom: initialZoom, url: initialImageUrl });
  
  const systemPrompt = `You are an expert solar energy engineer with satellite imagery analysis capabilities.

Your task is to analyze "${siteName}" (${capacityMw} MW capacity) located at approximately ${approximateLat}°, ${approximateLon}°.

You can request satellite images at different coordinates and zoom levels to build up your understanding. Use the fetch_satellite_image function to explore.

**Zoom level guide:**
- 15: Wide view (~5km coverage) - good for locating large farms
- 16: Medium view (~2km coverage) - good for seeing overall layout
- 17: Closer view (~1km coverage) - good for identifying tracking type
- 18: Detailed view (~400m coverage, ~0.6m/pixel) - good for wide equipment scanning
- 19: High detail (~200m coverage, ~0.3m/pixel) - good for confirming equipment
- 20: Maximum detail (~100m coverage, ~0.15m/pixel) - **REQUIRED** for accurate pitch/GCR measurements

**Your exploration strategy:**
1. Start with the initial wide view to locate the solar farm
2. If coordinates seem off, request images in nearby areas to find the actual farm
3. Once located, zoom in to analyze tracking configuration
4. **CRITICAL**: Request zoom 20 for accurate measurements - you MUST zoom to maximum detail to measure pitch and GCR
5. Use the scale factors to calculate actual distances from pixel measurements
6. When you have enough information, provide your final analysis

**How to measure pitch and GCR accurately:**
1. Request a zoom 20 image focused on a clear section of panel rows (maximum detail required)
2. The image is 640x640 pixels. At zoom 20, scale factor is ~0.15 m/pixel
3. **Pitch measurement**: 
   - Measure from the center of one panel row to the center of the next row (count pixels)
   - Measure multiple rows (at least 3-4) and average for accuracy
   - Convert to meters: pitch_meters = pixel_count × 0.15
   - Example: 40 pixels between rows = 40 × 0.15 = 6.0m pitch
4. **Panel width measurement**:
   - Measure the width of a panel row perpendicular to the tracking axis (count pixels)
   - Convert to meters: width_meters = pixel_count × 0.15
   - Example: 13 pixels wide = 13 × 0.15 = 1.95m panel width
5. **GCR calculation**: GCR = panel_width / pitch
   - Example: 1.95m / 6.0m = 0.325 GCR

**Critical understanding about tracking systems:**
- **Single-axis tracking**: Panels are FLAT (tilt ≈ 0°) and rotate East-West (±50-60°). The rotation range is NOT the tilt angle.
- **Fixed tilt**: Panels are mounted at a fixed angle (typically 15-30°) and never move.
- **Dual-axis tracking**: Panels track both azimuth and elevation.
- For single-axis tracking, always set tiltAngle to 0 (the panels lie flat on the tracker axis).

**Equipment detection (PCUs/Inverters) - Two-stage approach:**

**Stage 1 - Wide scan (zoom 17-18):**
- Scan the site to identify potential PCU locations
- PCUs are typically 40ft shipping containers (~12m × 2.4m)
- Look for rectangular white/grey objects along access roads or between panel blocks
- They appear as bright rectangular shapes in regular patterns
- Note the coordinates of potential PCU clusters

**Stage 2 - Confirmation (zoom 19-20):**
- Zoom in on suspected PCU locations to confirm
- At zoom 20: 40ft container (~12m long) should be ~80 pixels
- At zoom 20: container width (~2.4m) should be ~16 pixels
- Measure suspected objects - if dimensions match, it's a PCU
- Count all confirmed PCUs across the site
- Each PCU typically contains 2-4 inverters

**Important:**
- Use multiple zoom levels: wide scan first, then zoom confirmation
- Don't guess - if you can't confirm dimensions, set counts to -1
- Request images of different sections to ensure complete coverage

**Important:**
- The provided coordinates may be approximate - the farm might be offset by 100-1000m
- Large farms (100+ MW) can span 2-3 km - you may need multiple views
- Request as many images as needed to get accurate measurements
- Always use zoom 20 for pitch/GCR measurements - don't estimate from lower zoom levels
- For PCU counting, scan wide first (zoom 17-18), then confirm with zoom 19-20
- When confident with your measurements, return your analysis with confidence scores`;

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "fetch_satellite_image",
        description: "Fetch a satellite image at specific coordinates and zoom level. Use this to explore the area and gather information about the solar farm.",
        parameters: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              description: "Latitude in decimal degrees"
            },
            longitude: {
              type: "number",
              description: "Longitude in decimal degrees"
            },
            zoom: {
              type: "integer",
              description: "Zoom level (15=wide 5km, 16=medium 2km, 17=closer 1km, 18-19=detailed 250-500m)",
              minimum: 15,
              maximum: 19
            },
            reason: {
              type: "string",
              description: "Why you want this image (e.g., 'Check if farm extends north', 'Measure GCR in this section')"
            }
          },
          required: ["latitude", "longitude", "zoom", "reason"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "submit_analysis",
        description: "Submit your final analysis when you have gathered enough information. Include all required fields with confidence scores.",
        parameters: {
          type: "object",
          properties: {
            refinedLat: { type: "number", description: "Refined center latitude of the solar array" },
            refinedLon: { type: "number", description: "Refined center longitude of the solar array" },
            coordinateConfidence: { type: "integer", description: "Confidence in coordinates (0-100)" },
            trackingType: { type: "string", enum: ["fixed", "single_axis", "dual_axis"] },
            axisAzimuth: { type: "number", description: "Axis azimuth in degrees (0=North, 90=East)" },
            tiltAngle: { type: "number", description: "Tilt angle in degrees. For single-axis tracking, this should be 0 (panels are flat). For fixed tilt, typically 15-30 degrees." },
            gcr: { type: "number", description: "Ground Coverage Ratio (0-1)" },
            pitch: { type: "number", description: "Row spacing in meters" },
            inverterCount: { type: "integer", description: "Number of inverters visible, or -1 if unknown" },
            pcuCount: { type: "integer", description: "Number of PCUs visible, or -1 if unknown" },
            trackingConfidence: { type: "integer", description: "Confidence in tracking type (0-100)" },
            gcrConfidence: { type: "integer", description: "Confidence in GCR measurement (0-100)" },
            pitchConfidence: { type: "integer", description: "Confidence in pitch measurement (0-100)" },
            equipmentConfidence: { type: "integer", description: "Confidence in equipment counts (0-100)" },
            notes: { type: "string", description: "Additional observations and analysis notes" }
          },
          required: ["refinedLat", "refinedLon", "coordinateConfidence", "trackingType", "axisAzimuth", "tiltAngle", "gcr", "pitch", "inverterCount", "pcuCount", "trackingConfidence", "gcrConfidence", "pitchConfidence", "equipmentConfidence", "notes"]
        }
      }
    }
  ];

  const messages: Array<{ role: string; content: string | Array<{ type: string; image_url?: { url: string }; text?: string }> }> = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: `Here is the initial wide view (zoom ${initialZoom}) at the approximate coordinates (${approximateLat}, ${approximateLon}). Begin your analysis.` },
        { type: "image_url", image_url: { url: initialImageUrl } }
      ]
    }
  ];

  let finalResult: AnalysisResult | null = null;

  while (iteration < maxIterations && !finalResult) {
    iteration++;
    console.log(`\n📡 Iteration ${iteration}/${maxIterations}`);
    
    try {
      const response = await invokeLLM({
        messages: messages as any,
        tools,
        tool_choice: "auto"
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Log what we got back
      console.log(`   Finish reason: ${choice.finish_reason}`);
      if (message.content) {
        const contentStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        console.log(`   Message: ${contentStr.substring(0, 200)}...`);
      }
      if (message.tool_calls) {
        console.log(`   Tool calls: ${message.tool_calls.length}`);
      }

      // Add assistant's response to conversation
      messages.push({ role: "assistant", content: message.content || "" });

      // Check if LLM wants to call a function (check tool_calls regardless of finish_reason)
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          console.log(`🔧 Function call: ${functionName}`);
          console.log(`   Args:`, args);

          if (functionName === "fetch_satellite_image") {
            const { latitude, longitude, zoom, reason } = args;
            console.log(`   Reason: ${reason}`);
            
            const imageUrl = await fetchSatelliteImage(latitude, longitude, zoom);
            imagesFetched.push({ lat: latitude, lon: longitude, zoom, url: imageUrl });

            // Add function result to conversation with image
            messages.push({
              role: "user",
              content: [
                { type: "text", text: `Image at (${latitude}, ${longitude}) zoom ${zoom}:` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            });
          } else if (functionName === "submit_analysis") {
            console.log(`✅ Analysis submitted!`);
            finalResult = {
              ...args,
              imagesAnalyzed: imagesFetched.length
            } as AnalysisResult;
            break; // Break out of tool_calls loop
          }
        }
        
        // If analysis was submitted, break out of main iteration loop
        if (finalResult) {
          break;
        }
      } else {
        // LLM finished without calling functions - shouldn't happen but handle it
        console.log(`⚠️  LLM finished without submitting analysis`);
        break;
      }
    } catch (error) {
      console.error(`❌ Error in iteration ${iteration}:`, error);
      break;
    }
  }

  if (!finalResult) {
    throw new Error(`Failed to complete analysis after ${iteration} iterations`);
  }

  console.log(`\n✅ Analysis complete! Used ${finalResult.imagesAnalyzed} images`);
  return finalResult;
}

/**
 * Run analysis and update database for a specific site
 */
export async function analyzeAndUpdateSite(siteId: number): Promise<AnalysisResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get site info
  const site = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site || site.length === 0) {
    throw new Error(`Site ${siteId} not found`);
  }

  const siteData = site[0];
  const result = await analyzeSolarFarmIterative(
    siteData.name,
    parseFloat(siteData.latitude || "0"),
    parseFloat(siteData.longitude || "0"),
    parseFloat(siteData.capacityDcMw || "0")
  );

  // Update site coordinates if refined
  if (result.coordinateConfidence > 50) {
    await db.update(sites)
      .set({
        latitude: result.refinedLat.toString(),
        longitude: result.refinedLon.toString()
      })
      .where(eq(sites.id, siteId));
    console.log(`📍 Updated site coordinates`);
  }

  // Update or insert configuration
  const existingConfig = await db.select()
    .from(siteConfigurations)
    .where(eq(siteConfigurations.siteId, siteId))
    .limit(1);

  const configData = {
    siteId,
    trackingType: result.trackingType,
    axisAzimuth: result.axisAzimuth.toString(),
    tiltAngle: result.tiltAngle.toString(),
    gcr: result.gcr.toString(),
    pitch: result.pitch > 0 ? result.pitch.toString() : null,
    inverterCount: result.inverterCount > 0 ? result.inverterCount : null,
    pcuCount: result.pcuCount > 0 ? result.pcuCount : null,
    detectionMethod: "satellite" as const,
    confidence: result.trackingConfidence,
    notes: result.notes
  };

  if (existingConfig && existingConfig.length > 0) {
    await db.update(siteConfigurations)
      .set(configData)
      .where(eq(siteConfigurations.id, existingConfig[0].id));
  } else {
    await db.insert(siteConfigurations).values([configData]);
  }

  console.log(`💾 Database updated`);
  return result;
}
