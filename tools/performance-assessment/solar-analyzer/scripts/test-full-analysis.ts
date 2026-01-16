/**
 * Test full satellite analysis: config detection + grid-based PCU detection
 */

import { analyzeConfigurationOnly } from "../server/satelliteConfigAnalysis";
import { detectPCUsGrid } from "../server/satellitePCUDetectionGrid";

async function main() {
  console.log("🛰️  FULL SATELLITE ANALYSIS TEST");
  console.log("=" .repeat(70));
  console.log("Site: Clare Solar Farm");
  console.log("Expected config: pitch ~5.87m, GCR ~0.337, single-axis, 0° azimuth");
  console.log("Expected equipment: 23 PCUs, 69 inverters");
  console.log("=" .repeat(70));
  console.log();

  try {
    // PHASE 1 & 2: Configuration Analysis
    console.log("📍 PHASE 1 & 2: Configuration Analysis");
    console.log("-" .repeat(70));
    
    const configResult = await analyzeConfigurationOnly(
      "Clare Solar Farm",
      -19.8397,
      147.208
    );

    console.log("\n✅ Configuration analysis complete!");
    console.log(`   Location: (${configResult.refinedLatitude}, ${configResult.refinedLongitude})`);
    console.log(`   Tracking: ${configResult.trackingType}`);
    console.log(`   Pitch: ${configResult.pitch}m (expected: 5.87m)`);
    console.log(`   GCR: ${configResult.gcr.toFixed(3)} (expected: 0.337)`);
    console.log(`   Site size: ${configResult.estimatedSizeKm.width.toFixed(2)}km × ${configResult.estimatedSizeKm.height.toFixed(2)}km`);
    console.log(`   Bounding box: [${configResult.boundingBox.minLat.toFixed(4)}, ${configResult.boundingBox.maxLat.toFixed(4)}] × [${configResult.boundingBox.minLon.toFixed(4)}, ${configResult.boundingBox.maxLon.toFixed(4)}]`);
    
    // PHASE 3: Grid-based PCU Detection
    console.log("\n\n📦 PHASE 3: Grid-Based PCU Detection");
    console.log("-" .repeat(70));
    
    const pcuResult = await detectPCUsGrid(
      "Clare Solar Farm",
      configResult.refinedLatitude,
      configResult.refinedLongitude,
      configResult.boundingBox,
      configResult.estimatedSizeKm
    );

    console.log("\n✅ PCU detection complete!");
    console.log(`   PCUs detected: ${pcuResult.pcuCount} (expected: 23)`);
    console.log(`   Inverters estimated: ${pcuResult.inverterCount} (expected: 69)`);
    console.log(`   Confidence: ${pcuResult.detectionConfidence}%`);
    console.log(`   Grid cells scanned: ${pcuResult.imagesAnalyzed}`);
    
    // FINAL RESULTS
    console.log("\n\n🎯 FINAL RESULTS");
    console.log("=" .repeat(70));
    
    console.log("\n📍 LOCATION:");
    console.log(`   Coordinates: ${configResult.refinedLatitude}°, ${configResult.refinedLongitude}°`);
    console.log(`   Site dimensions: ${configResult.estimatedSizeKm.width.toFixed(2)}km × ${configResult.estimatedSizeKm.height.toFixed(2)}km`);
    
    console.log("\n⚙️  CONFIGURATION:");
    console.log(`   Tracking: ${configResult.trackingType} (${configResult.trackingConfidence}% confidence)`);
    console.log(`   Azimuth: ${configResult.azimuthAngle}°`);
    console.log(`   Tilt: ${configResult.tiltAngle}°`);
    console.log(`   Pitch: ${configResult.pitch}m`);
    console.log(`   GCR: ${configResult.gcr.toFixed(3)}`);
    
    console.log("\n🔌 EQUIPMENT:");
    console.log(`   PCUs: ${pcuResult.pcuCount}`);
    console.log(`   Inverters: ${pcuResult.inverterCount}`);
    
    console.log("\n📊 ACCURACY:");
    const pitchError = Math.abs(configResult.pitch - 5.87) / 5.87 * 100;
    const gcrError = Math.abs(configResult.gcr - 0.337) / 0.337 * 100;
    const pcuError = Math.abs(pcuResult.pcuCount - 23);
    
    console.log(`   Pitch error: ${pitchError.toFixed(1)}% (${configResult.pitch}m vs 5.87m)`);
    console.log(`   GCR error: ${gcrError.toFixed(1)}% (${configResult.gcr.toFixed(3)} vs 0.337)`);
    console.log(`   PCU error: ${pcuError} units (${pcuResult.pcuCount} vs 23)`);
    console.log(`   Tracking: ${configResult.trackingType === 'single_axis' ? '✅ CORRECT' : '❌ WRONG'}`);
    
    console.log("\n⚡ EFFICIENCY:");
    const totalImages = configResult.imagesAnalyzed + pcuResult.imagesAnalyzed;
    console.log(`   Total images analyzed: ${totalImages}`);
    console.log(`   Config phase: ${configResult.imagesAnalyzed} images`);
    console.log(`   PCU phase: ${pcuResult.imagesAnalyzed} images`);
    
    console.log("\n" + "=" .repeat(70));
    
    const isConfigAccurate = pitchError < 15 && gcrError < 20 && configResult.trackingType === 'single_axis';
    const isPCUAccurate = pcuError <= 5;
    
    if (isConfigAccurate && isPCUAccurate) {
      console.log("🎉 SUCCESS: Full analysis is accurate!");
    } else if (isConfigAccurate) {
      console.log("✅ Config accurate, PCU count needs improvement");
    } else if (isPCUAccurate) {
      console.log("✅ PCU count accurate, config needs improvement");
    } else {
      console.log("⚠️  Both phases need improvement");
    }
    
  } catch (error) {
    console.error("\n❌ ANALYSIS FAILED:");
    console.error(error);
    process.exit(1);
  }
}

main();
