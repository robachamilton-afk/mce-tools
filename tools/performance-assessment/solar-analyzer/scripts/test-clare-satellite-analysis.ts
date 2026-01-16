/**
 * Test satellite vision analysis on Clare Solar Farm
 */

import { analyzeSolarFarmSatellite, updateSiteWithSatelliteAnalysis } from "../server/satelliteVisionAnalysis";

async function main() {
  console.log("🛰️  Testing Satellite Vision Analysis on Clare Solar Farm");
  console.log("=" .repeat(60));
  
  // Clare Solar Farm details
  const clareSite = {
    id: 114,
    name: "CLARE SOLAR FARM",
    duid: "CLARESF1",
    latitude: -19.8397,
    longitude: 147.2106,
    capacityMw: 127.8,
  };
  
  console.log(`\nSite: ${clareSite.name} (${clareSite.duid})`);
  console.log(`Approximate Location: ${clareSite.latitude}°, ${clareSite.longitude}°`);
  console.log(`Capacity: ${clareSite.capacityMw} MW DC`);
  console.log("\nAnalyzing satellite imagery...\n");
  
  try {
    const analysis = await analyzeSolarFarmSatellite(
      clareSite.name,
      clareSite.latitude,
      clareSite.longitude,
      clareSite.capacityMw
    );
    
    console.log("✅ Analysis Complete!");
    console.log("\n📍 REFINED COORDINATES:");
    console.log(`  Latitude: ${analysis.refinedLat}° (confidence: ${analysis.coordinateConfidence}%)`);
    console.log(`  Longitude: ${analysis.refinedLon}°`);
    console.log(`  Shift: ${Math.abs(analysis.refinedLat - clareSite.latitude).toFixed(4)}° lat, ${Math.abs(analysis.refinedLon - clareSite.longitude).toFixed(4)}° lon`);
    
    console.log("\n⚙️  CONFIGURATION:");
    console.log(`  Tracking Type: ${analysis.trackingType} (confidence: ${analysis.trackingConfidence}%)`);
    console.log(`  Axis Azimuth: ${analysis.axisAzimuth}°`);
    console.log(`  Tilt Angle: ${analysis.tiltAngle}°`);
    console.log(`  GCR: ${analysis.gcr} (confidence: ${analysis.gcrConfidence}%)`);
    console.log(`  Pitch: ${analysis.pitch}m (confidence: ${analysis.pitchConfidence}%)`);
    
    console.log("\n🔌 EQUIPMENT:");
    console.log(`  Inverters: ${analysis.inverterCount ?? 'Not detected'}`);
    console.log(`  PCUs: ${analysis.pcuCount ?? 'Not detected'}`);
    console.log(`  Equipment Confidence: ${analysis.equipmentConfidence}%`);
    
    console.log("\n📝 NOTES:");
    console.log(`  ${analysis.notes}`);
    
    console.log("\n💾 Updating database...");
    await updateSiteWithSatelliteAnalysis(clareSite.id, analysis);
    console.log("✅ Database updated successfully!");
    
    // Save full results to file
    const fs = await import("fs/promises");
    await fs.writeFile(
      "/home/ubuntu/clare-satellite-analysis.json",
      JSON.stringify(analysis, null, 2)
    );
    console.log("\n📄 Full results saved to: /home/ubuntu/clare-satellite-analysis.json");
    
  } catch (error) {
    console.error("\n❌ Analysis failed:", error);
    process.exit(1);
  }
}

main();
