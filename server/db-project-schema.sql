-- Per-Project Database Schema
-- This schema is deployed to each project's dedicated database

-- Documents table: stores uploaded project documents
CREATE TABLE documents (
  id CHAR(36) PRIMARY KEY,
  fileName VARCHAR(255) NOT NULL,
  filePath VARCHAR(512) NOT NULL,
  fileSizeBytes INT,
  fileHash VARCHAR(255),
  documentType ENUM('IM', 'DD_Pack', 'Contract', 'Grid_Study', 'Planning', 'Design', 'Other') NOT NULL,
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

-- Facts table: extracted structured and unstructured facts from documents
CREATE TABLE facts (
  id CHAR(36) PRIMARY KEY,
  category ENUM('Technology', 'Assumption', 'Parameter', 'Dependency', 'Risk', 'Other') NOT NULL,
  key VARCHAR(255) NOT NULL,
  value LONGTEXT NOT NULL,
  dataType ENUM('String', 'Number', 'Date', 'Boolean', 'JSON') DEFAULT 'String',
  confidence DECIMAL(5, 2) NOT NULL,
  sourceDocumentId CHAR(36) NOT NULL,
  sourceLocation VARCHAR(255),
  extractionMethod ENUM('Deterministic_Regex', 'Ollama_LLM', 'Manual_Input') NOT NULL,
  extractionModel VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  verifiedByUserId INT,
  verifiedAt TIMESTAMP,
  verificationNotes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sourceDocumentId) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_key (key),
  INDEX idx_verified (verified),
  INDEX idx_confidence (confidence),
  FULLTEXT INDEX ft_value (value)
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
  FOREIGN KEY (triggerFactId) REFERENCES facts(id) ON DELETE SET NULL,
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
  FOREIGN KEY (factId) REFERENCES facts(id) ON DELETE CASCADE,
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
