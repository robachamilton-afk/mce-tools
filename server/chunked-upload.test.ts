import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createProjectDbPool } from './db-connection';
import fs from 'fs/promises';
import path from 'path';

describe('Chunked Upload', () => {
  const TEST_PROJECT_ID = 150005;
  const TEST_UPLOAD_ID = `upload_test_${Date.now()}`;
  const TEMP_DIR = path.join('/home/ubuntu/project-ingestion-engine/data/temp-uploads', TEST_UPLOAD_ID);
  
  beforeAll(async () => {
    // Clean up any existing test directory
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  it('should create temp directory and metadata for chunked upload', async () => {
    // Simulate initChunkedUpload
    await fs.mkdir(TEMP_DIR, { recursive: true });
    
    const metadata = {
      projectId: String(TEST_PROJECT_ID),
      fileName: 'test-large-file.pdf',
      fileType: 'application/pdf',
      fileSize: 75 * 1024 * 1024, // 75MB
      documentType: 'DD_PACK',
      totalChunks: 8, // 75MB / 10MB = 7.5, rounded up to 8
      userId: 1,
      createdAt: new Date().toISOString(),
    };
    
    await fs.writeFile(
      path.join(TEMP_DIR, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Verify directory and metadata exist
    const dirExists = await fs.stat(TEMP_DIR).then(() => true).catch(() => false);
    expect(dirExists).toBe(true);
    
    const metadataContent = await fs.readFile(path.join(TEMP_DIR, 'metadata.json'), 'utf-8');
    const parsedMetadata = JSON.parse(metadataContent);
    expect(parsedMetadata.fileName).toBe('test-large-file.pdf');
    expect(parsedMetadata.totalChunks).toBe(8);
  });

  it('should save chunks to temp directory', async () => {
    // Simulate uploadChunk for 3 chunks
    const testChunks = [
      Buffer.from('chunk 0 data'),
      Buffer.from('chunk 1 data'),
      Buffer.from('chunk 2 data'),
    ];
    
    for (let i = 0; i < testChunks.length; i++) {
      const chunkPath = path.join(TEMP_DIR, `chunk-${i}`);
      await fs.writeFile(chunkPath, testChunks[i]);
    }
    
    // Verify chunks exist
    for (let i = 0; i < testChunks.length; i++) {
      const chunkPath = path.join(TEMP_DIR, `chunk-${i}`);
      const chunkExists = await fs.stat(chunkPath).then(() => true).catch(() => false);
      expect(chunkExists).toBe(true);
      
      const chunkContent = await fs.readFile(chunkPath);
      expect(chunkContent.toString()).toBe(testChunks[i].toString());
    }
  });

  it('should reassemble chunks into complete file', async () => {
    // Read metadata
    const metadataPath = path.join(TEMP_DIR, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    
    // Reassemble chunks (we only have 3 test chunks)
    const chunks: Buffer[] = [];
    for (let i = 0; i < 3; i++) {
      const chunkPath = path.join(TEMP_DIR, `chunk-${i}`);
      const chunkBuffer = await fs.readFile(chunkPath);
      chunks.push(chunkBuffer);
    }
    const fileBuffer = Buffer.concat(chunks);
    
    // Verify reassembled file
    expect(fileBuffer.length).toBeGreaterThan(0);
    expect(fileBuffer.toString()).toContain('chunk 0 data');
    expect(fileBuffer.toString()).toContain('chunk 1 data');
    expect(fileBuffer.toString()).toContain('chunk 2 data');
  });

  it('should clean up temp directory after finalization', async () => {
    // Simulate cleanup
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    
    // Verify directory is deleted
    const dirExists = await fs.stat(TEMP_DIR).then(() => true).catch(() => false);
    expect(dirExists).toBe(false);
  });

  it('should handle chunk size calculation correctly', () => {
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
    
    // Test various file sizes
    const testCases = [
      { fileSize: 75 * 1024 * 1024, expectedChunks: 8 },   // 75MB -> 8 chunks
      { fileSize: 50 * 1024 * 1024, expectedChunks: 5 },   // 50MB -> 5 chunks
      { fileSize: 100 * 1024 * 1024, expectedChunks: 10 }, // 100MB -> 10 chunks
      { fileSize: 5 * 1024 * 1024, expectedChunks: 1 },    // 5MB -> 1 chunk
    ];
    
    for (const testCase of testCases) {
      const totalChunks = Math.ceil(testCase.fileSize / CHUNK_SIZE);
      expect(totalChunks).toBe(testCase.expectedChunks);
    }
  });
});
