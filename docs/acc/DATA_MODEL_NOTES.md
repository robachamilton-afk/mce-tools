# ACC Data Scraping Tool - Data Model Design Notes

**Status:** Awaiting design documentation upload  
**Date:** January 11, 2026  
**Project:** MCE Documentation (BnpyJvByfmuhifJcX4FUgd)

## Context

Building a deterministic, auditable pipeline to:
1. Ingest heterogeneous engineering design documents (PDF, XLSX, etc.)
2. Extract structured technical information
3. Create a clean canonical data model
4. Instantiate that model in Autodesk Construction Cloud (ACC)

## Initial Requirements

### Scope
- **Phase 1 Focus:** Data model design + document scraping for design packages
- **Use Cases:** Solar farms, BESS, wind, substations (starting with solar + substation)
- **Quality/ITP workflows:** Deferred to later phases

### Key Constraints
- Must be deterministic and explainable
- AI assists extraction, not final authority (95%+ confidence threshold)
- No assumption of consistent document formatting
- Optimized for repeatability, not bespoke solutions

### ACC Integration Approach
- Initially: Manual upload via configuration files
- Later: Full API integration for automated creation/updates

## ACC Asset Import Template Analysis

From `SampleAssetDataImport.xlsx`:

### Assets Sheet Structure
- **Name** (Required): Unique asset identifier
- **Category** (Required): Hierarchical with ">" separator (e.g., "Mechanical > Air Handling Units (AHU's)")
- **Description** (Optional): Free text
- **Location** (Optional): Hierarchical with ">" separator
- **Status** (Required): Must match project status set (e.g., Installed, Functional Performance Tests)
- **Barcode** (Optional): Asset tracking code
- **System Names** (Optional): Pipe-delimited list (e.g., "HWS | CWS")

### Systems Sheet Structure
- **System name** (Required): Unique system identifier
- **System category** (Required): Hierarchical with ">" separator
- **Status** (Required): Must match project status set
- **Sub-systems** (Optional): Pipe-delimited list of child systems

### Key Observations
1. **Hierarchical Categories:** Both assets and systems support multi-level hierarchies
2. **Relationships:** Assets can belong to multiple systems (many-to-many)
3. **Systems Can Nest:** Systems can contain sub-systems
4. **Status Sets:** Must be pre-configured in ACC before import
5. **Flexibility:** Template is generic—we define the taxonomy

## Energy Infrastructure Taxonomy (Draft)

### Solar Farm Categories
```
Solar
Solar > PV Modules
Solar > PV Modules > Monocrystalline
Solar > PV Modules > Bifacial
Solar > Inverters
Solar > Inverters > String Inverters
Solar > Inverters > Central Inverters
Solar > Trackers
Solar > Trackers > Single-Axis
Solar > Trackers > Fixed Tilt
Solar > Combiner Boxes
Solar > Monitoring Equipment
```

### BESS Categories
```
BESS
BESS > Battery Racks
BESS > Battery Racks > Lithium-Ion
BESS > Battery Racks > Flow Battery
BESS > Power Conversion Systems
BESS > Energy Management Systems
BESS > Cooling Systems
```

### Electrical/Substation Categories
```
Electrical
Electrical > Transformers
Electrical > Transformers > Step-Up Transformers
Electrical > Transformers > Distribution Transformers
Electrical > Switchgear
Electrical > Switchgear > Medium Voltage
Electrical > Switchgear > High Voltage
Electrical > Protection Relays
Electrical > Circuit Breakers
Electrical > Cables
Electrical > Cables > MV Cables
Electrical > Cables > LV Cables
```

### Wind Categories
```
Wind
Wind > Turbines
Wind > Turbines > Onshore
Wind > Turbines > Offshore
Wind > Nacelles
Wind > Blades
Wind > Towers
Wind > Foundations
```

### Balance of Plant (BoP)
```
Balance of Plant
Balance of Plant > Access Roads
Balance of Plant > Fencing
Balance of Plant > Foundations
Balance of Plant > SCADA Systems
Balance of Plant > Weather Stations
```

## Next Steps

1. **Download & Analyze Documentation:**
   - Clare solar farm design package
   - Goonumbla solar farm design package
   - Understand typical document types, naming conventions, metadata patterns

2. **Define Canonical Data Model (Artefact A):**
   - Assets schema
   - Documents schema
   - Issues schema (for design reviews)
   - Quality artefacts schema (ITPs/ITRs - future)

3. **Design Ingestion Pipeline (Artefact B):**
   - Document acquisition
   - Metadata extraction (deterministic + AI)
   - Entity resolution
   - Confidence scoring
   - ACC object creation

4. **Document Supporting Artefacts (C-G):**
   - Asset register creation logic
   - Design review → ACC Issues mapping
   - ITP/ITR assignment strategy
   - Failure modes & risk controls
   - Phased development roadmap

## Questions to Resolve

- [ ] What document types are most common? (PDFs, XLSX schedules, DWGs?)
- [ ] How are assets typically named in drawings vs. schedules?
- [ ] What metadata is consistently available vs. inconsistent?
- [ ] What relationships exist between documents and assets?
- [ ] Are there standard naming conventions (e.g., GOO-ISE-GE-DRW-0001)?
- [ ] How do design review registers typically look?

## References

- acc-tools repository: `/home/ubuntu/acc-tools`
- Architecture docs: `/home/ubuntu/acc-tools/docs/ARCHITECTURE.md`
- ACC Integration: `/home/ubuntu/acc-tools/docs/ACC_INTEGRATION.md`
- Brand guide: `/home/ubuntu/acc-tools/docs/BRAND_STYLE_GUIDE.md`
- ACC template: `/home/ubuntu/upload/SampleAssetDataImport.xlsx`
