#!/usr/bin/env node
/**
 * Test Hybrid Contract Parser V3
 * 
 * Tests the Tesseract + RapidLaTeXOCR + Qwen pipeline with TestSchedule.pdf
 */

import { extractContractHybrid } from '../server/contractParserV3.ts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('='.repeat(60));
  console.log('Testing Hybrid Contract Parser V3');
  console.log('='.repeat(60));
  
  const testPdfPath = join(__dirname, '..', 'TestSchedule.pdf');
  
  console.log(`\nTest PDF: ${testPdfPath}`);
  console.log('\nStarting extraction...\n');
  
  const startTime = Date.now();
  
  try {
    const result = await extractContractHybrid(testPdfPath, (progress) => {
      console.log(`[${progress.stage}] ${progress.message} (${progress.progress}%)`);
    });
    
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nProcessing time: ${elapsedSec}s`);
    console.log(`\nEquations extracted: ${result.equations.length}`);
    
    // Display extracted equations
    if (result.equations.length > 0) {
      console.log('\n' + '-'.repeat(60));
      console.log('EXTRACTED EQUATIONS:');
      console.log('-'.repeat(60));
      
      for (const eq of result.equations) {
        console.log(`\nPage ${eq.region.page} (Confidence: ${eq.confidence}%)`);
        console.log(`LaTeX: ${eq.latex}`);
        console.log(`Context: ${eq.region.text.slice(0, 100)}...`);
        console.log(`Processing time: ${eq.elapsedMs}ms`);
      }
    }
    
    // Display contract model
    console.log('\n' + '-'.repeat(60));
    console.log('CONTRACT MODEL:');
    console.log('-'.repeat(60));
    console.log(JSON.stringify(result.model, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('EXTRACTION FAILED');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
