/**
 * Mapbox Static Images API Integration
 * 
 * Provides satellite imagery for solar farm analysis using Mapbox.
 * Replaces Google Maps dependency with free Mapbox alternative.
 * 
 * Free tier: 50,000 map loads/month, 100,000 static image requests/month
 * Docs: https://docs.mapbox.com/api/maps/static-images/
 */

import { ENV } from "./env";

/**
 * Generate Mapbox Static Image URL for satellite imagery
 * 
 * @param lat - Latitude in decimal degrees
 * @param lon - Longitude in decimal degrees
 * @param zoom - Zoom level (1-22, higher = more detail)
 * @param width - Image width in pixels (max 1280)
 * @param height - Image height in pixels (max 1280)
 * @returns URL to fetch satellite image
 * 
 * Zoom level reference:
 * - 15: Wide area view (~5km coverage)
 * - 17: Site overview (~1.2km coverage)
 * - 18: Detailed view (~600m coverage)
 * - 19: Close-up (~300m coverage)
 * - 20: Very detailed (~150m coverage, for measurements)
 */
export function getMapboxSatelliteUrl(
  lat: number,
  lon: number,
  zoom: number,
  width: number = 640,
  height: number = 640
): string {
  const token = ENV.MAPBOX_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error(
      "Mapbox access token missing: set MAPBOX_ACCESS_TOKEN in .env file. " +
      "Get a free token at https://account.mapbox.com/"
    );
  }
  
  // Mapbox Static Images API format:
  // https://api.mapbox.com/styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}{@2x}
  
  const style = "mapbox/satellite-v9"; // High-quality satellite imagery
  const bearing = 0; // North-up orientation
  const pitch = 0; // Top-down view
  const retina = width <= 640 && height <= 640 ? "@2x" : ""; // High DPI for smaller images
  
  return `https://api.mapbox.com/styles/v1/${style}/static/${lon},${lat},${zoom},${bearing},${pitch}/${width}x${height}${retina}?access_token=${token}`;
}

/**
 * Check if Mapbox is configured
 */
export function isMapboxConfigured(): boolean {
  return !!ENV.MAPBOX_ACCESS_TOKEN;
}

/**
 * Fetch satellite image from Mapbox and return as base64
 * 
 * @param lat - Latitude
 * @param lon - Longitude  
 * @param zoom - Zoom level
 * @param width - Image width
 * @param height - Image height
 * @returns Base64-encoded image data URL
 */
export async function fetchMapboxSatelliteImage(
  lat: number,
  lon: number,
  zoom: number,
  width: number = 640,
  height: number = 640
): Promise<string> {
  const url = getMapboxSatelliteUrl(lat, lon, zoom, width, height);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(
      `Mapbox API error: ${response.status} ${response.statusText}`
    );
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  
  return `data:image/png;base64,${base64}`;
}

/**
 * Calculate approximate ground coverage for a given zoom level
 * 
 * @param zoom - Mapbox zoom level (1-22)
 * @param latitude - Latitude (affects scale due to Mercator projection)
 * @param imageSize - Image dimension in pixels (assumes square)
 * @returns Approximate coverage in meters
 */
export function calculateGroundCoverage(
  zoom: number,
  latitude: number,
  imageSize: number = 640
): { metersPerPixel: number; totalCoverageMeters: number } {
  // At zoom level 0, the entire world (40,075 km at equator) fits in 256 pixels
  // Each zoom level doubles the resolution
  const earthCircumference = 40075000; // meters
  const metersPerPixelAtEquator = earthCircumference / (256 * Math.pow(2, zoom));
  
  // Adjust for latitude (Mercator projection)
  const metersPerPixel = metersPerPixelAtEquator * Math.cos(latitude * Math.PI / 180);
  const totalCoverageMeters = metersPerPixel * imageSize;
  
  return { metersPerPixel, totalCoverageMeters };
}

/**
 * Recommend zoom level based on desired ground coverage
 * 
 * @param desiredCoverageMeters - Desired coverage in meters
 * @param latitude - Latitude
 * @param imageSize - Image size in pixels
 * @returns Recommended zoom level
 */
export function recommendZoomLevel(
  desiredCoverageMeters: number,
  latitude: number,
  imageSize: number = 640
): number {
  // Try different zoom levels and find the closest match
  for (let zoom = 22; zoom >= 1; zoom--) {
    const { totalCoverageMeters } = calculateGroundCoverage(zoom, latitude, imageSize);
    if (totalCoverageMeters >= desiredCoverageMeters) {
      return zoom;
    }
  }
  return 1; // Fallback to widest view
}
