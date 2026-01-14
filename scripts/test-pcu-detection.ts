/**
 * Test PCU detection on Clare Solar Farm
 */

import { detectPCUs } from "../server/satellitePCUDetection";

async function main() {
  console.log("🔍 Testing PCU Detection");
  console.log("=" .repeat(70));
  console.log("Site: Clare Solar Farm");
  console.log("Expected: 23 PCUs (69 inverters total, 3 per PCU)");
  console.log("Capacity: 100 MW");
  console.log("=" .repeat(70));
  console.log();

  try {
    const result = await detectPCUs(
      "Clare Solar Farm",
      -19.8397,
      147.208,
      100 // 100 MW capacity
    );

    console.log("\n✅ PCU DETECTION COMPLETE!");
    console.log("=" .repeat(70));
    
    console.log("\n📊 DETECTION RESULTS:");
    console.log(`  PCUs detected: ${result.pcuCount}`);
    console.log(`  Inverters estimated: ${result.inverterCount} (${result.pcuCount} × 3)`);
    console.log(`  Detection confidence: ${result.detectionConfidence}%`);
    console.log(`  Images analyzed: ${result.imagesAnalyzed}`);
    
    console.log("\n📍 PCU LOCATIONS:");
    result.pcuLocations.forEach((pcu, index) => {
      const verifiedStr = pcu.verified ? "✓ verified" : "unverified";
      console.log(`  PCU ${index + 1}: (${pcu.latitude.toFixed(4)}, ${pcu.longitude.toFixed(4)}) - ${pcu.confidence}% ${verifiedStr}`);
    });
    
    console.log("\n📝 DETECTION NOTES:");
    console.log(`  ${result.detectionNotes}`);
    
    console.log("\n🎯 ACCURACY CHECK:");
    const expectedPCUs = 23;
    const expectedInverters = 69;
    const pcuError = Math.abs(result.pcuCount - expectedPCUs);
    const pcuErrorPercent = (pcuError / expectedPCUs * 100).toFixed(1);
    const inverterError = Math.abs(result.inverterCount - expectedInverters);
    
    console.log(`  Expected PCUs: ${expectedPCUs}`);
    console.log(`  Detected PCUs: ${result.pcuCount}`);
    console.log(`  Error: ${pcuError} PCUs (${pcuErrorPercent}%)`);
    console.log(`  Expected inverters: ${expectedInverters}`);
    console.log(`  Estimated inverters: ${result.inverterCount}`);
    console.log(`  Error: ${inverterError} inverters`);
    
    const verifiedCount = result.pcuLocations.filter(p => p.verified).length;
    console.log(`\n  Verified PCUs: ${verifiedCount}/${result.pcuCount}`);
    console.log(`  Verification rate: ${(verifiedCount / result.pcuCount * 100).toFixed(0)}%`);
    
    console.log("\n" + "=" .repeat(70));
    
    // Overall assessment
    const isAccurate = pcuError <= 5; // Within 5 PCUs is acceptable
    const isWellVerified = verifiedCount >= result.pcuCount * 0.5; // At least 50% verified
    
    if (isAccurate && isWellVerified) {
      console.log("🎉 SUCCESS: PCU detection is accurate and well-verified!");
    } else if (isAccurate) {
      console.log("✅ GOOD: Count is close, but verification could be improved");
    } else {
      console.log(`⚠️  NEEDS IMPROVEMENT: Count is off by ${pcuError} PCUs`);
    }
    
  } catch (error) {
    console.error("\n❌ DETECTION FAILED:");
    console.error(error);
    process.exit(1);
  }
}

main();
