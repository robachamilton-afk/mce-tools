# Intelligent Inference Requirements for ACC Datascraper

**Date:** January 11, 2026  
**Purpose:** Define how the system must intelligently infer data completeness and search across documents

---

## Core Principle

> **The system must understand what data is REQUIRED for each asset type, recognize what each document type CAN provide, and intelligently search for missing data across the document set.**

This is not a simple "parse and extract" scraper. It's an **intelligent document analysis system** that:
1. Understands asset data requirements
2. Classifies document capabilities
3. Validates data completeness
4. Searches for missing data
5. Flags gaps and provides guidance

---

## 1. Asset Data Requirements

Each asset type has **required**, **desirable**, and **optional** fields.

### Cable Asset Requirements

| Field | Requirement | Why |
|-------|-------------|-----|
| Cable ID | **REQUIRED** | Unique identifier for individual tracking |
| Cable Type | **REQUIRED** | DC, AC, MV, Control, Fiber |
| Conductor Size | **REQUIRED** | mm² or AWG |
| Length | **REQUIRED** | Meters or feet |
| From Location | **REQUIRED** | Source equipment/location |
| To Location | **REQUIRED** | Destination equipment/location |
| Voltage Rating | DESIRABLE | kV or V |
| Ampacity | DESIRABLE | Current carrying capacity |
| Installation Method | DESIRABLE | Buried, conduit, tray |
| Manufacturer | OPTIONAL | Brand/supplier |
| Part Number | OPTIONAL | Catalog number |

**Data Completeness Levels:**
- **FULL:** All required + desirable fields present
- **PARTIAL:** All required fields present, some desirable missing
- **INSUFFICIENT:** Missing required fields (cannot create individual asset)
- **BULK_ONLY:** Only total quantities available (no individual tracking)

---

## 2. Document Type Capabilities

Each document type has different capabilities for providing asset data.

### BOM (Bill of Materials)

**Format:** Excel spreadsheet  
**Typical Structure:** Hierarchical with codes, descriptions, quantities

**Can Provide:**
- ✅ Asset types (what equipment exists)
- ✅ Bulk quantities (total meters of cable)
- ✅ Specifications (cable size, type)
- ❌ Individual asset IDs
- ❌ From/To connectivity
- ❌ Individual asset locations

**Data Completeness for Cables:** **BULK_ONLY**

**Example:**
```
Code: EL.CB.MV.240
Description: MV Cable 19/33kV 240mm² Al XLPE
Quantity: 15,000 m
```

---

### Cable Datasheet

**Format:** PDF table (usually in appendix of calculation report)  
**Typical Structure:** Specifications table with options

**Can Provide:**
- ✅ Cable specifications (voltage, size, type)
- ✅ Technical parameters (resistance, ampacity)
- ❌ Individual cable IDs
- ❌ Quantities
- ❌ From/To connectivity

**Data Completeness for Cables:** **INSUFFICIENT** (specifications only, not assets)

**Example:**
```
19/33 (36) kV ALUMINIUM TR-XLPE POWER CABLE
Sizes: 240mm², 300mm², 500mm², 630mm²
Voltage: 19/33 (36) kV
Ampacity: 450A (240mm²), 513A (300mm²)...
```

---

### Cable Schedule (Standalone Drawing)

**Format:** PDF table in dedicated drawing  
**Typical Structure:** Table with columns: Cable ID, From, To, Type, Size, Length

**Can Provide:**
- ✅ Individual cable IDs
- ✅ From/To connectivity
- ✅ Cable type and size
- ✅ Cable length
- ✅ Installation method
- ✅ Voltage rating

**Data Completeness for Cables:** **FULL**

**Example:**
```
Cable ID: W075
From: Panel 11B4.2
To: TX01
Type: Control
Size: 2.5mm²
Length: 45m
```

---

### Calculation Report (with embedded tables)

**Format:** PDF with calculation methodology + results tables  
**Typical Structure:** Text + tables showing cable runs with calculations

**Can Provide:**
- ✅ Individual cable IDs (or implicit IDs like "BUS 1_1_1")
- ✅ From/To connectivity (implicit from naming or explicit)
- ✅ Cable type and size
- ✅ Cable length
- ✅ Technical parameters (voltage drop, ampacity)
- ⚠️ May require inference from context

**Data Completeness for Cables:** **FULL** or **PARTIAL** (depends on table structure)

**Example:**
```
LINE / FROM / TO: MV-1 / BL-08 / BL-07
Length: 460m
Size: 240mm²
Voltage: 33kV
```

---

## 3. Intelligent Inference Logic

### Step 1: Initial Asset Discovery

When processing the BOM, the system discovers:
- "15,000m of MV cable 240mm²"
- "8,500m of DC cable 95mm²"

**System Action:**
1. Create placeholder "Cable Material" entries
2. Flag: `data_completeness = BULK_ONLY`
3. Flag: `requires_cable_schedule = TRUE`
4. **Trigger:** Search for cable schedules

---

### Step 2: Document Search Strategy

**Search Priority:**

**Priority 1: Dedicated Cable Schedule Drawings**
- Search filenames for: `*cable*schedule*`, `*cable*list*`
- Search drawing titles for: "Cable Schedule", "Cable List"
- **If found:** Extract individual cable assets (FULL data)

**Priority 2: Calculation Reports**
- Search for: `*calculation*`, `*calc*`, `*MV*`, `*DC*`, `*LV*`
- Open and scan for tables with columns: "Cable", "From", "To", "Length"
- **If found:** Extract individual cable assets (FULL or PARTIAL data)

**Priority 3: Appendices in Technical Reports**
- Search for: `*report*`, `*technical*`, `*specification*`
- Scan appendices for cable tables
- **If found:** Extract individual cable assets (PARTIAL data)

**Priority 4: Drawings (visual extraction - future)**
- Search for: `*single*line*`, `*schematic*`, `*layout*`
- Use OCR + AI to extract cable information from drawings
- **If found:** Extract individual cable assets (PARTIAL data, lower confidence)

---

### Step 3: Data Completeness Validation

After searching, the system validates:

**Scenario A: Cable schedules found**
- ✅ Extract individual cable assets
- ✅ Mark as `data_completeness = FULL`
- ✅ Link cables to equipment (from/to resolution)

**Scenario B: Calculation tables found**
- ✅ Extract individual cable assets
- ⚠️ Mark as `data_completeness = PARTIAL` (may be missing some fields)
- ✅ Link cables to equipment (from/to resolution)

**Scenario C: Only BOM data**
- ❌ Cannot create individual cable assets
- ❌ Mark as `data_completeness = BULK_ONLY`
- ⚠️ **Generate warning:** "Cable schedules required for individual cable tracking"
- 📋 **Provide guidance:** "Upload cable schedule drawings or calculation reports"

---

### Step 4: User Guidance

**For BULK_ONLY assets, the system generates a report:**

```
⚠️ DATA COMPLETENESS WARNING

Asset Type: Cables (MV, DC, AC)
Current Status: BULK_ONLY (15,000m total)
Required for ACC: Individual cable assets with from/to connectivity

Missing Documents:
- Cable schedule drawings (e.g., "Cable Schedule - MV Feeders")
- Calculation reports with cable tables (e.g., "MV Calculation Report")

Recommendation:
- Upload cable schedule drawings if available
- Upload electrical calculation reports (MV, DC, LV)
- If schedules don't exist, cables will be tracked as bulk material only

Impact:
- Cannot link cables to equipment in ACC
- Cannot track individual cable maintenance
- Cannot generate cable connectivity diagrams
```

---

## 4. Implementation Strategy

### Phase 1: Rule-Based Inference (POC)

**For the POC:**
1. Define asset requirements (hardcoded for cables, inverters, etc.)
2. Classify documents by filename and title
3. Extract from known document types (BOM, cable schedules, calculation reports)
4. Validate data completeness
5. Generate gap reports

**Complexity:** Medium  
**Accuracy:** 80-90% (depends on document naming consistency)

---

### Phase 2: AI-Assisted Inference (Future)

**For full automation:**
1. Use LLM to classify document types by content (not just filename)
2. Use LLM to identify tables with cable information
3. Use LLM to extract from unstructured text
4. Use LLM to infer from/to connectivity from context
5. Use computer vision to extract from drawings

**Complexity:** High  
**Accuracy:** 90-95% (with human review for <95% confidence)

---

## 5. Data Model Updates

### Asset Entity

Add fields:
```python
data_completeness: Enum[FULL, PARTIAL, INSUFFICIENT, BULK_ONLY]
requires_additional_docs: Boolean
missing_fields: Array[String]
data_sources: Array[DocumentID]  # Which documents provided data
```

### Document Entity

Add fields:
```python
document_capability: Enum[SPECIFICATIONS, BULK_QUANTITIES, INDIVIDUAL_ASSETS, CONNECTIVITY]
provides_for_asset_types: Array[String]  # ["cables", "inverters"]
completeness_contribution: Enum[PRIMARY, SUPPLEMENTARY, REFERENCE]
```

### DataGap Entity (NEW)

```python
id: UUID
project_id: UUID
asset_type: String  # "cables"
current_completeness: Enum[FULL, PARTIAL, INSUFFICIENT, BULK_ONLY]
required_completeness: Enum[FULL, PARTIAL]
missing_document_types: Array[String]  # ["cable_schedule", "calculation_report"]
user_guidance: String
impact_description: String
priority: Enum[CRITICAL, HIGH, MEDIUM, LOW]
```

---

## 6. Success Criteria

**The system successfully demonstrates intelligent inference when:**

1. ✅ It recognizes that BOM cable data is BULK_ONLY
2. ✅ It searches for and finds cable schedules in calculation reports
3. ✅ It extracts individual cable assets from those tables
4. ✅ It validates data completeness (FULL vs. PARTIAL)
5. ✅ It generates clear gap reports when data is missing
6. ✅ It provides actionable guidance to users

**This is what separates a "scraper" from an "intelligent system."**

---

## Next Steps

1. Update the Canonical Data Model with new fields
2. Define asset requirements for all asset types (not just cables)
3. Define document capabilities for all document types
4. Implement rule-based inference for POC
5. Test with Goonumbla to validate approach
6. Design AI-assisted inference for future phases

**Ready to proceed?**
