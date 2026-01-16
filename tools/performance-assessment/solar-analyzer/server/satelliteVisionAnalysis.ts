/**
 * Satellite Vision Analysis using GPT-4 Vision
 * 
 * This module uses GPT-4 Vision to analyze Google Maps satellite imagery
 * and extract comprehensive solar farm configuration data:
 * - Refined coordinates (actual solar array center)
 * - GCR (Ground Coverage Ratio)
 * - Pitch (row spacing in meters)
 * - Inverter/PCU count
 * - Tracking configuration validation
 */

import { ollamaVisionJSON } from "./_core/ollama";
import { ENV } from "./_core/env";

export interface SatelliteAnalysisResult {
  // Refined location
  refinedLat: number;
  refinedLon: number;
  coordinateConfidence: number; // 0-100
  
  // Configuration parameters
  trackingType: "fixed" | "single_axis" | "dual_axis";
  axisAzimuth: number; // degrees from north
  tiltAngle: number; // degrees from horizontal
  gcr: number; // Ground Coverage Ratio (0-1)
  pitch: number; // meters between rows
  
  // Equipment counts (-1 means not detected)
  inverterCount: number;
  pcuCount: number;
  
  // Confidence scores
  trackingConfidence: number; // 0-100
  gcrConfidence: number; // 0-100
  pitchConfidence: number; // 0-100
  equipmentConfidence: number; // 0-100
  
  // Analysis metadata
  imageUrl: string;
  analysisDate: Date;
  notes: string;
}

/**
 * Analyze a solar farm using GPT-4 Vision on Google Maps satellite imagery
 */
export async function analyzeSolarFarmSatellite(
  siteName: string,
  approximateLat: number,
  approximateLon: number,
  capacityMw: number
): Promise<SatelliteAnalysisResult> {
  // Generate Google Maps Static API URL for satellite imagery
  // Using zoom level 18 for detailed view
  const zoom = 18;
  const size = "640x640";
  const mapType = "satellite";
  
  // Use Manus Google Maps proxy for authenticated access
  const { ENV } = await import("./_core/env");
  const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "") || "";
  const apiKey = ENV.forgeApiKey || "";
  const imageUrl = `${baseUrl}/v1/maps/proxy/maps/api/staticmap?center=${approximateLat},${approximateLon}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${apiKey}`;
  
  const prompt = `You are an expert solar energy engineer analyzing satellite imagery of solar farms. 

Analyze this satellite image of "${siteName}" (${capacityMw} MW capacity) located at approximately ${approximateLat}°, ${approximateLon}°.

Provide a detailed analysis in JSON format with the following information:

1. **Refined Coordinates**: Identify the exact center of the solar array and provide refined latitude/longitude coordinates. Rate your confidence (0-100).

2. **Tracking Configuration**:
   - Tracking type: FIXED, SINGLE_AXIS (specify if N-S or E-W), or DUAL_AXIS
   - For single-axis: axis azimuth in degrees from north (0° = N-S, 90° = E-W)
   - Tilt angle: estimated tilt from horizontal in degrees
   - Confidence score (0-100)

3. **Ground Coverage Ratio (GCR)**:
   - Measure the ratio of panel area to ground area
   - Typical range: 0.25-0.50 for tracking, 0.35-0.60 for fixed
   - Confidence score (0-100)

4. **Pitch (Row Spacing)**:
   - Estimate the distance between panel rows in meters
   - Use the site capacity and visible array size to calibrate
   - Confidence score (0-100)

5. **Equipment Count**:
   - Count visible inverters/PCUs (power conversion units)
   - These typically appear as rectangular buildings/containers
   - Use -1 if equipment is not visible or cannot be counted
   - Confidence score (0-100)

6. **Analysis Notes**:
   - Image quality assessment
   - Any obstructions or unclear areas
   - Recommendations for confidence improvement

Return ONLY valid JSON in this exact format:
{
  "refinedLat": number,
  "refinedLon": number,
  "coordinateConfidence": number,
  "trackingType": "FIXED" | "SINGLE_AXIS" | "DUAL_AXIS",
  "axisAzimuth": number,
  "tiltAngle": number,
  "gcr": number,
  "pitch": number,
  "inverterCount": number (use -1 if not detected),
  "pcuCount": number (use -1 if not detected),
  "trackingConfidence": number,
  "gcrConfidence": number,
  "pitchConfidence": number,
  "equipmentConfidence": number,
  "notes": string
}`;

  try {
    console.log("Calling Ollama vision analysis...");
    
    const analysis = await ollamaVisionJSON(
      imageUrl,
      prompt,
      ENV.OLLAMA_VISION_MODEL,
      "You are an expert solar energy engineer analyzing satellite imagery of solar farms. Provide detailed, accurate analysis in JSON format."
    );
    
    console.log("Ollama vision response received:", JSON.stringify(analysis, null, 2));

    return {
      ...analysis,
      imageUrl,
      analysisDate: new Date(),
    };
  } catch (error) {
    console.error("Satellite analysis failed:", error);
    throw new Error(`Failed to analyze satellite imagery: ${error}`);
  }
}

/**
 * Update site configuration with satellite analysis results
 */
export async function updateSiteWithSatelliteAnalysis(
  siteId: number,
  analysis: SatelliteAnalysisResult
): Promise<void> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }
  const { sites, siteConfigurations } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Update site coordinates if confidence is high enough
  if (analysis.coordinateConfidence >= 70) {
    await db
      .update(sites)
      .set({
        latitude: analysis.refinedLat.toString(),
        longitude: analysis.refinedLon.toString(),
      })
      .where(eq(sites.id, siteId));
  }

  // Update or create configuration with satellite data
  const existingConfig = await db
    .select()
    .from(siteConfigurations)
    .where(eq(siteConfigurations.siteId, siteId))
    .limit(1);

  const configData = {
    siteId,
    trackingType: analysis.trackingType.toLowerCase().replace("_", "_") as "fixed" | "single_axis" | "dual_axis",
    axisAzimuth: analysis.axisAzimuth.toString(),
    tiltAngle: analysis.tiltAngle.toString(),
    gcr: analysis.gcr.toString(),
    pitch: analysis.pitch.toString(),
    inverterCount: analysis.inverterCount === -1 ? null : analysis.inverterCount,
    pcuCount: analysis.pcuCount === -1 ? null : analysis.pcuCount,
    detectionMethod: "satellite" as const,
    confidence: Math.round(
      (analysis.trackingConfidence +
        analysis.gcrConfidence +
        analysis.pitchConfidence +
        analysis.equipmentConfidence) /
        4
    ),
    detectedAt: new Date(),
  };

  if (existingConfig.length > 0) {
    await db
      .update(siteConfigurations)
      .set(configData)
      .where(eq(siteConfigurations.id, existingConfig[0].id));
  } else {
    await db.insert(siteConfigurations).values(configData);
  }
}
