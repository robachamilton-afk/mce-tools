/**
 * Test focused configuration analysis on Clare Solar Farm
 */

import { analyzeConfigurationOnly } from "../server/satelliteConfigAnalysis";

async function main() {
  console.log("🛰️  Testing Focused Configuration Analysis");
  console.log("=" .repeat(70));
  console.log("Site: Clare Solar Farm");
  console.log("Expected: pitch ~5.87m, GCR ~0.337, single-axis tracking, 0° azimuth");
  console.log("=" .repeat(70));
  console.log();

  try {
    const result = await analyzeConfigurationOnly(
      "Clare Solar Farm",
      -19.8397,
      147.208
    );

    console.log("\n✅ CONFIGURATION ANALYSIS COMPLETE!");
    console.log("=" .repeat(70));
    
    console.log("\n📍 LOCATION:");
    console.log(`  Refined coordinates: ${result.refinedLatitude}°, ${result.refinedLongitude}°`);
    console.log(`  Confidence: ${result.coordinateConfidence}%`);
    
    console.log("\n⚙️  CONFIGURATION:");
    console.log(`  Tracking type: ${result.trackingType} (${result.trackingConfidence}% confidence)`);
    console.log(`  Azimuth: ${result.azimuthAngle}° (${result.azimuthConfidence}% confidence)`);
    console.log(`  Tilt: ${result.tiltAngle}°`);
    console.log(`  Pitch: ${result.pitch}m (${result.pitchConfidence}% confidence)`);
    console.log(`  GCR: ${result.gcr.toFixed(3)} (${result.gcrConfidence}% confidence)`);
    
    console.log("\n📊 ACCURACY CHECK:");
    const expectedPitch = 5.87;
    const expectedGCR = 0.337;
    const pitchError = Math.abs(result.pitch - expectedPitch) / expectedPitch * 100;
    const gcrError = Math.abs(result.gcr - expectedGCR) / expectedGCR * 100;
    
    console.log(`  Pitch error: ${pitchError.toFixed(1)}% (${result.pitch}m vs ${expectedPitch}m expected)`);
    console.log(`  GCR error: ${gcrError.toFixed(1)}% (${result.gcr.toFixed(3)} vs ${expectedGCR.toFixed(3)} expected)`);
    console.log(`  Tracking type: ${result.trackingType === 'single_axis' ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`  Azimuth: ${result.azimuthAngle === 0 ? '✅ CORRECT' : '❌ WRONG'}`);
    
    console.log("\n📝 ANALYSIS NOTES:");
    console.log(`  ${result.analysisNotes}`);
    
    console.log("\n📸 EFFICIENCY:");
    console.log(`  Images analyzed: ${result.imagesAnalyzed}`);
    console.log(`  Target: ≤3 iterations (2 location + 1 measurement)`);
    console.log(`  Status: ${result.imagesAnalyzed <= 3 ? '✅ EFFICIENT' : '⚠️  COULD BE MORE EFFICIENT'}`);
    
    console.log("\n" + "=" .repeat(70));
    
    // Overall assessment
    const isAccurate = pitchError < 15 && gcrError < 20 && result.trackingType === 'single_axis';
    const isEfficient = result.imagesAnalyzed <= 3;
    
    if (isAccurate && isEfficient) {
      console.log("🎉 SUCCESS: Analysis is accurate and efficient!");
    } else if (isAccurate) {
      console.log("✅ ACCURATE: Results are good, but could be more efficient");
    } else {
      console.log("⚠️  NEEDS IMPROVEMENT: Results not accurate enough");
    }
    
  } catch (error) {
    console.error("\n❌ ANALYSIS FAILED:");
    console.error(error);
    process.exit(1);
  }
}

main();
