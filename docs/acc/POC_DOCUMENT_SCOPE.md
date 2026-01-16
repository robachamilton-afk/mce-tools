# POC Document Scope - Goonumbla Project

**Date:** January 11, 2026  
**Purpose:** Define which documents to include in the minimal POC

---

## Key Documents for POC

### 1. Solar Farm Documents

#### A. Bill of Materials (PRIMARY)
**File:** `GOO-ISE-GE-RPT-0003_C1-Bill of Materials (BOM).xlsx`  
**Location:** `1. SOLAR FARM/3. Reports/`

**Why Include:**
- Comprehensive list of all solar farm equipment
- Structured Excel format (easiest to parse)
- Contains: Description, Quantity, Unit, Manufacturer, Model
- Primary source for asset extraction

**Asset Types:**
- PV Modules
- Inverters
- Trackers
- Combiner Boxes
- MV Transformers
- Cables (high-level)

---

#### B. Drawing List (REGISTER)
**File:** `GOO-ISE-GE-DRW-0001-C1_DRAWING LIST (PV PLANT).pdf`  
**Location:** `1. SOLAR FARM/`

**Why Include:**
- Master index of all solar farm drawings
- Contains document metadata (number, title, discipline, revision)
- Enables register vs. filesystem reconciliation
- Tests our gap analysis logic

**What We'll Extract:**
- Document numbers
- Document titles
- Disciplines
- Revision codes
- Status (if available)

---

#### C. Technical Report
**File:** `GOO-ISE-GE-RPT-0002-C1_Report (Technical and General Statement).pdf`  
**Location:** `1. SOLAR FARM/3. Reports/`

**Why Include:**
- Contains project-level context
- System descriptions
- Design assumptions
- May contain asset specifications not in BOM
- Tests our PDF text extraction

**What We'll Extract:**
- Project overview
- System capacities
- Design parameters
- Asset specifications (if any)

---

### 2. Substation Documents

#### D. Equipment Lists (MULTIPLE)
**Files:**
- `GOO-YUR-EL-DRW-0530-02_C2 11B4.2 – EQUIPMENT LIST.pdf`
- `GOO-YUR-EL-DRW-0504-02_C1 EA01 66KV FEEDER PROTECTION PANEL PROTECTION +11B2 -EQUIPMENT LIST.pdf`
- `GOO-YUR-EL-DRW-0531-02_C1 REB01 33KV BUS ZONE PROTECTION PANEL +11B4.1 – EQUIPMENT LIST.pdf`
- `GOO-YUR-GE-DRW-0504-02_C1 TX01 6633kV TRANSFORMER 1 PANEL +11B3 - EQUIPMENT LIST.pdf`

**Location:** `2. SUBSTATION/SECONDARY/`

**Why Include:**
- Substation assets not in solar farm BOM
- Different format from BOM (PDF tables)
- Tests our PDF table extraction
- Shows how equipment is organized by panel/system

**Asset Types:**
- Protection relays
- Circuit breakers
- Transformers
- Control equipment
- Metering equipment

---

#### E. Cable Schedules (MULTIPLE)
**Files:**
- `GOO-YUR-EL-DRW-0505-02_C1 110VDC SUPPLIES – CABLE SCHEDULE (W75 TO W139).pdf`
- `GOO-YUR-EL-DRW-0505-03_C1 COMMUNICATIONS – CABLE SCHEDULE (W140 TO W204).pdf`
- `GOO-YUR-EL-DRW-0505-05_C1 33KV FEEDERS, BUS PROTECTION _ ANTI -ISLANDING – CABLE SCHEDULE (W270 TO W334).pdf`
- `GOO-YUR-EG-DRW-0015-C1 SWITCHROOM - CONTROL ROOM AC CABLE SCHEDULE.pdf`

**Location:** `2. SUBSTATION/SECONDARY/` and `2. SUBSTATION/SWITCHROOM/`

**Why Include:**
- Cable details not in BOM
- Shows connectivity (from/to equipment)
- Different cable types (DC, AC, Control, Comms)
- Tests our cable hierarchy taxonomy
- Critical for understanding system topology

**What We'll Extract:**
- Cable IDs
- Cable types
- Conductor sizes
- Voltage ratings
- From/To equipment references
- Cable lengths

---

#### F. Material Lists
**File:** `GOO-YUR-CV-DRW-0024_C2 EARTHING NOTES AND MATERIAL LIST.pdf`  
**Location:** `2. SUBSTATION/CIVIL/`

**Why Include:**
- Civil/earthing assets
- Different format (embedded in drawing)
- Tests our drawing-based extraction
- Shows how materials are specified

---

## POC Processing Order

### Phase 1: Structured Data (Week 1)

**Priority 1: BOM (Excel)**
- Easiest to parse
- Most comprehensive
- Establishes baseline asset list

**Priority 2: Equipment Lists (PDF Tables)**
- Adds substation assets
- Tests PDF table extraction
- Complements BOM

**Priority 3: Cable Schedules (PDF Tables)**
- Adds cable assets
- Tests connectivity extraction
- Shows from/to relationships

### Phase 2: Semi-Structured Data (Week 2)

**Priority 4: Drawing List (PDF)**
- Tests register extraction
- Enables gap analysis
- Validates document metadata

**Priority 5: Technical Report (PDF Text)**
- Tests text extraction
- Validates project context
- May add missing specifications

**Priority 6: Material Lists (PDF Embedded)**
- Tests drawing-based extraction
- Adds civil/earthing assets
- Most complex format

---

## Expected Asset Inventory

### Solar Farm Assets (from BOM + Reports)
- **PV Modules:** ~200,000+ units
- **Inverters:** ~50-100 units
- **Trackers:** ~5,000+ units
- **Combiner Boxes:** ~500+ units
- **MV Transformers:** ~50 units
- **DC Cables:** (from schedules)
- **AC Cables:** (from schedules)

### Substation Assets (from Equipment Lists + Cable Schedules)
- **Transformers:** 2-5 units
- **Circuit Breakers:** 10-20 units
- **Protection Relays:** 20-50 units
- **Control Equipment:** 50-100 units
- **Switchgear:** 5-10 units
- **MV/HV Cables:** 100-200 cables
- **Control Cables:** 200-500 cables
- **Fiber Optic Cables:** 50-100 cables

---

## What We'll Learn

### 1. Data Quality Assessment
- How consistent is data across documents?
- What fields are missing?
- What conflicts exist?

### 2. Extraction Feasibility
- Excel parsing accuracy: ~99%+ (deterministic)
- PDF table extraction accuracy: ~85-95% (needs testing)
- PDF text extraction accuracy: ~70-90% (needs testing)
- Drawing-based extraction: ~60-80% (most complex)

### 3. Asset Taxonomy Validation
- Does our category structure cover all assets?
- Are there asset types we missed?
- How do we handle edge cases?

### 4. Connectivity Modeling
- Can we extract from/to relationships from cable schedules?
- How do we resolve equipment references?
- What confidence scoring is needed?

### 5. ACC Template Validation
- Does our mapping cover all required fields?
- How do we handle hierarchical categories?
- What's the upload process like?

---

## Success Criteria

**Minimal Success:**
- ✅ Extract 80%+ of assets from BOM
- ✅ Generate valid ACC Excel file
- ✅ Manual upload to ACC succeeds
- ✅ Assets appear correctly in ACC

**Good Success:**
- ✅ Extract 90%+ of assets from BOM + Equipment Lists
- ✅ Extract 70%+ of cables from Cable Schedules
- ✅ Reconcile Drawing List with filesystem
- ✅ Generate gap analysis report

**Excellent Success:**
- ✅ Extract 95%+ of assets from all structured sources
- ✅ Extract from/to connectivity from cable schedules
- ✅ Extract project context from Technical Report
- ✅ Identify and flag all data quality issues

---

## Timeline

**Week 1: Core Extraction**
- Day 1-2: BOM parsing (Excel)
- Day 3-4: Equipment Lists (PDF tables)
- Day 5: Cable Schedules (PDF tables)

**Week 2: Context & Validation**
- Day 1-2: Drawing List + Gap Analysis
- Day 3: Technical Report (text extraction)
- Day 4: ACC Excel generation
- Day 5: Manual testing + documentation

---

## Next Steps

1. **Confirm scope:** Does this document set make sense?
2. **Start with BOM:** Build the Excel parser first
3. **Iterate:** Add documents incrementally
4. **Test early:** Generate ACC Excel after each phase
5. **Document learnings:** Track what works and what doesn't

**Ready to start coding?**
