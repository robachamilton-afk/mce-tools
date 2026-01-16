import { analyzeAndUpdateSite } from '../server/iterativeSatelliteAnalysis';

async function main() {
  console.log('🛰️  Testing Iterative Satellite Analysis on Clare Solar Farm');
  console.log('='.repeat(70));
  
  // Clare Solar Farm site ID is 114
  const clareId = 114;
  
  try {
    const result = await analyzeAndUpdateSite(clareId);
    
    console.log('\n✅ ANALYSIS COMPLETE!');
    console.log('='.repeat(70));
    console.log(`\n📍 COORDINATES:`);
    console.log(`  Refined: ${result.refinedLat.toFixed(4)}°, ${result.refinedLon.toFixed(4)}°`);
    console.log(`  Confidence: ${result.coordinateConfidence}%`);
    console.log(`  Images analyzed: ${result.imagesAnalyzed}`);
    
    console.log(`\n⚙️  CONFIGURATION:`);
    console.log(`  Tracking: ${result.trackingType} (${result.trackingConfidence}% confidence)`);
    console.log(`  Azimuth: ${result.axisAzimuth.toFixed(1)}°`);
    console.log(`  Tilt: ${result.tiltAngle.toFixed(1)}°`);
    console.log(`  GCR: ${result.gcr.toFixed(3)} (${result.gcrConfidence}% confidence)`);
    console.log(`  Pitch: ${result.pitch.toFixed(1)}m (${result.pitchConfidence}% confidence)`);
    
    console.log(`\n🔌 EQUIPMENT:`);
    console.log(`  Inverters: ${result.inverterCount === -1 ? 'Unknown' : result.inverterCount}`);
    console.log(`  PCUs: ${result.pcuCount === -1 ? 'Unknown' : result.pcuCount}`);
    console.log(`  Confidence: ${result.equipmentConfidence}%`);
    
    console.log(`\n📝 NOTES:`);
    console.log(`  ${result.notes}`);
    
    console.log(`\n💾 Database updated successfully!`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

main();
