# Canonical Data Model - Refinements Discussion

**Date:** January 11, 2026  
**Status:** Working Document

---

## User Feedback & Proposed Changes

### 1.1) Design Principles - Documents

**Feedback:**  
"Documents - there will be registers as well"

**Current State:**  
Section 1 mentions documents generically but doesn't explicitly call out **registers** as a critical document type.

**Issue:**  
Registers (Drawing Registers, Equipment Registers, Cable Schedules, Design Review Registers) are **master index documents** that provide the roadmap for all other documents. They're structurally different from drawings or specifications—they're tabular data that maps references to entities.

**Proposed Changes:**

#### 1. Add "Register" as a Core Document Type

Update `DocumentType` enum:
```python
class DocumentType(Enum):
    DRAWING = "DRAWING"
    SPECIFICATION = "SPECIFICATION"
    REPORT = "REPORT"
    SCHEDULE = "SCHEDULE"
    BOM = "BOM"
    REGISTER = "REGISTER"  # NEW
    OTHER = "OTHER"
```

#### 2. Define Register Subtypes

Registers should have additional classification:

```python
class RegisterType(Enum):
    DRAWING_REGISTER = "DRAWING_REGISTER"        # Master index of all drawings
    EQUIPMENT_REGISTER = "EQUIPMENT_REGISTER"    # Master list of equipment
    CABLE_SCHEDULE = "CABLE_SCHEDULE"            # Cable routing and specifications
    DESIGN_REVIEW_REGISTER = "DESIGN_REVIEW_REGISTER"  # Design review comments
    ITP_REGISTER = "ITP_REGISTER"                # Inspection and test plans
    MATERIAL_REGISTER = "MATERIAL_REGISTER"      # Material tracking
    OTHER = "OTHER"
```

Add to Document schema:
```python
class Document:
    # ... existing fields ...
    register_type: Optional[RegisterType]  # Only populated if type == REGISTER
```

#### 3. Prioritize Register Processing

**Key Insight:** Registers should be processed **first** in the ingestion pipeline because they provide:
- Complete inventory of documents (Drawing Register)
- Complete inventory of equipment (Equipment Register)
- Relationships between documents and assets (Cable Schedules)

**Processing Order:**
1. **Drawing Register** → Discover all documents that should exist
2. **Equipment Register / BOM** → Discover all assets that should exist
3. **Cable Schedules** → Discover connectivity between assets
4. **Individual Drawings** → Extract detailed specifications
5. **Design Review Register** → Create Issues

**Question for you:** Should the system **require** a Drawing Register, or should it be able to operate without one (with degraded confidence)?

---

### 1.2) Asset Organization vs. File Organization

**Feedback:**  
"You've conflated the organisation of the drawings (EL.MV for Goonumbla and Block Based for Clare) as an asset organisation .. that's simply how the files are organised .. sometimes they'll just be 'Civil' and 'Electrical' .. Drawing Index or Drawing Registers will be essential .. in the absence of that, we'll need to think of a plan"

**Current State:**  
I incorrectly interpreted Goonumbla's `EL.MV` (Electrical > Medium Voltage) and Clare's "Block 1-23" as **asset categorization** when they're actually just **file/folder organization conventions**.

**Issue:**  
The canonical data model should **not** assume any particular file organization. Projects will organize files differently:
- By discipline (Civil, Electrical, Structural)
- By system (Solar Farm, Substation)
- By contractor (ISE, YUR, GRS)
- By block/zone (Block 1, Block 2)
- Or no organization at all (flat directory)

**Proposed Changes:**

#### 1. Decouple File Organization from Asset Taxonomy

**File Organization** = How documents are stored (project-specific, unpredictable)  
**Asset Taxonomy** = How assets are classified (canonical, standardized)

The ingestion pipeline should:
1. **Discover** documents regardless of folder structure
2. **Extract** document metadata (number, type, discipline)
3. **Parse** Drawing Register (if available) to understand document relationships
4. **Extract** assets from documents based on content, not file location

#### 2. Drawing Register as Primary Source of Truth

**If Drawing Register exists:**
- Use it to build a complete document inventory
- Extract document metadata (number, title, discipline, category)
- Use it to guide which documents to process
- Cross-reference actual files against register to detect missing documents

**Example from Goonumbla Drawing Register:**

| Drawing Number | Description | Category |
|----------------|-------------|----------|
| GOO-ISE-GE-DRW-0001 | Site Layout | General Arrangements |
| GOO-ISE-EL-DRW-0023 | Single Line Diagram | Electric Systems |
| GOO-ISE-CV-DRW-0005 | Perimeter Fence | Civil Works |

This tells us:
- What documents exist
- What discipline they belong to
- What category they fall under
- What to expect when we process them

**If Drawing Register does NOT exist:**
- Scan all files recursively
- Parse document numbers from filenames
- Extract metadata from title blocks (using OCR/AI)
- Build a synthetic register from discovered documents
- Flag for human review (confidence < 0.95)

#### 3. Document Discovery Strategy

```python
def discover_documents(project_path: str, drawing_register: Optional[DataFrame]) -> List[Document]:
    """
    Discover all documents in a project.
    
    Strategy:
    1. If drawing_register exists, use it as ground truth
    2. Scan filesystem for all document files
    3. Cross-reference: files vs register
    4. Flag discrepancies (missing files, unexpected files)
    """
    
    if drawing_register is not None:
        # Parse register to get expected documents
        expected_docs = parse_drawing_register(drawing_register)
        
        # Scan filesystem
        found_files = scan_filesystem(project_path)
        
        # Match files to register entries
        matched_docs = match_files_to_register(expected_docs, found_files)
        
        # Flag discrepancies
        missing_files = expected_docs - matched_docs
        unexpected_files = found_files - matched_docs
        
        return {
            "documents": matched_docs,
            "missing": missing_files,
            "unexpected": unexpected_files,
            "confidence": 0.98  # High confidence with register
        }
    else:
        # No register: discover from filesystem
        found_files = scan_filesystem(project_path)
        
        # Extract metadata from each file
        documents = []
        for file in found_files:
            doc = extract_document_metadata(file)
            doc.extraction_metadata.confidence_score = 0.85  # Lower confidence
            documents.append(doc)
        
        return {
            "documents": documents,
            "missing": [],
            "unexpected": [],
            "confidence": 0.85,  # Lower confidence without register
            "requires_review": True
        }
```

**Question for you:** What should happen if we find a Drawing Register but it's incomplete or outdated? Should we trust the register or the filesystem?

---

### 2.3) Cables - Detailed Hierarchy

**Feedback:**  
"We'll need to make sure cables are included .. at an MV level, we have feeder cables .. at a DC level it goes from a combiner box (or DC box) to a DC array cable .. then to a sub-array cable (in some instances) and then down to string cables which connect to modules."

**Current State:**  
The taxonomy has a generic "Cables" category but doesn't capture the detailed hierarchy and functional differences between cable types.

**Issue:**  
Cables are **critical infrastructure** with complex hierarchies and relationships. The current taxonomy is too simplistic:

```
Electrical > Cables
Electrical > Cables > MV Cables
Electrical > Cables > LV Cables
Electrical > Cables > DC Cables
```

This doesn't capture:
- **Functional hierarchy** (string → array → sub-array → feeder)
- **Voltage levels** (DC vs AC, LV vs MV vs HV)
- **Connectivity** (what connects to what)

**Proposed Changes:**

#### 1. Expanded Cable Taxonomy

```
Electrical > Cables
Electrical > Cables > DC Cables
Electrical > Cables > DC Cables > String Cables          # Module to combiner box
Electrical > Cables > DC Cables > Array Cables           # Combiner box to inverter
Electrical > Cables > DC Cables > Sub-Array Cables       # Intermediate aggregation
Electrical > Cables > AC Cables
Electrical > Cables > AC Cables > LV Cables              # Low voltage AC
Electrical > Cables > AC Cables > LV Cables > Inverter AC Output
Electrical > Cables > AC Cables > MV Cables              # Medium voltage AC
Electrical > Cables > AC Cables > MV Cables > Feeder Cables
Electrical > Cables > AC Cables > MV Cables > Interconnection Cables
Electrical > Cables > AC Cables > HV Cables              # High voltage AC (substation)
Electrical > Cables > AC Cables > HV Cables > Transmission Cables
Electrical > Cables > Control Cables
Electrical > Cables > Control Cables > Instrumentation Cables
Electrical > Cables > Control Cables > Communication Cables
Electrical > Cables > Fiber Optic Cables
Electrical > Cables > Fiber Optic Cables > SCADA Fiber
Electrical > Cables > Fiber Optic Cables > Communication Fiber
Electrical > Cables > Earthing Cables
Electrical > Cables > Earthing Cables > Grounding Conductors
Electrical > Cables > Earthing Cables > Bonding Cables
```

#### 2. Cable-Specific Attributes

Cables have unique attributes that other assets don't:

```python
class CableSpecifications:
    # Physical properties
    conductor_material: str              # Copper, Aluminum
    conductor_size_mm2: float            # Cross-sectional area
    number_of_cores: int                 # 1, 2, 3, 4, etc.
    insulation_type: str                 # XLPE, PVC, EPR
    armoring: Optional[str]              # SWA, AWA, None
    outer_sheath: str                    # PVC, LSZH
    
    # Electrical properties
    voltage_rating_kv: float             # Rated voltage
    current_rating_a: float              # Ampacity
    dc_resistance_ohm_per_km: float
    ac_resistance_ohm_per_km: float
    reactance_ohm_per_km: float
    
    # Installation properties
    length_m: float                      # Cable length
    route: str                           # Cable route description
    installation_method: str             # Buried, Tray, Conduit, Aerial
    burial_depth_mm: Optional[int]       # If buried
    
    # Connectivity
    from_equipment: str                  # Source equipment ID
    from_terminal: Optional[str]         # Source terminal
    to_equipment: str                    # Destination equipment ID
    to_terminal: Optional[str]           # Destination terminal
    
    # Standards
    standard: str                        # AS/NZS 5000.1, IEC 60502
    fire_rating: Optional[str]           # Fire performance class
```

#### 3. Cable Hierarchy Relationships

Cables form a **network topology**:

```
PV Module
  ↓ (String Cable)
Combiner Box / DC Box
  ↓ (Array Cable)
Inverter
  ↓ (AC Output Cable - LV)
LV/MV Transformer
  ↓ (MV Feeder Cable)
MV Switchgear
  ↓ (MV Feeder Cable)
HV Transformer
  ↓ (HV Transmission Cable)
Grid Connection Point
```

The data model should capture these relationships:

```python
class Cable(Asset):
    # Inherits from Asset
    # Additional cable-specific fields:
    
    from_asset_id: UUID                  # Source equipment
    from_terminal: Optional[str]         # Source terminal/connection point
    to_asset_id: UUID                    # Destination equipment
    to_terminal: Optional[str]           # Destination terminal/connection point
    
    cable_route: Optional[str]           # Route description (e.g., "Trench T-01")
    cable_route_assets: List[UUID]       # Route infrastructure (trenches, trays)
```

#### 4. Cable Schedule as Primary Source

Cable schedules are typically the **authoritative source** for cable data. They contain:

| Cable ID | From | To | Type | Size | Length | Route |
|----------|------|-----|------|------|--------|-------|
| DC-001 | CB-01 | INV-01 | DC Array Cable | 2x240mm² | 150m | Trench T-01 |
| MV-001 | TX-01 | SW-01 | MV Feeder | 3x185mm² | 300m | Trench T-05 |

**Processing Strategy:**
1. **Identify cable schedules** (by document type or filename pattern)
2. **Parse tabular data** (deterministic extraction from Excel/PDF tables)
3. **Create cable assets** with connectivity information
4. **Resolve equipment references** (CB-01 → Combiner Box asset)
5. **Validate connectivity** (ensure from/to equipment exists)

**Question for you:** 
- Are cable schedules always comprehensive, or do some cables only appear in drawings?
- Should we create cable assets from drawings if they're not in a schedule?
- How do we handle cable naming inconsistencies (e.g., "DC-001" vs "DC001" vs "DC Cable 1")?

---

### 3.3) DC Cable Detail in Taxonomy

**Feedback:**  
"As above, need to ensure that we capture sufficient detail of DC cables -- string cables, array cables, sub array cables etc"

**Addressed in 2.3 above** with the expanded cable taxonomy.

**Additional Consideration:**

Should we create a separate **Cable Register** entity to track the master list of cables, similar to how we track documents?

```python
class CableRegister:
    """
    Master register of all cables in a project.
    Typically sourced from cable schedules.
    """
    id: UUID
    project_id: UUID
    cable_id: UUID                       # Reference to Cable asset
    cable_number: str                    # As appears in schedule
    from_equipment: str                  # Equipment reference (may not be resolved yet)
    to_equipment: str                    # Equipment reference (may not be resolved yet)
    cable_type: str                      # As described in schedule
    specifications: Dict[str, Any]       # Raw specifications from schedule
    source_document_id: UUID             # Cable schedule document
    source_row: int                      # Row in schedule
    extraction_metadata: ExtractionMetadata
```

This would allow us to:
1. **Track all cables** even before equipment is fully resolved
2. **Cross-reference** cable schedules against installed cables
3. **Detect missing cables** (in schedule but not found in drawings)
4. **Detect unexpected cables** (in drawings but not in schedule)

---

## Summary of Proposed Changes

### 1. Document Types & Registers

- [ ] Add `REGISTER` to `DocumentType` enum
- [ ] Add `RegisterType` enum with subtypes
- [ ] Add `register_type` field to Document schema
- [ ] Define register processing priority in ingestion pipeline
- [ ] Create document discovery strategy (with/without Drawing Register)

### 2. File Organization vs Asset Taxonomy

- [ ] Remove assumptions about file organization from data model
- [ ] Emphasize Drawing Register as primary source of truth
- [ ] Define fallback strategy when Drawing Register is absent
- [ ] Add document discovery and cross-referencing logic

### 3. Cable Taxonomy & Specifications

- [ ] Expand cable taxonomy with detailed hierarchy (string, array, sub-array, feeder)
- [ ] Add cable-specific specification fields (conductor, voltage, connectivity)
- [ ] Add `from_asset_id` and `to_asset_id` to Cable schema for topology
- [ ] Define cable schedule parsing as primary extraction method
- [ ] Consider adding `CableRegister` entity for tracking

---

## Questions for Discussion

1. **Drawing Register Requirement:**  
   Should the system require a Drawing Register, or operate with degraded confidence without one?

2. **Register Conflicts:**  
   What should happen if Drawing Register conflicts with filesystem (missing files, extra files, outdated register)?

3. **Cable Schedules:**  
   Are cable schedules always comprehensive? Should we extract cables from drawings if not in schedule?

4. **Cable Naming:**  
   How should we handle cable naming inconsistencies across documents?

5. **Cable Register Entity:**  
   Should we create a separate CableRegister entity, or is Cable asset sufficient?

6. **Other Registers:**  
   Are there other critical registers we should prioritize (Equipment Register, Material Register, ITP Register)?

---

**Next Steps:**

Once we align on these refinements, I'll update the canonical data model document and proceed to design the ingestion pipeline.
