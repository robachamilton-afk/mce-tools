/**
 * Full workflow test for Clare Solar Farm
 * 1. Config analysis (pitch, GCR, tracking, boundaries)
 * 2. Grid-based PCU detection
 * 3. Save equipment detections to database
 */

import { analyzeConfigurationOnly } from "../server/satelliteConfigAnalysis";
import { detectPCUsGrid } from "../server/satellitePCUDetectionGrid";
import * as db from "../server/db";

async function runFullWorkflow() {
  console.log("🚀 Starting full workflow test for Clare Solar Farm\n");
  console.log("=" + "=".repeat(70) + "\n");

  // Clare Solar Farm details
  const siteName = "Clare Solar Farm";
  const initialLat = -19.8397;
  const initialLon = 147.2050;
  const siteId = 1; // Assuming Clare is site ID 1

  // Step 1: Configuration Analysis
  console.log("📊 STEP 1: Configuration Analysis");
  console.log("-".repeat(70));
  
  let configResult;
  try {
    configResult = await analyzeConfigurationOnly(siteName, initialLat, initialLon);
    
    console.log("\n✅ Configuration Analysis Complete!");
    console.log(`   Pitch: ${configResult.pitch}m`);
    console.log(`   GCR: ${configResult.gcr}`);
    console.log(`   Tracking: ${configResult.trackingType}`);
    console.log(`   Azimuth: ${configResult.azimuth}°`);
    console.log(`   Tilt: ${configResult.tiltAngle}°`);
    console.log(`   Refined coordinates: (${configResult.refinedLatitude}, ${configResult.refinedLongitude})`);
    console.log(`   Site dimensions: ${configResult.estimatedSizeKm.width.toFixed(2)}km × ${configResult.estimatedSizeKm.height.toFixed(2)}km`);
    console.log(`   Iterations used: ${configResult.iterationsUsed}`);
    console.log(`   Confidence: ${configResult.confidenceScore}%`);
  } catch (error) {
    console.error("❌ Configuration analysis failed:", error);
    process.exit(1);
  }

  // Step 2: PCU Detection
  console.log("\n\n📍 STEP 2: Grid-Based PCU Detection");
  console.log("-".repeat(70));
  
  let pcuResult;
  try {
    pcuResult = await detectPCUsGrid(
      siteName,
      configResult.refinedLatitude,
      configResult.refinedLongitude,
      configResult.boundingBox,
      configResult.estimatedSizeKm
    );
    
    console.log("\n✅ PCU Detection Complete!");
    console.log(`   PCUs detected: ${pcuResult.pcuCount}`);
    console.log(`   Inverters (estimated): ${pcuResult.inverterCount}`);
    console.log(`   Confidence: ${pcuResult.detectionConfidence}%`);
    console.log(`   Images analyzed: ${pcuResult.imagesAnalyzed}`);
    console.log(`   Notes: ${pcuResult.detectionNotes}`);
    
    // Show grid breakdown
    console.log("\n   Grid Cell Breakdown:");
    const cellsWithPCUs = pcuResult.gridCells.filter(c => c.pcuCount > 0);
    console.log(`   Cells with PCUs: ${cellsWithPCUs.length} / ${pcuResult.gridCells.length}`);
    
    if (cellsWithPCUs.length > 0) {
      console.log("\n   Cells containing PCUs:");
      cellsWithPCUs.forEach(cell => {
        console.log(`      [${cell.row},${cell.col}]: ${cell.pcuCount} PCU(s) at (${cell.centerLat.toFixed(4)}, ${cell.centerLon.toFixed(4)})`);
      });
    }
  } catch (error) {
    console.error("❌ PCU detection failed:", error);
    process.exit(1);
  }

  // Step 3: Save to Database
  console.log("\n\n💾 STEP 3: Save Equipment Detections to Database");
  console.log("-".repeat(70));
  
  try {
    // Save each detected PCU to the database
    let savedCount = 0;
    for (const cell of pcuResult.gridCells) {
      if (cell.pcuCount > 0) {
        // For each PCU in this cell, create a detection record
        for (let i = 0; i < cell.pcuCount; i++) {
          await db.addEquipmentDetection({
            siteId,
            type: "pcu",
            latitude: cell.centerLat,
            longitude: cell.centerLon,
            status: "auto_detected",
            confidence: pcuResult.detectionConfidence,
            notes: `Detected in grid cell [${cell.row},${cell.col}] via satellite analysis`,
          });
          savedCount++;
        }
      }
    }
    
    console.log(`\n✅ Saved ${savedCount} PCU detections to database`);
    
    // Verify what's in the database
    const savedEquipment = await db.getEquipmentDetections(siteId);
    console.log(`   Total equipment records for site: ${savedEquipment.length}`);
    console.log(`   Status breakdown:`);
    const statusCounts = savedEquipment.reduce((acc: any, e: any) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`      ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error("❌ Database save failed:", error);
    process.exit(1);
  }

  // Summary
  console.log("\n\n" + "=".repeat(70));
  console.log("🎉 WORKFLOW COMPLETE - Summary");
  console.log("=".repeat(70));
  console.log(`\n📊 Configuration:`);
  console.log(`   • Pitch: ${configResult.pitch}m (actual: 5.87m)`);
  console.log(`   • GCR: ${configResult.gcr} (actual: 0.337)`);
  console.log(`   • Tracking: ${configResult.trackingType}`);
  console.log(`   • Site size: ${configResult.estimatedSizeKm.width.toFixed(2)}km × ${configResult.estimatedSizeKm.height.toFixed(2)}km`);
  
  console.log(`\n📍 Equipment:`);
  console.log(`   • PCUs detected: ${pcuResult.pcuCount} (actual: 23)`);
  console.log(`   • Detection confidence: ${pcuResult.detectionConfidence}%`);
  console.log(`   • Saved to database: ✅`);
  
  console.log(`\n📈 Accuracy:`);
  const pitchError = Math.abs((configResult.pitch - 5.87) / 5.87 * 100);
  const gcrError = Math.abs((configResult.gcr - 0.337) / 0.337 * 100);
  const pcuError = Math.abs((pcuResult.pcuCount - 23) / 23 * 100);
  console.log(`   • Pitch error: ${pitchError.toFixed(1)}%`);
  console.log(`   • GCR error: ${gcrError.toFixed(1)}%`);
  console.log(`   • PCU count error: ${pcuError.toFixed(1)}%`);
  
  console.log(`\n🌐 Next Steps:`);
  console.log(`   1. Open http://localhost:3000/site/${siteId}/equipment`);
  console.log(`   2. Review auto-detected PCU markers on the map`);
  console.log(`   3. Verify correct detections (click marker → Verify)`);
  console.log(`   4. Delete false positives (click marker → Delete)`);
  console.log(`   5. Add missing PCUs (select type → click map)`);
  console.log(`   6. Final verified count should be 23 PCUs`);
  
  console.log("\n" + "=".repeat(70));
  console.log("✨ Test complete!\n");
}

runFullWorkflow().catch(error => {
  console.error("\n❌ Workflow failed:", error);
  process.exit(1);
});
