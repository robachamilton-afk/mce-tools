# ACC Data Scraping Tool - Canonical Data Model

**Version:** 1.0  
**Date:** January 11, 2026  
**Status:** Draft for Review

---

## Executive Summary

This document defines the canonical data model for the ACC datascraping tool, designed to ingest heterogeneous engineering design documents from energy infrastructure projects (solar, BESS, wind, substations) and transform them into a consistent, structured format for instantiation in Autodesk Construction Cloud (ACC).

The data model is **opinionated**, **deterministic**, and **auditable**, prioritizing repeatability over flexibility. It accommodates significant variation in source document formats while enforcing consistency in the output.

---

## 1. Design Principles

### 1.1 Core Principles

**Determinism Over Flexibility**  
The model enforces strict schemas and validation rules. Ambiguous or incomplete data triggers human-in-the-loop review rather than silent assumptions.

**Auditability First**  
Every extracted entity maintains full lineage: source document, extraction method, confidence score, and human review status.

**Opinionated Taxonomy**  
The model defines a fixed asset taxonomy for energy infrastructure. Source documents are mapped to this taxonomy, not vice versa.

**Separation of Concerns**  
The model distinguishes between:
- **Physical Assets** (equipment, structures)
- **Documents** (drawings, specifications, reports)
- **Issues** (design reviews, quality concerns)
- **Quality Artefacts** (ITPs, ITRs, inspections—future phase)

### 1.2 Accommodation of Variation

Analysis of Clare and Goonumbla projects revealed significant inconsistencies:

| Aspect | Goonumbla | Clare |
|--------|-----------|-------|
| **Document Naming** | GOO-ISE-GE-DRW-0001-C1 | CLSF-BOM-5152-002 |
| **BOM Structure** | Single hierarchical BOM with work packages | Multiple BOMs by component type |
| **Asset Organization** | Code-based (CV.FN, EL.MV) | Block-based (Block 1-23) |
| **Drawing Register** | Comprehensive index with categories | No centralized register found |

The canonical model **absorbs** these variations through:
- **Flexible ingestion adapters** (project-specific parsers)
- **Entity resolution** (mapping aliases to canonical IDs)
- **Confidence scoring** (flagging uncertain mappings)

---

## 2. Core Entities

### 2.1 Project

The top-level container for all project data.

**Schema:**

```python
class Project:
    id: UUID                          # Internal unique identifier
    name: str                         # Project name (e.g., "Clare Solar Farm")
    code: str                         # Project code (e.g., "CLSF", "GOO")
    type: ProjectType                 # SOLAR | BESS | WIND | SUBSTATION | HYBRID
    location: Location                # Geographic location
    capacity_mw: Optional[float]      # Nameplate capacity
    status: ProjectStatus             # DESIGN | CONSTRUCTION | OPERATIONAL
    metadata: Dict[str, Any]          # Flexible metadata storage
    created_at: datetime
    updated_at: datetime
```

**Validation Rules:**
- `name` must be unique within tenant
- `code` must be 2-10 uppercase alphanumeric characters
- `type` must match one of the defined enum values

---

### 2.2 Asset

Physical equipment, structures, or systems within a project.

**Schema:**

```python
class Asset:
    id: UUID                          # Internal unique identifier
    project_id: UUID                  # Foreign key to Project
    name: str                         # Asset name (e.g., "INV-01", "Tracker Block 1")
    canonical_id: str                 # Standardized identifier (e.g., "CLSF-INV-001")
    aliases: List[str]                # Alternative names from source docs
    category: AssetCategory           # Hierarchical category (see taxonomy)
    subcategory: Optional[str]        # Additional classification
    description: Optional[str]        # Free-text description
    location: Optional[str]           # Physical location (hierarchical)
    status: AssetStatus               # Lifecycle status
    parent_asset_id: Optional[UUID]   # For hierarchical assets
    system_ids: List[UUID]            # Systems this asset belongs to
    specifications: Dict[str, Any]    # Technical specifications
    source_documents: List[UUID]      # Documents referencing this asset
    extraction_metadata: ExtractionMetadata
    created_at: datetime
    updated_at: datetime
```

**Key Fields Explained:**

**`canonical_id`:** Project-scoped unique identifier following pattern `{PROJECT_CODE}-{CATEGORY_CODE}-{SEQUENCE}`. Example: `CLSF-INV-001` for Clare Solar Farm Inverter 001.

**`aliases`:** Captures all names used in source documents. Example: `["INV-01", "Inverter A01", "String Inverter 1"]`. Used for entity resolution.

**`category`:** Hierarchical classification from the canonical taxonomy (see Section 3). Example: `Solar > Inverters > String Inverters`.

**`location`:** Hierarchical location string. Example: `Block 1 > Row 14 > Tracker 3`. Optional because not all assets have physical locations (e.g., software systems).

**`parent_asset_id`:** Enables hierarchical relationships. Example: A PV module's parent might be a tracker, which itself has a parent block.

**`system_ids`:** Many-to-many relationship. Example: An inverter might belong to both "DC Collection System" and "SCADA Monitoring System".

**`specifications`:** Flexible JSON storage for technical details. Example:
```json
{
  "manufacturer": "SMA",
  "model": "Sunny Central 2750-EV",
  "rated_power_kw": 2750,
  "input_voltage_range_v": [1000, 1500],
  "efficiency_percent": 98.7
}
```

**`extraction_metadata`:** Audit trail (see Section 2.6).

**Validation Rules:**
- `canonical_id` must be unique within project
- `category` must exist in canonical taxonomy
- `parent_asset_id` must not create circular references
- `status` transitions must follow defined lifecycle

---

### 2.3 System

Logical grouping of assets that work together (e.g., "DC Collection System", "HV Substation").

**Schema:**

```python
class System:
    id: UUID
    project_id: UUID
    name: str                         # System name (e.g., "DC Collection System")
    canonical_id: str                 # Standardized identifier
    category: SystemCategory          # Hierarchical category
    description: Optional[str]
    parent_system_id: Optional[UUID]  # For nested systems
    asset_ids: List[UUID]             # Assets in this system
    status: SystemStatus
    source_documents: List[UUID]
    extraction_metadata: ExtractionMetadata
    created_at: datetime
    updated_at: datetime
```

**Example Hierarchy:**
```
Project: Clare Solar Farm
└── System: Electrical Infrastructure
    ├── System: DC Collection
    │   ├── Asset: Combiner Box CB-01
    │   ├── Asset: Combiner Box CB-02
    │   └── Asset: DC Cable DC-001
    └── System: AC Collection
        ├── Asset: Inverter INV-01
        └── Asset: MV Transformer TX-01
```

**Validation Rules:**
- `canonical_id` must be unique within project
- `parent_system_id` must not create circular references
- `asset_ids` must reference valid assets in same project

---

### 2.4 Document

Design documents, drawings, specifications, reports, and schedules.

**Schema:**

```python
class Document:
    id: UUID
    project_id: UUID
    name: str                         # Document name/title
    document_number: str              # Official document number (e.g., "GOO-ISE-GE-DRW-0001-C1")
    type: DocumentType                # DRAWING | SPECIFICATION | REPORT | SCHEDULE | BOM | OTHER
    discipline: Discipline            # GENERAL | ELECTRICAL | CIVIL | MECHANICAL | STRUCTURAL
    category: Optional[str]           # Sub-classification (e.g., "Single Line Diagram")
    revision: str                     # Revision code (e.g., "C1", "Rev A")
    file_path: str                    # Path to source file
    file_hash: str                    # SHA-256 hash for integrity
    file_size_bytes: int
    page_count: Optional[int]         # For PDFs
    related_assets: List[UUID]        # Assets referenced in this document
    related_systems: List[UUID]       # Systems referenced in this document
    metadata: Dict[str, Any]          # Extracted metadata (dates, authors, etc.)
    extraction_metadata: ExtractionMetadata
    created_at: datetime
    updated_at: datetime
```

**Document Number Parsing:**

The system extracts structured information from document numbers:

**Goonumbla Pattern:** `GOO-ISE-GE-DRW-0001-C1`
- Project: GOO
- Contractor/Discipline: ISE
- Document Type: GE (General), EL (Electrical), CV (Civil)
- Category: DRW (Drawing), RPT (Report), SPE (Specification)
- Sequence: 0001
- Revision: C1

**Clare Pattern:** `CLSF-BOM-5152-002`
- Project: CLSF
- Document Type: BOM
- Series: 5152
- Sequence: 002

The model stores both the raw `document_number` and parsed components in `metadata`.

**Validation Rules:**
- `document_number` should be unique within project (warning if duplicate)
- `file_hash` must be unique (prevents duplicate uploads)
- `revision` must follow project's revision scheme

---

### 2.5 Issue

Design review comments, quality concerns, or non-conformance reports.

**Schema:**

```python
class Issue:
    id: UUID
    project_id: UUID
    title: str                        # Issue title/summary
    description: str                  # Detailed description
    type: IssueType                   # DESIGN_REVIEW | QUALITY | NCR | RFI
    status: IssueStatus               # OPEN | IN_PROGRESS | RESOLVED | CLOSED
    priority: IssuePriority           # LOW | MEDIUM | HIGH | CRITICAL
    related_document_id: Optional[UUID]  # Source document
    related_asset_id: Optional[UUID]     # Affected asset
    related_system_id: Optional[UUID]    # Affected system
    assigned_to: Optional[str]        # Responsible party
    due_date: Optional[date]
    resolution: Optional[str]         # Resolution description
    source_register_row: Optional[int]  # Row in source register
    extraction_metadata: ExtractionMetadata
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
```

**Use Case:**

Design review registers (typically Excel spreadsheets) contain rows like:

| Item | Drawing | Description | Comment | Status | Action |
|------|---------|-------------|---------|--------|--------|
| 1 | GOO-ISE-EL-DRW-0023 | Inverter layout | Cable routing unclear | Open | Clarify routing |

This maps to an Issue with:
- `title`: "Cable routing unclear"
- `description`: "Inverter layout drawing requires clarification on cable routing"
- `related_document_id`: Document with number "GOO-ISE-EL-DRW-0023"
- `status`: OPEN
- `source_register_row`: 1

**Validation Rules:**
- `title` must not be empty
- `status` transitions must follow defined workflow
- `related_document_id`, `related_asset_id`, `related_system_id` must reference valid entities

---

### 2.6 ExtractionMetadata

Audit trail for every extracted entity.

**Schema:**

```python
class ExtractionMetadata:
    extraction_method: ExtractionMethod  # MANUAL | DETERMINISTIC | AI_ASSISTED
    confidence_score: float              # 0.0 to 1.0
    source_file: str                     # Source document path
    source_location: Optional[str]       # Page/sheet/cell reference
    extracted_at: datetime
    extracted_by: Optional[str]          # User ID if manual
    ai_model: Optional[str]              # Model name if AI-assisted
    human_reviewed: bool                 # Has a human verified this?
    review_notes: Optional[str]          # Human review comments
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
```

**Confidence Score Interpretation:**

| Score Range | Interpretation | Action Required |
|-------------|----------------|-----------------|
| 0.95 - 1.00 | High confidence | Auto-accept (with audit trail) |
| 0.85 - 0.94 | Medium confidence | Flag for review |
| 0.00 - 0.84 | Low confidence | Require human review |

**Extraction Methods:**

**MANUAL:** User directly entered data via UI.

**DETERMINISTIC:** Rule-based extraction (e.g., parsing document numbers, reading structured Excel cells).

**AI_ASSISTED:** LLM-based extraction (e.g., extracting equipment specifications from unstructured text).

---

## 3. Asset Taxonomy

The canonical taxonomy defines standard categories for all asset types across energy infrastructure projects.

### 3.1 Taxonomy Structure

The taxonomy is hierarchical with up to 3 levels:
- **Level 1:** Discipline (e.g., "Solar", "Electrical")
- **Level 2:** Asset Type (e.g., "Inverters", "Transformers")
- **Level 3:** Subtype (e.g., "String Inverters", "Step-Up Transformers")

Represented as strings with ">" separator for ACC compatibility:
```
Solar > Inverters > String Inverters
```

### 3.2 Solar Farm Taxonomy

```
Solar
Solar > PV Modules
Solar > PV Modules > Monocrystalline
Solar > PV Modules > Polycrystalline
Solar > PV Modules > Bifacial
Solar > PV Modules > Thin Film
Solar > Trackers
Solar > Trackers > Single-Axis
Solar > Trackers > Dual-Axis
Solar > Trackers > Fixed Tilt
Solar > Tracker Components
Solar > Tracker Components > Actuators
Solar > Tracker Components > Piles
Solar > Tracker Components > Posts
Solar > Tracker Components > Torque Tubes
Solar > Combiner Boxes
Solar > Monitoring Equipment
Solar > Monitoring Equipment > Weather Stations
Solar > Monitoring Equipment > Irradiance Sensors
Solar > Monitoring Equipment > String Monitors
```

### 3.3 Electrical Infrastructure Taxonomy

```
Electrical
Electrical > Inverters
Electrical > Inverters > String Inverters
Electrical > Inverters > Central Inverters
Electrical > Inverters > Microinverters
Electrical > Transformers
Electrical > Transformers > Step-Up Transformers
Electrical > Transformers > Distribution Transformers
Electrical > Transformers > Pad-Mount Transformers
Electrical > Switchgear
Electrical > Switchgear > Medium Voltage
Electrical > Switchgear > High Voltage
Electrical > Switchgear > Ring Main Units
Electrical > Protection Equipment
Electrical > Protection Equipment > Protection Relays
Electrical > Protection Equipment > Circuit Breakers
Electrical > Protection Equipment > Surge Arresters
Electrical > Cables
Electrical > Cables > MV Cables
Electrical > Cables > LV Cables
Electrical > Cables > DC Cables
Electrical > Cables > Fiber Optic Cables
```

### 3.4 BESS Taxonomy

```
BESS
BESS > Battery Racks
BESS > Battery Racks > Lithium-Ion
BESS > Battery Racks > Flow Battery
BESS > Battery Racks > Lead-Acid
BESS > Power Conversion Systems
BESS > Power Conversion Systems > Inverters
BESS > Power Conversion Systems > Converters
BESS > Energy Management Systems
BESS > Cooling Systems
BESS > Cooling Systems > HVAC
BESS > Cooling Systems > Liquid Cooling
BESS > Fire Suppression Systems
```

### 3.5 Wind Taxonomy

```
Wind
Wind > Turbines
Wind > Turbines > Onshore
Wind > Turbines > Offshore
Wind > Turbine Components
Wind > Turbine Components > Nacelles
Wind > Turbine Components > Blades
Wind > Turbine Components > Towers
Wind > Turbine Components > Generators
Wind > Foundations
Wind > Foundations > Gravity Foundations
Wind > Foundations > Monopile Foundations
```

### 3.6 Civil & Structural Taxonomy

```
Civil
Civil > Foundations
Civil > Foundations > Tracker Foundations
Civil > Foundations > Equipment Foundations
Civil > Foundations > Building Foundations
Civil > Roads
Civil > Roads > Access Roads
Civil > Roads > Maintenance Roads
Civil > Earthworks
Civil > Earthworks > Cut
Civil > Earthworks > Fill
Civil > Earthworks > Grading
Civil > Drainage
Civil > Drainage > Surface Drainage
Civil > Drainage > Subsurface Drainage
Civil > Fencing
Civil > Fencing > Perimeter Fence
Civil > Fencing > Security Fence
Civil > Gates
Civil > Gates > Vehicle Gates
Civil > Gates > Pedestrian Gates

Structural
Structural > Buildings
Structural > Buildings > Switchrooms
Structural > Buildings > Control Rooms
Structural > Buildings > O&M Buildings
Structural > Platforms
Structural > Platforms > Equipment Platforms
Structural > Platforms > Substation Platforms
```

### 3.7 Control & Monitoring Taxonomy

```
SCADA
SCADA > Control Systems
SCADA > Control Systems > PLCs
SCADA > Control Systems > RTUs
SCADA > Monitoring Systems
SCADA > Monitoring Systems > Data Loggers
SCADA > Monitoring Systems > Meters
SCADA > Communication Equipment
SCADA > Communication Equipment > Switches
SCADA > Communication Equipment > Routers
SCADA > Communication Equipment > Radios

Security
Security > Surveillance Systems
Security > Surveillance Systems > CCTV Cameras
Security > Surveillance Systems > NVRs
Security > Access Control
Security > Access Control > Card Readers
Security > Access Control > Biometric Systems
Security > Intrusion Detection
```

### 3.8 Taxonomy Extension

The taxonomy is **extensible** but changes require formal approval. New categories must:
1. Follow the hierarchical structure (max 3 levels)
2. Use title case with clear, unambiguous names
3. Not duplicate existing categories
4. Be documented with example assets

---

## 4. ACC Integration Schema

### 4.1 ACC Asset Import Format

ACC expects assets in a specific Excel format (see `SampleAssetDataImport.xlsx`).

**Assets Sheet:**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| Name | Yes | String | INV-01 |
| Category | Yes | Hierarchical with ">" | Solar > Inverters > String Inverters |
| Description | No | String | SMA Sunny Central 2750-EV |
| Location | No | Hierarchical with ">" | Block 1 > Row 14 |
| Status | Yes | Predefined status | Installed |
| Barcode | No | String | CLSF-INV-001-BC |
| System Names | No | Pipe-delimited | DC Collection \| SCADA Monitoring |

**Systems Sheet:**

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| System name | Yes | String | DC Collection System |
| System category | Yes | Hierarchical with ">" | Electrical > DC Systems |
| Status | Yes | Predefined status | Installed |
| Sub-systems | No | Pipe-delimited | Block 1 DC \| Block 2 DC |

### 4.2 Status Sets

ACC requires predefined status sets. Recommended statuses for energy infrastructure:

**Design Phase:**
- Specified
- Under Review
- Approved

**Procurement Phase:**
- Ordered
- In Transit
- Delivered

**Construction Phase:**
- Stored
- Installed
- Terminated
- Tested

**Commissioning Phase:**
- Pre-Start-up
- Start-up
- Pre-Functional Performance Tests
- Functional Performance Tests

**Operational Phase:**
- Acceptance
- Post-Acceptance
- Operational

### 4.3 Mapping Canonical Model to ACC

**Asset Mapping:**

```python
def asset_to_acc_format(asset: Asset) -> dict:
    return {
        "Name": asset.canonical_id,
        "Category": asset.category,  # Already in ">" format
        "Description": asset.description or "",
        "Location": asset.location or "",
        "Status": asset.status.value,
        "Barcode": asset.canonical_id,  # Use canonical ID as barcode
        "System Names": " | ".join([
            system.name for system in asset.systems
        ])
    }
```

**System Mapping:**

```python
def system_to_acc_format(system: System) -> dict:
    return {
        "System name": system.canonical_id,
        "System category": system.category,
        "Status": system.status.value,
        "Sub-systems": " | ".join([
            subsystem.canonical_id for subsystem in system.subsystems
        ])
    }
```

---

## 5. Entity Resolution

### 5.1 The Problem

Source documents use inconsistent naming:
- Drawing: "INV-01"
- BOM: "Inverter A01"
- Schedule: "String Inverter 1"
- Specification: "SMA Sunny Central Unit 1"

All refer to the same physical asset.

### 5.2 Resolution Strategy

**Step 1: Canonical ID Generation**

Generate a project-scoped unique ID following pattern:
```
{PROJECT_CODE}-{CATEGORY_CODE}-{SEQUENCE}
```

Example: `CLSF-INV-001`

Category codes:
- INV: Inverters
- TRK: Trackers
- PVM: PV Modules
- TRF: Transformers
- CBX: Combiner Boxes
- etc.

**Step 2: Alias Collection**

Store all encountered names in `aliases` field:
```python
asset.aliases = ["INV-01", "Inverter A01", "String Inverter 1", "SMA Sunny Central Unit 1"]
```

**Step 3: Fuzzy Matching**

When a new reference is encountered:
1. **Exact match:** Check if name matches any `canonical_id` or `alias`
2. **Normalized match:** Strip whitespace, lowercase, remove special chars
3. **Fuzzy match:** Use Levenshtein distance (threshold: 85% similarity)
4. **AI-assisted match:** If above fail and confidence < 0.95, use LLM to determine if names refer to same asset

**Step 4: Confidence Scoring**

| Match Type | Confidence Score |
|------------|------------------|
| Exact canonical ID match | 1.00 |
| Exact alias match | 0.98 |
| Normalized match | 0.95 |
| Fuzzy match (>90% similarity) | 0.90 |
| Fuzzy match (85-90% similarity) | 0.85 |
| AI-assisted match (high confidence) | 0.80 |
| AI-assisted match (medium confidence) | 0.70 |

**Step 5: Human Review**

If confidence < 0.95, flag for human review:
```python
if match_confidence < 0.95:
    create_review_task(
        type="ENTITY_RESOLUTION",
        description=f"Confirm if '{new_name}' refers to asset '{asset.canonical_id}'",
        candidates=[asset],
        confidence=match_confidence
    )
```

### 5.3 Duplicate Prevention

Before creating a new asset:
1. Check for existing assets with same `canonical_id` (should never happen)
2. Check for existing assets with overlapping `aliases`
3. Check for existing assets in same category with similar names
4. If potential duplicate found, flag for review

---

## 6. Validation Rules

### 6.1 Asset Validation

**Required Fields:**
- `name`, `canonical_id`, `category`, `status`

**Business Rules:**
- `canonical_id` must match pattern `{PROJECT_CODE}-{CATEGORY_CODE}-{SEQUENCE}`
- `category` must exist in canonical taxonomy
- `parent_asset_id` must not create circular references
- If `location` is specified, must follow hierarchical format
- `specifications` must be valid JSON

**Cross-Entity Rules:**
- All `system_ids` must reference valid systems in same project
- All `source_documents` must reference valid documents in same project
- If `parent_asset_id` is specified, parent must exist

### 6.2 Document Validation

**Required Fields:**
- `name`, `document_number`, `type`, `file_path`, `file_hash`

**Business Rules:**
- `file_hash` must be unique (prevents duplicate uploads)
- `document_number` should be unique within project (warning if duplicate)
- `file_path` must point to accessible file
- `revision` must follow project's revision scheme

### 6.3 Issue Validation

**Required Fields:**
- `title`, `description`, `type`, `status`

**Business Rules:**
- `status` transitions must follow workflow:
  - OPEN → IN_PROGRESS → RESOLVED → CLOSED
  - Cannot skip states
  - Cannot reopen CLOSED issues without approval
- If `related_document_id` is specified, document must exist
- If `related_asset_id` is specified, asset must exist

---

## 7. Data Model Implementation

### 7.1 Database Schema (PostgreSQL)

The canonical data model will be implemented using SQLAlchemy ORM with PostgreSQL as the backing database.

**Key Design Decisions:**

**UUIDs for Primary Keys:** Enables distributed systems and prevents ID collisions.

**JSONB for Flexible Fields:** `specifications`, `metadata`, `extraction_metadata` stored as JSONB for queryability.

**Foreign Keys with Cascades:** Deleting a project cascades to all related entities.

**Indexes:** On `canonical_id`, `project_id`, `category`, `status`, `file_hash`.

**Full-Text Search:** On `name`, `description`, `aliases` for asset search.

### 7.2 API Endpoints

The unified backend API (FastAPI) will expose RESTful endpoints:

**Assets:**
- `GET /api/v1/projects/{project_id}/assets` - List assets
- `POST /api/v1/projects/{project_id}/assets` - Create asset
- `GET /api/v1/assets/{asset_id}` - Get asset details
- `PUT /api/v1/assets/{asset_id}` - Update asset
- `DELETE /api/v1/assets/{asset_id}` - Delete asset
- `GET /api/v1/assets/{asset_id}/relationships` - Get related entities

**Documents:**
- `GET /api/v1/projects/{project_id}/documents` - List documents
- `POST /api/v1/projects/{project_id}/documents` - Upload document
- `GET /api/v1/documents/{document_id}` - Get document details
- `GET /api/v1/documents/{document_id}/download` - Download file

**Systems:**
- `GET /api/v1/projects/{project_id}/systems` - List systems
- `POST /api/v1/projects/{project_id}/systems` - Create system
- `GET /api/v1/systems/{system_id}` - Get system details

**Issues:**
- `GET /api/v1/projects/{project_id}/issues` - List issues
- `POST /api/v1/projects/{project_id}/issues` - Create issue
- `PUT /api/v1/issues/{issue_id}` - Update issue status

**Export:**
- `GET /api/v1/projects/{project_id}/export/acc` - Export to ACC format (Excel)

---

## 8. Next Steps

This canonical data model provides the foundation for the ingestion pipeline. The next phase will define:

1. **Ingestion & Intelligence Pipeline (Artefact B):** How documents are processed and entities extracted
2. **Asset Register Creation Logic (Artefact C):** Detailed rules for asset identification and deduplication
3. **Design Review Register Mapping (Artefact D):** Automated conversion of review registers to Issues
4. **Failure Modes & Risk Controls (Artefact F):** Error handling and confidence scoring
5. **Phased Development Roadmap (Artefact G):** Implementation plan

---

## Appendix A: Example Data

### Example Asset (Clare Solar Farm Inverter)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project_id": "p1p2p3p4-p5p6-p7p8-p9p0-p1p2p3p4p5p6",
  "name": "INV-01",
  "canonical_id": "CLSF-INV-001",
  "aliases": ["INV-01", "Inverter A01", "String Inverter 1", "Block 1 Inverter"],
  "category": "Electrical > Inverters > String Inverters",
  "subcategory": null,
  "description": "SMA Sunny Central 2750-EV string inverter for Block 1",
  "location": "Block 1 > Inverter Station",
  "status": "INSTALLED",
  "parent_asset_id": null,
  "system_ids": ["s1s2s3s4-s5s6-s7s8-s9s0-s1s2s3s4s5s6"],
  "specifications": {
    "manufacturer": "SMA",
    "model": "Sunny Central 2750-EV",
    "rated_power_kw": 2750,
    "input_voltage_range_v": [1000, 1500],
    "output_voltage_v": 800,
    "efficiency_percent": 98.7,
    "dimensions_mm": {"length": 2400, "width": 1200, "height": 2200},
    "weight_kg": 1850
  },
  "source_documents": ["d1d2d3d4-d5d6-d7d8-d9d0-d1d2d3d4d5d6"],
  "extraction_metadata": {
    "extraction_method": "AI_ASSISTED",
    "confidence_score": 0.96,
    "source_file": "CLSF-BOM-5152-002.xlsx",
    "source_location": "Sheet: Inverters, Row: 15",
    "extracted_at": "2026-01-11T10:30:00Z",
    "extracted_by": null,
    "ai_model": "gpt-4.1-mini",
    "human_reviewed": false,
    "review_notes": null,
    "reviewed_at": null,
    "reviewed_by": null
  },
  "created_at": "2026-01-11T10:30:00Z",
  "updated_at": "2026-01-11T10:30:00Z"
}
```

### Example Document (Goonumbla Drawing List)

```json
{
  "id": "d1d2d3d4-d5d6-d7d8-d9d0-d1d2d3d4d5d6",
  "project_id": "g1g2g3g4-g5g6-g7g8-g9g0-g1g2g3g4g5g6",
  "name": "DRAWING LIST (PV PLANT)",
  "document_number": "GOO-ISE-GE-DRW-0001-C1",
  "type": "DRAWING",
  "discipline": "GENERAL",
  "category": "Drawing Register",
  "revision": "C1",
  "file_path": "/projects/goonumbla/drawings/GOO-ISE-GE-DRW-0001-C1.pdf",
  "file_hash": "sha256:a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
  "file_size_bytes": 2842624,
  "page_count": 1,
  "related_assets": [],
  "related_systems": [],
  "metadata": {
    "parsed_document_number": {
      "project_code": "GOO",
      "contractor": "ISE",
      "document_type": "GE",
      "category": "DRW",
      "sequence": "0001",
      "revision": "C1"
    },
    "issue_date": "2021-04-15",
    "prepared_by": "ISE",
    "checked_by": "GRS",
    "approved_by": "FRV"
  },
  "extraction_metadata": {
    "extraction_method": "DETERMINISTIC",
    "confidence_score": 1.0,
    "source_file": "/projects/goonumbla/drawings/GOO-ISE-GE-DRW-0001-C1.pdf",
    "source_location": "Page 1, Title Block",
    "extracted_at": "2026-01-11T09:00:00Z",
    "extracted_by": null,
    "ai_model": null,
    "human_reviewed": true,
    "review_notes": "Verified document number and metadata",
    "reviewed_at": "2026-01-11T09:15:00Z",
    "reviewed_by": "user123"
  },
  "created_at": "2026-01-11T09:00:00Z",
  "updated_at": "2026-01-11T09:15:00Z"
}
```

---

**End of Document**
