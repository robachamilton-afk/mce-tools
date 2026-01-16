# POC Scope V3 - Intelligent Inference Approach

**Date:** January 11, 2026  
**Project:** Goonumbla Solar Farm + Substation  
**Approach:** Rule-based intelligent inference with data completeness validation

---

## Overview

This POC demonstrates an **intelligent document analysis system** that:
1. Understands asset data requirements
2. Recognizes document capabilities
3. Searches across documents for complete data
4. Validates data completeness
5. Generates gap reports and user guidance

**Not a simple scraper—an intelligent inference engine.**

---

## POC Document Set

### Solar Farm Documents

**1. Bill of Materials (BOM)**
- File: `GOO-ISE-GE-RPT-0003_C1-Bill of Materials (BOM).xlsx`
- Provides: Bulk equipment quantities
- Completeness: BULK_ONLY for cables, FULL for equipment

**2. MV Calculation Report**
- File: `GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf`
- Provides: Individual MV cable runs with from/to connectivity
- Completeness: FULL for MV cables

**3. DC Calculation Report**
- File: `GOO-ISE-EL-CAL-0002-C1_Low Voltage (DC) Calculation.pdf`
- Provides: Individual DC cable runs per block
- Completeness: FULL for DC cables

**4. Drawing List**
- File: `GOO-ISE-GE-DRW-0001-C1_DRAWING LIST (PV PLANT).pdf`
- Provides: Document inventory and metadata
- Enables: Gap analysis

**5. Technical Report**
- File: `GOO-ISE-GE-RPT-0002-C1_Report (Technical and General Statement).pdf`
- Provides: Project context and design parameters

### Substation Documents

**6. Equipment Lists (4 files)**
- Provides: Individual equipment assets with specifications
- Completeness: FULL for substation equipment

**7. Cable Schedules (7 files)**
- Provides: Individual cable assets with from/to connectivity
- Completeness: FULL for substation cables

---

## POC Workflow

### Phase 1: Initial Discovery (BOM Processing)

**Step 1.1: Extract Equipment from BOM**
- Inverters → Create individual assets (FULL)
- Trackers → Create individual assets (FULL)
- DC Boxes → Create individual assets (FULL)
- Transformers → Create individual assets (FULL)

**Step 1.2: Detect Cable Bulk Quantities**
- MV Cables: 15,000m total
- DC Cables: 8,500m total
- **Flag:** `data_completeness = BULK_ONLY`
- **Flag:** `requires_cable_schedule = TRUE`

**Step 1.3: Trigger Intelligent Search**
- System recognizes: "Cables require individual tracking"
- System initiates: "Search for cable schedules"

---

### Phase 2: Intelligent Document Search

**Step 2.1: Search for Cable Schedules**

**Search Strategy:**
1. Scan filenames for: `*cable*schedule*`, `*cable*list*`
2. Scan filenames for: `*calculation*`, `*calc*`, `*MV*`, `*DC*`
3. Scan drawing titles in Drawing Register

**Results:**
- ✅ Found: `GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf`
- ✅ Found: `GOO-ISE-EL-CAL-0002-C1_Low Voltage (DC) Calculation.pdf`
- ✅ Found: Multiple substation cable schedules

**Step 2.2: Classify Document Capabilities**

For each found document:
- Open and scan for tables
- Identify columns: Cable ID, From, To, Length, Size
- Classify capability: INDIVIDUAL_ASSETS + CONNECTIVITY
- Mark as: `provides_for_asset_types = ["cables"]`

---

### Phase 3: Data Extraction

**Step 3.1: Extract from MV Calculation Report**

**Table Found:** Page 10-15, "MV Cable Calculation Results"

**Extract Individual Cables:**
```
Cable ID: MV-1/BL-08/BL-07
From: Block 08
To: Block 07
Type: MV Feeder
Size: 240mm²
Length: 460m
Voltage: 33kV
Installation: Directly Buried
```

**Repeat for all MV cable runs (16 cables)**

**Step 3.2: Extract from DC Calculation Report**

**Table Found:** Page 14-30, "Average Voltage Drop per Power Block"

**Extract Individual Cables:**
```
Cable ID: BUS 1_1_1
From: (inferred from block structure)
To: (inferred from block structure)
Type: DC Bus
Size: 95mm²
Length: 244m
Section: 2x(1x300)
Ampacity: 272.41A
```

**Repeat for all DC cables (hundreds of cables across all blocks)**

**Step 3.3: Extract from Substation Cable Schedules**

**Standard cable schedule format:**
```
Cable ID: W075
From: Panel 11B4.2
To: TX01
Type: 110V DC Supply
Size: 2.5mm²
Length: 45m
```

**Repeat for all substation cables (200-500 cables)**

---

### Phase 4: Data Completeness Validation

**Step 4.1: Validate Each Cable Asset**

For each extracted cable:
- ✅ Has Cable ID? → Required field present
- ✅ Has From/To? → Required field present
- ✅ Has Size? → Required field present
- ✅ Has Length? → Required field present
- ⚠️ Has Voltage Rating? → Desirable field (may be missing)
- ⚠️ Has Ampacity? → Desirable field (may be missing)

**Assign Completeness Level:**
- All required + most desirable → `FULL`
- All required + some desirable → `PARTIAL`
- Missing required fields → `INSUFFICIENT`

**Step 4.2: Generate Data Completeness Report**

```
Asset Type: MV Cables
Total Assets: 16
Data Completeness: FULL (100%)
Source Documents: GOO-ISE-EL-CAL-0001-C1

Asset Type: DC Cables
Total Assets: 384
Data Completeness: PARTIAL (85%)
Source Documents: GOO-ISE-EL-CAL-0002-C1
Missing Fields: Installation method (15% of cables)

Asset Type: Substation Cables
Total Assets: 456
Data Completeness: FULL (100%)
Source Documents: 7 cable schedule drawings
```

---

### Phase 5: Equipment Reference Resolution

**Step 5.1: Resolve From/To References**

For each cable, resolve equipment references:

**Example:**
```
Cable: MV-1/BL-08/BL-07
From Reference: "BL-08" (Block 08)
To Reference: "BL-07" (Block 07)

Search for equipment in Block 08:
- Found: Inverter INV-08
- Found: MV Transformer MVT-08

Search for equipment in Block 07:
- Found: Inverter INV-07
- Found: MV Transformer MVT-07

Resolution:
- From Equipment: MVT-08 (MV Transformer in Block 08)
- To Equipment: MVT-07 (MV Transformer in Block 07)
- Confidence: 95%
```

**Step 5.2: Flag Unresolved References**

For references that cannot be resolved:
- Mark as `from_equipment_id = NULL`
- Mark as `from_equipment_ref = "BL-08"` (raw reference)
- Flag: `requires_manual_review = TRUE`
- Add to gap report

---

### Phase 6: Gap Analysis

**Step 6.1: Register vs. Filesystem Reconciliation**

Compare Drawing Register against filesystem:
- Documents in register: 584
- Documents in filesystem: 654
- Matched: 260 (45%)
- Missing: 324 (55%)
- Unexpected: 394 (60%)

**Step 6.2: Data Completeness Gaps**

Identify assets with incomplete data:
- 15% of DC cables missing installation method
- 5% of cables have unresolved equipment references
- 0 critical gaps (all required fields present)

**Step 6.3: Generate Gap Report**

```markdown
# Data Gap Report - Goonumbla Solar Farm

## Summary
- Total Assets Extracted: 1,200+
- Data Completeness: 92% FULL, 8% PARTIAL
- Critical Gaps: 0
- Minor Gaps: 3

## Gap Details

### Gap 1: DC Cable Installation Methods
- Severity: MINOR
- Assets Affected: 58 DC cables (15%)
- Impact: Cannot determine derating factors for maintenance
- Recommendation: Review trench drawings or site photos

### Gap 2: Unresolved Equipment References
- Severity: MINOR
- Assets Affected: 23 cables (5%)
- Impact: Cannot auto-link cables to equipment in ACC
- Recommendation: Manual review required

### Gap 3: Missing Documents
- Severity: LOW
- Documents Affected: 324 documents in register not in filesystem
- Impact: Cannot extract data from missing documents
- Recommendation: Upload missing documents if available

## Overall Assessment
✅ POC SUCCESSFUL: 92% of assets have FULL data completeness
✅ All critical data present for ACC upload
⚠️ Minor gaps require manual review (estimated 2-4 hours)
```

---

### Phase 7: ACC Export

**Step 7.1: Generate ACC Asset Register**

Map extracted assets to ACC Excel format:

**Assets Sheet:**
```
Name,Category,Status,Location,Specifications
INV-01,Electrical > Inverters > String Inverters,Active,Block 01,{manufacturer:...,model:...}
MV-1/BL-08/BL-07,Cables > AC > MV Feeder Cables,Active,Block 08 to Block 07,{size:240mm²,length:460m}
```

**Systems Sheet:**
```
System Name,System Category,Status,Sub-systems
Block 01 Power System,Electrical > Solar Power Systems,Active,INV-01|MVT-01|DCB-01
```

**Step 7.2: Generate Data Provenance Report**

For each asset, document data sources:
```
Asset: MV-1/BL-08/BL-07
Data Sources:
- GOO-ISE-EL-CAL-0001-C1 (MV Calculation Report, Page 10)
- GOO-ISE-GE-RPT-0003_C1 (BOM, bulk quantity validation)
Extraction Method: PDF table extraction
Confidence: 98%
```

---

## Success Criteria

### Minimal Success (Must Achieve)
- ✅ Extract 80%+ of equipment from BOM
- ✅ Recognize that BOM cables are BULK_ONLY
- ✅ Search for and find cable schedules in calculation reports
- ✅ Extract 70%+ of individual cable assets
- ✅ Generate valid ACC Excel file
- ✅ Manual upload to ACC succeeds

### Good Success (Target)
- ✅ Extract 90%+ of equipment
- ✅ Extract 85%+ of individual cables
- ✅ Validate data completeness (FULL vs. PARTIAL)
- ✅ Resolve 80%+ of equipment references
- ✅ Generate comprehensive gap report

### Excellent Success (Stretch Goal)
- ✅ Extract 95%+ of all assets
- ✅ Resolve 90%+ of equipment references
- ✅ Demonstrate end-to-end intelligent inference
- ✅ Generate actionable user guidance for gaps
- ✅ Prove the system is "intelligent," not just a scraper

---

## Technical Implementation

### Week 1: Core Extraction Engine

**Day 1-2: BOM Parser**
- Parse Excel with hierarchical structure
- Extract equipment assets
- Detect bulk cable quantities
- Flag: requires_cable_schedule

**Day 3-4: PDF Table Extractor**
- Extract tables from calculation reports
- Identify cable schedule tables
- Parse structured data
- Handle multi-page tables

**Day 5: Equipment List Parser**
- Extract from substation equipment lists
- Parse PDF tables
- Map to asset schema

### Week 2: Intelligent Inference & Validation

**Day 1: Document Search Engine**
- Implement filename-based search
- Implement title-based search
- Classify document capabilities
- Prioritize data sources

**Day 2: Data Completeness Validator**
- Define asset requirements
- Validate extracted data
- Assign completeness levels
- Generate gap reports

**Day 3: Equipment Reference Resolver**
- Parse from/to references
- Search for matching equipment
- Fuzzy matching with confidence
- Flag unresolved references

**Day 4: ACC Excel Generator**
- Map to ACC template format
- Generate Assets and Systems sheets
- Include data provenance
- Validate output

**Day 5: Testing & Documentation**
- Manual upload to ACC
- Validate asset creation
- Test document linking
- Document lessons learned

---

## Deliverables

1. **Working Code:**
   - BOM parser (Python)
   - PDF table extractor (Python + pdfplumber/tabula)
   - Document search engine (Python)
   - Data completeness validator (Python)
   - ACC Excel generator (Python + openpyxl)

2. **Documentation:**
   - POC Results Report
   - Data Completeness Analysis
   - Gap Report (Goonumbla)
   - Lessons Learned
   - Next Steps Recommendations

3. **ACC Outputs:**
   - Asset Register Excel file
   - Data Provenance Report
   - Gap Analysis Report

---

## Next Steps After POC

1. **Validate with Additional Projects:**
   - Test with Clare (different structure)
   - Test with Haughton (more complexity)
   - Test with 4th project (new patterns)

2. **Enhance Inference Engine:**
   - Add AI-assisted document classification
   - Add OCR for drawing extraction
   - Add cross-stage change detection

3. **Build Production System:**
   - Web UI for user checkpoints
   - API for ACC integration
   - Automated pipeline orchestration

---

**Ready to start building the POC?**
