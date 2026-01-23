-- Per-Project Database Schema
-- This schema is deployed to each project's dedicated database

-- Processing jobs table: tracks document processing status
CREATE TABLE processing_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
  stage VARCHAR(100) NOT NULL,
  progress_percent INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  estimated_completion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_document_id (document_id)
);

-- Documents table: stores uploaded project documents
CREATE TABLE documents (
  id CHAR(36) PRIMARY KEY,
  fileName VARCHAR(255) NOT NULL,
  filePath VARCHAR(512) NOT NULL,
  fileSizeBytes INT,
  fileHash VARCHAR(255),
  documentType ENUM('IM', 'DD_PACK', 'CONTRACT', 'GRID_STUDY', 'CONCEPT_DESIGN', 'OTHER') NOT NULL,
  uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Uploaded', 'Processing', 'Processed', 'Error') DEFAULT 'Uploaded',
  processingError TEXT,
  extractedText LONGTEXT,
  pageCount INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_documentType (documentType),
  INDEX idx_uploadDate (uploadDate)
);

-- Extracted facts table: extracted structured and unstructured facts from documents
CREATE TABLE extracted_facts (
  id VARCHAR(36) PRIMARY KEY,
  project_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR(50),
  confidence VARCHAR(10),
  source_document_id VARCHAR(36),
  source_documents JSON COMMENT 'Array of document IDs that contributed to this insight',
  source_location TEXT,
  extraction_method VARCHAR(50),
  extraction_model VARCHAR(100),
  verified INT DEFAULT 0,
  verification_status VARCHAR(20) DEFAULT 'pending',
  enrichment_count INT DEFAULT 1 COMMENT 'Number of documents that enriched this insight',
  conflict_with VARCHAR(36) NULL COMMENT 'ID of conflicting insight if any',
  merged_from JSON COMMENT 'Array of insight IDs that were merged into this one',
  last_enriched_at TIMESTAMP NULL COMMENT 'Last time this insight was enriched',
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_key (`key`),
  INDEX idx_verified (verified),
  INDEX idx_confidence (confidence),
  INDEX idx_conflict_with (conflict_with)
);

-- Insight conflicts table: tracks conflicting insights from different documents
CREATE TABLE insight_conflicts (
  id VARCHAR(36) PRIMARY KEY,
  project_id INT NOT NULL,
  insight_a_id VARCHAR(36) NOT NULL,
  insight_b_id VARCHAR(36) NOT NULL,
  conflict_type ENUM('value_mismatch', 'date_mismatch', 'numerical_mismatch') NOT NULL,
  resolution_status ENUM('pending', 'resolved', 'ignored') DEFAULT 'pending',
  resolved_by INT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (insight_a_id) REFERENCES extracted_facts(id) ON DELETE CASCADE,
  FOREIGN KEY (insight_b_id) REFERENCES extracted_facts(id) ON DELETE CASCADE,
  INDEX idx_resolution_status (resolution_status),
  INDEX idx_project_id (project_id)
);

-- Red flags table: detected risks and issues
CREATE TABLE redFlags (
  id CHAR(36) PRIMARY KEY,
  category ENUM('Planning', 'Grid', 'Geotech', 'Performance', 'Scope', 'Commercial', 'Other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT NOT NULL,
  severity ENUM('High', 'Medium', 'Low') NOT NULL,
  triggerFactId CHAR(36),
  evidenceGaps JSON,
  downstreamConsequences TEXT,
  mitigated BOOLEAN DEFAULT FALSE,
  mitigationNotes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (triggerFactId) REFERENCES extracted_facts(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_severity (severity),
  INDEX idx_mitigated (mitigated)
);

-- Fact verification queue
CREATE TABLE factVerificationQueue (
  id CHAR(36) PRIMARY KEY,
  factId CHAR(36) NOT NULL UNIQUE,
  status ENUM('Pending', 'Approved', 'Rejected', 'Needs_Review') DEFAULT 'Pending',
  assignedToUserId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factId) REFERENCES extracted_facts(id) ON DELETE CASCADE,
  INDEX idx_status (status)
);

-- Processing logs: track document processing pipeline
CREATE TABLE processingLogs (
  id CHAR(36) PRIMARY KEY,
  documentId CHAR(36),
  step ENUM('Upload', 'Text_Extraction', 'Deterministic_Extraction', 'LLM_Extraction', 'Consolidation', 'Red_Flag_Detection', 'Complete') NOT NULL,
  status ENUM('Started', 'In_Progress', 'Completed', 'Failed') NOT NULL,
  message TEXT,
  durationMs INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_documentId (documentId),
  INDEX idx_step (step)
);

-- Project metadata
CREATE TABLE projectMetadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectName VARCHAR(255) NOT NULL,
  projectDescription TEXT,
  projectType ENUM('Solar', 'Wind', 'BESS', 'Hybrid', 'Other') DEFAULT 'Other',
  location VARCHAR(255),
  capacity DECIMAL(10, 2),
  capacityUnit VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
