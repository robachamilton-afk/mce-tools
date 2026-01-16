# Canonical Data Model Specification

**Version:** 2.0  
**Date:** January 11, 2026  
**Author:** Manus AI  
**Status:** DRAFT

---

## 1. Introduction

This document defines the canonical data model for the MCE ACC Datascraping Tool. It is designed to be a flexible, auditable, and comprehensive representation of energy infrastructure projects, capable of handling real-world variations in documentation, naming conventions, and design stage progression.

### 1.1. Design Philosophy

> **"Detect, don't assume. Configure, don't hardcode. Track, don't guess."**

This philosophy guides the entire data model, which is built to be:

- **Flexible:** Handles any project structure, naming convention, or revision pattern.
- **Configurable:** Requires user confirmation for project-specific rules.
- **Transparent:** Tracks provenance and confidence for all extracted data.
- **Auditable:** Maintains a complete history of changes and decisions.

### 1.2. Key Revisions from V1

This version incorporates significant refinements based on analysis of three real-world projects (Goonumbla, Clare, Haughton) and industry standards research:

- **Asset Lifecycle Management:** Assets are no longer assumed to be locked at 30%. They can be added, deleted, and renumbered throughout the design process.
- **Flexible Revision Control:** The model now supports any revision pattern (alphabetic, numeric, prefixed, compound) and requires user-defined mapping to design stages.
- **Renumbering Cascade:** The model can track asset renumbering when assets are deleted from a sequence.
- **Provenance Tracking:** Every piece of data tracks its source (register, title block, user input) and confidence score.
- **Gap Analysis:** The model supports formal gap analysis between drawing registers and filesystem reality.

---

## 2. Core Entities

### 2.1. Project

Represents a single energy infrastructure project.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Project name (e.g., "Goonumbla Solar Farm") |
| `project_code` | String | Official project code (e.g., "XXSF", "GOO") |
| `current_stage_id` | UUID | Foreign key to `DesignStage` |
| `created_at` | DateTime | Timestamp of creation |
| `updated_at` | DateTime | Timestamp of last update |

### 2.2. DesignStage

Defines the project-specific design stages.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to `Project` |
| `stage_name` | String | Project-specific name (e.g., "30%", "Preliminary", "IFC") |
| `stage_order` | Integer | Sequence order (1, 2, 3, ...) |
| `normalized_percentage` | Integer | Normalized to percentage (30, 60, 80, 90, 100) |
| `is_ifc` | Boolean | Is this the IFC stage? |
| `is_as_built` | Boolean | Is this the as-built stage? |

### 2.3. Document

Represents a single document (drawing, report, schedule, etc.).

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to `Project` |
| `document_number` | String | Official document number |
| `title` | String | Document title |
| `document_type` | Enum | `DRAWING`, `REPORT`, `SCHEDULE`, `REGISTER`, `MAP`, `SKETCH` |
| `discipline` | Enum | `ELECTRICAL`, `CIVIL`, `STRUCTURAL`, `MECHANICAL`, `SCADA` |
| `revision_code` | String | Raw revision from filename (C1, Ver2, RevA) |
| `design_stage_id` | UUID | Foreign key to `DesignStage` |
| `is_superseded` | Boolean | Has this been replaced by a newer revision? |
| `file_path` | String | Path to the document in the filesystem |
| `in_register` | Boolean | Appears in drawing register |
| `file_available` | Boolean | File exists in filesystem |
| `availability_status` | Enum | `AVAILABLE`, `MISSING`, `UNEXPECTED` |
| `metadata_source` | Enum | `REGISTER`, `TITLE_BLOCK`, `FILENAME`, `USER_INPUT` |
| `metadata_confidence` | Float | Confidence score for extracted metadata (0.0 to 1.0) |

### 2.4. Asset

Represents a physical or logical asset in the project.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to `Project` |
| `canonical_id` | String | Unique, stable identifier for the asset |
| `name` | String | Human-readable name (e.g., "Inverter 1") |
| `category` | String | Hierarchical category (e.g., "Electrical > Inverters > String Inverters") |
| `location` | String | Physical or logical location (e.g., "Block 1, Row 5") |
| `lifecycle_state` | Enum | `PROPOSED`, `CONFIRMED`, `DELETED`, `RENAMED`, `INSTALLED` |
| `specifications` | JSONB | Key-value store for technical specifications |
| `created_at_stage_id` | UUID | Stage when asset was first created |
| `previous_canonical_id` | String | ID in previous stage (if renumbered) |

### 2.5. AssetChange

Records a change to an asset between design stages.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `asset_id` | UUID | Foreign key to `Asset` |
| `change_type` | Enum | `ADDED`, `DELETED`, `RENAMED`, `MODIFIED`, `ENRICHED` |
| `from_stage_id` | UUID | Stage before change |
| `to_stage_id` | UUID | Stage after change |
| `field_changed` | String | Which field changed (if `MODIFIED`) |
| `old_value` | String | Previous value |
| `new_value` | String | New value |
| `significance` | Enum | `MAJOR`, `MINOR`, `COSMETIC` |
| `document_id` | UUID | Source document for change |
| `reviewed` | Boolean | Has user reviewed this change? |
| `approved` | Boolean | Has user approved this change? |

---

## 3. Configuration Entities

### 3.1. RevisionPattern

Defines a project-specific revision pattern.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to `Project` |
| `pattern_type` | Enum | `ALPHABETIC`, `NUMERIC`, `PREFIXED`, `COMPOUND` |
| `regex` | String | Regex to match the pattern |
| `examples` | Array[String] | Example revision codes |
| `confidence` | Float | Detection confidence |
| `user_confirmed` | Boolean | Has user confirmed this pattern? |

### 3.2. RevisionStageMapping

Maps detected revision codes to design stages.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to `Project` |
| `revision_pattern` | String | Pattern to match (e.g., "A", "Ver1") |
| `design_stage_id` | UUID | Foreign key to `DesignStage` |

### 3.3. DocumentNumberingPattern

Defines the structure of document numbers for a project.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to `Project` |
| `pattern` | String | Pattern string (e.g., "{PROJECT}-{DISC}-{TYPE}-{SEQ}") |
| `separator` | String | Separator character (-, _, space) |
| `components` | Array[JSONB] | Ordered list of components (name, type, position) |

---

## 4. Asset Taxonomy

### 4.1. Solar Farm

- **PV Modules**
  - `Solar > PV Modules > Monofacial`
  - `Solar > PV Modules > Bifacial`
- **Trackers**
  - `Solar > Trackers > Single-Axis`
  - `Solar > Trackers > Dual-Axis`
- **Inverters**
  - `Solar > Inverters > String Inverters`
  - `Solar > Inverters > Central Inverters`
- **Combiner Boxes**
  - `Solar > Combiner Boxes > DC Combiner Box`
  - `Solar > Combiner Boxes > AC Combiner Box`

### 4.2. Substation

- **Transformers**
  - `Electrical > Transformers > Step-Up Transformers`
  - `Electrical > Transformers > Step-Down Transformers`
- **Switchgear**
  - `Electrical > Switchgear > MV Switchgear`
  - `Electrical > Switchgear > HV Switchgear`
- **Circuit Breakers**
  - `Electrical > Circuit Breakers > MV Circuit Breaker`
  - `Electrical > Circuit Breakers > HV Circuit Breaker`

### 4.3. Cables

- **DC Cables**
  - `Cables > DC > String Cables`
  - `Cables > DC > Array Cables`
  - `Cables > DC > Sub-Array Cables`
- **AC Cables**
  - `Cables > AC > LV Cables`
  - `Cables > AC > MV Feeder Cables`
  - `Cables > AC > HV Transmission Cables`
- **Control & Fiber**
  - `Cables > Control > Control Cables`
  - `Cables > Control > Fiber Optic Cables`

---

## 5. Enumerations

### 5.1. DocumentType

- `DRAWING`
- `REPORT`
- `SCHEDULE`
- `REGISTER`
- `MAP`
- `SKETCH`
- `SPECIFICATION`
- `BOM`
- `OTHER`

### 5.2. Discipline

- `ELECTRICAL`
- `CIVIL`
- `STRUCTURAL`
- `MECHANICAL`
- `SCADA`
- `SECURITY`
- `GENERAL`

### 5.3. AssetLifecycleState

- `PROPOSED`
- `CONFIRMED`
- `DELETED`
- `RENAMED`
- `INSTALLED`
- `OPERATIONAL`

### 5.4. ChangeType

- `ADDED`
- `DELETED`
- `RENAMED`
- `MODIFIED`
- `ENRICHED`

### 5.5. ChangeSignificance

- `MAJOR`
- `MINOR`
- `COSMETIC`

### 5.6. MetadataSource

- `REGISTER`
- `TITLE_BLOCK`
- `FILENAME`
- `FILE_METADATA`
- `USER_INPUT`
- `UNKNOWN`

---

## 6. Next Steps

With this refined data model, the next step is to design the **Ingestion & Intelligence Pipeline (Artefact B)**, which will define the process for:

1. **Document Ingestion:** How documents are uploaded and classified.
2. **Pattern Detection:** How revision and numbering patterns are detected.
3. **User Configuration:** How users confirm patterns and map stages.
4. **Asset Extraction:** How assets are extracted from documents.
5. **Cross-Stage Matching:** How assets are matched and changes are detected.
6. **Change Reporting:** How change reports are generated for user review.
7. **Data Validation:** How data is validated before being committed to the model.

This pipeline will be the implementation of the data model's flexible and will be detailed in the next artefact B.
