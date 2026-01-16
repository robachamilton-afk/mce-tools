# Ingestion & Intelligence Pipeline

**Version:** 1.0  
**Date:** January 11, 2026  
**Author:** Manus AI  
**Status:** DRAFT

---

## 1. Introduction

This document defines the Ingestion & Intelligence Pipeline for the MCE ACC Datascraping Tool. It details the step-by-step process for ingesting raw project documentation, extracting structured data, and populating the Canonical Data Model.

The pipeline is designed to be a **human-in-the-loop system**, combining automated processing with user checkpoints to ensure data quality and handle real-world ambiguity.

---

## 2. Pipeline Overview

The pipeline consists of five major phases, each with a user checkpoint:

**Phase 1: Project Setup & Document Ingestion**
- User defines project and stages
- Documents are uploaded and classified
- **CHECKPOINT 1: User confirms document inventory**

**Phase 2: Pattern Detection & Configuration**
- System detects numbering and revision patterns
- **CHECKPOINT 2: User confirms patterns and maps stages**

**Phase 3: Asset Extraction & Reconciliation**
- Assets are extracted from documents
- Register is reconciled with filesystem
- **CHECKPOINT 3: User resolves gaps and conflicts**

**Phase 4: Cross-Stage Change Detection**
- Assets are matched across design stages
- Changes (adds, deletes, renames, mods) are detected
- **CHECKPOINT 4: User reviews and approves changes**

**Phase 5: Data Validation & Export**
- Final data is validated against business rules
- Confidence scores are reviewed
- **CHECKPOINT 5: User approves final data for export**

![Pipeline Diagram](ingestion_pipeline_diagram.png)  
*Figure 1: Ingestion & Intelligence Pipeline Overview*

---

## 3. Phase 1: Project Setup & Document Ingestion

### 3.1. User Creates Project

- User provides project name and code.
- User defines the project-specific design stages (e.g., "30%", "80%", "IFC").

### 3.2. User Uploads Documents

- User uploads all documents for a specific design stage.
- System performs initial classification:
  - File type (PDF, XLSX, DWG, etc.)
  - File size, creation/modification dates

### 3.3. Initial Document Classification (AI-Assisted)

- For each document, system attempts to classify:
  - **Document Type:** (Drawing, Report, Schedule) using filename keywords and content analysis.
  - **Discipline:** (Electrical, Civil, Structural) using filename keywords and title block extraction.

### 3.4. CHECKPOINT 1: Document Inventory Review

- System presents a complete inventory of all uploaded documents.
- User reviews the initial classification and can correct any errors.
- User confirms that all expected documents have been uploaded.

---

## 4. Phase 2: Pattern Detection & Configuration

### 4.1. Automated Pattern Detection

- System analyzes all filenames to detect:
  - **Document Numbering Patterns:** (e.g., `XXSF-SME-SLF-ALL-GEN-DWG-0001`)
  - **Revision Patterns:** (e.g., `A1`, `C2`, `Ver1`, `RevA`)
- Multiple patterns are detected with confidence scores.

### 4.2. CHECKPOINT 2: Pattern & Stage Mapping

- System presents detected patterns to the user.
- **User confirms** the correct numbering and revision patterns.
- **User maps** detected revision codes to the design stages defined in Phase 1.
  - Example: `A` → `30%`, `B` → `80%`, `C` → `IFC`

---

## 5. Phase 3: Asset Extraction & Reconciliation

### 5.1. Priority Processing

- Documents are processed in priority order:
  1. **Registers** (Drawing Register, Equipment Register)
  2. **Schedules** (BOM, Cable Schedule)
  3. **Drawings**

### 5.2. Asset Extraction (AI-Assisted)

- **Deterministic Extraction:** Parse asset data from structured sources (BOMs, schedules).
- **AI-Assisted Extraction:** Use OCR and Large Language Models (LLMs) to extract assets from unstructured sources (drawings, reports).
  - Extract entities from title blocks.
  - Identify equipment in drawings.
  - Parse specifications from text.

### 5.3. Register vs. Filesystem Reconciliation

- System compares the list of documents in the drawing register against the files in the filesystem.
- Generates a **Gap Analysis Report** showing:
  - **Matched Documents:** In both register and filesystem.
  - **Missing Documents:** In register but not in filesystem.
  - **Unexpected Documents:** In filesystem but not in register.

### 5.4. CHECKPOINT 3: Gap & Conflict Resolution

- User reviews the Gap Analysis Report.
- User can:
  - Mark missing documents as "Not Required".
  - Add unexpected documents to the project scope.
  - Resolve any conflicts between register metadata and extracted metadata.

---

## 6. Phase 4: Cross-Stage Change Detection

### 6.1. Asset Matching Across Stages

- When a new design stage is processed, system matches its assets to the previous stage.
- **Matching Algorithm:**
  1. Group assets by location (e.g., Block 1).
  2. Sort by sequence number.
  3. Use **sequence alignment** (like `diff`) to match assets by position, detecting renumbering cascades.

### 6.2. Change Detection

- System detects all changes between stages:
  - `ADDED`: New assets.
  - `DELETED`: Removed assets.
  - `RENAMED`: Renumbered assets.
  - `MODIFIED`: Specification changes.
  - `ENRICHED`: New specifications added.

### 6.3. CHECKPOINT 4: Change Review & Approval

- System generates a detailed **Change Report**.
- User reviews all changes, categorized by type and significance (Major, Minor, Cosmetic).
- User can approve or reject changes individually or in bulk.

---

## 7. Phase 5: Data Validation & Export

### 7.1. Final Validation

- System validates the entire data model against business rules:
  - All required fields are populated.
  - Relationships are consistent.
  - No unresolved conflicts remain.

### 7.2. Confidence Scoring Review

- System flags all data points with confidence scores below a user-defined threshold (e.g., 95%).
- User can review and manually verify these low-confidence items.

### 7.3. CHECKPOINT 5: Final Approval & Export

- User gives final approval for the data model.
- System exports the data to the ACC Excel format.
- System generates a final audit report detailing the entire ingestion process.

---

## 8. Technology Stack

- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL with PostGIS
- **AI/ML:**
  - **OCR:** Tesseract, EasyOCR
  - **LLM:** GPT-4.1-mini (for structured extraction)
  - **NLP:** spaCy (for entity recognition)
- **Frontend:** React, TypeScript

---

## 9. Next Steps

- Create detailed specifications for each pipeline component.
- Design the user interface for each checkpoint.
- Develop a prototype of the asset matching and change detection algorithm.
- Create supporting artefacts (C-G).
