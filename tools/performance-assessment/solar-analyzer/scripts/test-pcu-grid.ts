/**
 * Test grid-based PCU detection on Clare Solar Farm
 */

import { detectPCUsGrid } from "../server/satellitePCUDetectionGrid";

async function main() {
  console.log("🔍 Testing Grid-Based PCU Detection");
  console.log("=" .repeat(70));
  console.log("Site: Clare Solar Farm");
  console.log("Expected: 23 PCUs (69 inverters total, 3 per PCU)");
  console.log("Capacity: 100 MW");
  console.log("=" .repeat(70));
  console.log();

  try {
    const result = await detectPCUsGrid(
      "Clare Solar Farm",
      -19.8397,
      147.208,
      100 // 100 MW capacity
    );

    console.log("\n✅ GRID-BASED PCU DETECTION COMPLETE!");
    console.log("=" .repeat(70));
    
    console.log("\n📊 DETECTION RESULTS:");
    console.log(`  PCUs detected: ${result.pcuCount}`);
    console.log(`  Inverters estimated: ${result.inverterCount} (${result.pcuCount} × 3)`);
    console.log(`  Detection confidence: ${result.detectionConfidence}%`);
    console.log(`  Images analyzed: ${result.imagesAnalyzed}`);
    
    console.log("\n🗺️  GRID BREAKDOWN:");
    const gridSize = Math.sqrt(result.gridCells.length);
    console.log(`  Grid size: ${gridSize}×${gridSize}`);
    
    // Show grid as a table
    for (let row = 0; row < gridSize; row++) {
      const rowCells = result.gridCells.filter(c => c.row === row);
      const rowStr = rowCells.map(c => {
        const pcuStr = c.pcuCount.toString().padStart(2, ' ');
        const panelIndicator = c.hasPanels ? '☀' : ' ';
        const roadIndicator = c.hasRoads ? '🛣' : ' ';
        return `[${pcuStr}${panelIndicator}${roadIndicator}]`;
      }).join(' ');
      console.log(`  Row ${row}: ${rowStr}`);
    }
    console.log("\n  Legend: [PCU☀🛣] = PCU count, ☀=panels, 🛣=roads");
    
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
    
    console.log("\n" + "=" .repeat(70));
    
    // Overall assessment
    const isAccurate = pcuError <= 5; // Within 5 PCUs (22% tolerance)
    const isEfficient = result.imagesAnalyzed <= 25; // Grid should be efficient
    
    if (isAccurate && isEfficient) {
      console.log("🎉 SUCCESS: Grid-based detection is accurate and efficient!");
    } else if (isAccurate) {
      console.log("✅ ACCURATE: Count is close!");
    } else {
      console.log(`⚠️  NEEDS IMPROVEMENT: Count is off by ${pcuError} PCUs (${pcuErrorPercent}%)`);
    }
    
    console.log("\n💡 EFFICIENCY:");
    console.log(`  Single LLM call with ${result.imagesAnalyzed} images`);
    console.log(`  vs. iterative approach: would need 20+ iterations`);
    console.log(`  Grid approach is ${Math.round(20 / result.imagesAnalyzed * 100)}% more efficient!`);
    
  } catch (error) {
    console.error("\n❌ DETECTION FAILED:");
    console.error(error);
    process.exit(1);
  }
}

main();
