# POC Scope - Final (Based on Real-World Constraints)

**Date:** January 11, 2026  
**Project:** Goonumbla Solar Farm + Substation

---

## Key Finding: Cable Data Fragmentation

**The Problem:**  
Goonumbla demonstrates a critical real-world challenge: **cable information is fragmented across multiple document types**, and individual cable assets (with from/to connectivity) may not exist as structured data.

**What We Found:**

### Solar Farm Cables
- **BOM:** Bulk quantities only ("5000m of 95mm² cable for Block 1")
- **Calculation Reports:** Cable datasheets (specifications, not individual assets)
- **Trench Drawings:** Cable routes (visual, not structured)
- **Schematics:** Connectivity diagrams (visual, not structured)
- **❌ NO dedicated cable schedules with individual cable IDs**

### Substation Cables  
- **✅ Dedicated cable schedules** with:
  - Individual cable IDs (W75, W76, W77...)
  - From/To equipment references
  - Cable types, sizes, lengths
  - Structured tables (extractable)

---

## POC Scope - Revised

### Phase 1: Structured Asset Extraction (Week 1)

**Documents to Process:**

#### 1. Solar Farm BOM (Excel)
**File:** `GOO-ISE-GE-RPT-0003_C1-Bill of Materials (BOM).xlsx`

**Extract:**
- PV Modules (bulk quantity)
- Inverters (individual assets)
- Trackers (individual assets)
- Combiner Boxes / DC Boxes (individual assets)
- MV Transformers (individual assets)
- **Cables:** Bulk quantities only (flag as "not individually tracked")

**Handling Strategy:**
- Create asset entries for equipment
- Create "cable material" entries for bulk cables
- Flag that individual cable assets require cable schedules

---

#### 2. Substation Equipment Lists (PDF Tables)
**Files:**
- `GOO-YUR-EL-DRW-0530-02_C2 11B4.2 – EQUIPMENT LIST.pdf`
- `GOO-YUR-EL-DRW-0504-02_C1 EA01 66KV FEEDER PROTECTION PANEL PROTECTION +11B2 -EQUIPMENT LIST.pdf`
- `GOO-YUR-EL-DRW-0531-02_C1 REB01 33KV BUS ZONE PROTECTION PANEL +11B4.1 – EQUIPMENT LIST.pdf`
- `GOO-YUR-GE-DRW-0504-02_C1 TX01 6633kV TRANSFORMER 1 PANEL +11B3 - EQUIPMENT LIST.pdf`

**Extract:**
- Protection relays
- Circuit breakers
- Transformers
- Control equipment
- Metering equipment

---

#### 3. Substation Cable Schedules (PDF Tables)
**Files:**
- `GOO-YUR-EL-DRW-0505-02_C1 110VDC SUPPLIES – CABLE SCHEDULE (W75 TO W139).pdf`
- `GOO-YUR-EL-DRW-0505-03_C1 COMMUNICATIONS – CABLE SCHEDULE (W140 TO W204).pdf`
- `GOO-YUR-EL-DRW-0505-05_C1 33KV FEEDERS, BUS PROTECTION _ ANTI -ISLANDING – CABLE SCHEDULE (W270 TO W334).pdf`
- `GOO-YUR-EG-DRW-0015-C1 SWITCHROOM - CONTROL ROOM AC CABLE SCHEDULE.pdf`

**Extract:**
- Individual cable assets with IDs
- Cable types, sizes, lengths
- **From/To equipment references** (for connectivity)
- Voltage ratings

---

### Phase 2: Context & Validation (Week 2)

#### 4. Drawing List (PDF)
**File:** `GOO-ISE-GE-DRW-0001-C1_DRAWING LIST (PV PLANT).pdf`

**Extract:**
- Document inventory
- Document metadata
- Enable gap analysis (register vs. filesystem)

---

#### 5. Technical Report (PDF Text)
**File:** `GOO-ISE-GE-RPT-0002-C1_Report (Technical and General Statement).pdf`

**Extract:**
- Project context
- System capacities
- Design parameters

---

### Phase 3: ACC Export & Testing (Week 2)

#### 6. Generate ACC Excel Files

**Two separate exports:**

**A. Asset Register**
- Solar farm equipment (from BOM)
- Substation equipment (from equipment lists)
- Substation cables (from cable schedules)
- **Note:** Solar farm cables flagged as "bulk material" not individual assets

**B. Gap Analysis Report**
- Documents in register vs. filesystem
- Missing documents
- Unexpected documents
- Confidence scores for extracted data

---

## What This POC Will Prove

### ✅ Can Demonstrate

1. **Structured extraction works** for:
   - Excel BOMs (deterministic, 95%+ accuracy)
   - PDF tables (equipment lists, cable schedules)
   
2. **ACC integration** is viable:
   - Can generate valid ACC Excel format
   - Can handle hierarchical categories
   - Can map our data model to ACC structure

3. **Gap analysis** is valuable:
   - Reconcile register vs. filesystem
   - Flag missing/unexpected documents
   - Provide confidence scoring

4. **Connectivity tracking** works:
   - Can extract from/to references from cable schedules
   - Can build network topology (for substation)

### ⚠️ Limitations to Acknowledge

1. **Solar farm cables:**
   - Can only track bulk quantities (no individual assets)
   - Requires cable schedules for full tracking
   - This is a **data availability issue**, not a tool limitation

2. **Visual extraction not included:**
   - Not extracting from drawings/schematics
   - Not extracting from trench layouts
   - These require AI-assisted OCR (future phase)

3. **Single design stage:**
   - Only processing IFC stage
   - Not testing cross-stage change detection
   - That requires multiple stage datasets

---

## Success Criteria

**Minimal Success:**
- ✅ Extract 80%+ of equipment from BOM and equipment lists
- ✅ Extract 70%+ of substation cables from cable schedules
- ✅ Generate valid ACC Excel file
- ✅ Manual upload to ACC succeeds

**Good Success:**
- ✅ Extract 90%+ of equipment
- ✅ Extract 85%+ of cables with from/to connectivity
- ✅ Generate gap analysis report
- ✅ Flag data quality issues (missing schedules, low confidence)

**Excellent Success:**
- ✅ Extract 95%+ of all structured data
- ✅ Successfully resolve 80%+ of equipment references in cable schedules
- ✅ Demonstrate end-to-end workflow from documents to ACC
- ✅ Document lessons learned for full automation

---

## Timeline

**Week 1:**
- Day 1-2: BOM parsing (Excel)
- Day 3: Equipment lists (PDF tables)
- Day 4-5: Cable schedules (PDF tables)

**Week 2:**
- Day 1: Drawing list + gap analysis
- Day 2: Technical report (context extraction)
- Day 3-4: ACC Excel generation
- Day 5: Manual testing + documentation

---

## Next Steps

**Immediate:**
1. Confirm this scope makes sense
2. Start building the BOM parser
3. Test PDF table extraction on one equipment list
4. Validate ACC Excel format

**After POC:**
1. Test with a project that HAS solar farm cable schedules
2. Develop AI-assisted extraction for drawings
3. Implement cross-stage change detection
4. Build full automation pipeline

---

## Key Insight for Data Model

**We need to distinguish:**

1. **Individual Assets:** Tracked with unique IDs, from/to connectivity
   - Inverters, transformers, breakers, etc.
   - Cables (when schedules exist)

2. **Bulk Materials:** Tracked as quantities, not individual items
   - Cables (when only BOM data exists)
   - Modules (when not individually serialized)
   - Conduits, fittings, etc.

**Data Model Addition:**
- Add `asset_tracking_level` field: `INDIVIDUAL` | `BULK`
- Add `data_completeness_flag`: `FULL` | `PARTIAL` | `MISSING_SCHEDULES`

This allows us to be transparent about data limitations and guide users on what additional documents are needed.

---

**Ready to proceed with this scope?**
