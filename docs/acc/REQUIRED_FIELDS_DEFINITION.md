# Required Fields Definition

**Date:** January 11, 2026  
**Purpose:** Define required, desirable, and optional fields for each asset type to guide intelligent inference

---

## Principles

**1. ACC Minimum Requirements**
- Name (REQUIRED by ACC)
- Category (REQUIRED by ACC)
- Status (REQUIRED by ACC)

**2. Operational Requirements**
- Fields needed for maintenance tracking
- Fields needed for warranty management
- Fields needed for compliance

**3. Connectivity Requirements**
- Fields needed to link assets together
- Fields needed to build network topology
- Fields needed for system hierarchy

**4. Field Priority Levels**

| Level | Definition | Impact if Missing |
|-------|------------|-------------------|
| **CRITICAL** | ACC rejects import without this field | Cannot upload to ACC |
| **REQUIRED** | Needed for operational tracking | Asset exists but limited functionality |
| **DESIRABLE** | Enhances tracking but not essential | Minor limitation |
| **OPTIONAL** | Nice to have | No impact |

---

## Universal Fields (All Asset Types)

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Any | Unique identifier (e.g., "INV-01", "MV-1/BL-08/BL-07") |
| `category` | **CRITICAL** | BOM/Schedule | Hierarchical (e.g., "Electrical > Inverters > String Inverters") |
| `status` | **CRITICAL** | Inferred | "Specified", "Installed", etc. Default to "Specified" for design stage |
| `description` | DESIRABLE | BOM/Schedule | Human-readable description |
| `location` | DESIRABLE | BOM/Schedule/Drawings | Physical location (e.g., "Block 01", "Substation") |
| `barcode` | OPTIONAL | As-built | Serial number or barcode |
| `system_names` | OPTIONAL | Inferred | Parent systems (e.g., "Block 01 Power System") |

---

## Asset Type: Inverter

**Category:** `Electrical > Inverters > String Inverters`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Schedule | e.g., "INV-01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | BOM | e.g., "Sungrow" |
| `model` | **REQUIRED** | BOM | e.g., "SG3125HV" |
| `rated_power_kw` | **REQUIRED** | BOM | e.g., 3125 |
| `input_voltage_vdc` | DESIRABLE | BOM/Datasheet | e.g., 1500 |
| `output_voltage_vac` | DESIRABLE | BOM/Datasheet | e.g., 800 |
| `location` | DESIRABLE | BOM/Drawings | e.g., "Block 01" |
| `quantity` | DESIRABLE | BOM | Usually 1 for individual assets |

**Data Completeness:**
- **FULL:** All CRITICAL + REQUIRED + most DESIRABLE
- **PARTIAL:** All CRITICAL + REQUIRED, missing DESIRABLE
- **INSUFFICIENT:** Missing REQUIRED fields

---

## Asset Type: Cable

**Category:** Varies by type (e.g., `Cables > AC > MV Feeder Cables`)

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Cable Schedule | e.g., "MV-1/BL-08/BL-07", "W075" |
| `category` | **CRITICAL** | Taxonomy | Based on cable type (MV, DC, Control) |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `cable_type` | **REQUIRED** | Schedule | "MV Feeder", "DC Array", "Control", "Fiber" |
| `conductor_size` | **REQUIRED** | Schedule | e.g., "240mm²", "95mm²" |
| `length_m` | **REQUIRED** | Schedule | e.g., 460 |
| `from_location` | **REQUIRED** | Schedule | e.g., "Block 08", "Panel 11B4.2" |
| `to_location` | **REQUIRED** | Schedule | e.g., "Block 07", "TX01" |
| `from_equipment_id` | DESIRABLE | Resolved | Link to source equipment asset |
| `to_equipment_id` | DESIRABLE | Resolved | Link to destination equipment asset |
| `voltage_rating_kv` | DESIRABLE | Schedule/Datasheet | e.g., 33 |
| `ampacity_a` | DESIRABLE | Schedule/Calculation | e.g., 382 |
| `installation_method` | DESIRABLE | Schedule/Drawings | "Directly Buried", "In Conduit", "Cable Tray" |
| `conductor_material` | OPTIONAL | Datasheet | "Aluminum", "Copper" |
| `insulation_type` | OPTIONAL | Datasheet | "XLPE", "PVC" |

**Data Completeness:**
- **FULL:** All CRITICAL + REQUIRED + from/to equipment IDs + most DESIRABLE
- **PARTIAL:** All CRITICAL + REQUIRED, missing equipment IDs or some DESIRABLE
- **INSUFFICIENT:** Missing REQUIRED fields (cannot create individual cable asset)
- **BULK_ONLY:** Only total length available, no individual cable data

**Special Case: Bulk Cables**
When only BOM data exists:
- Create "Cable Material" entry (not individual asset)
- Track: `cable_type`, `conductor_size`, `total_length_m`
- Flag: `tracking_level = BULK_ONLY`
- Flag: `requires_cable_schedule = TRUE`

---

## Asset Type: Tracker

**Category:** `Solar > Trackers > Single-Axis Trackers`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Schedule | e.g., "TRK-B1-001" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `tracker_type` | **REQUIRED** | BOM | "Single-Axis", "Dual-Axis", "Fixed Tilt" |
| `manufacturer` | **REQUIRED** | BOM | e.g., "Nextracker" |
| `model` | **REQUIRED** | BOM | e.g., "NX Horizon" |
| `module_capacity` | DESIRABLE | BOM | Number of modules per tracker |
| `location` | DESIRABLE | BOM/Drawings | e.g., "Block 01" |
| `tilt_angle_range` | OPTIONAL | Datasheet | e.g., "-60° to +60°" |

---

## Asset Type: PV Module

**Category:** `Solar > PV Modules > Bifacial Modules`

**Note:** Modules are typically tracked in **BULK** unless individually serialized.

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM | e.g., "PV-MODULE-LONGI-LR5-72HIH-550M" |
| `category` | **CRITICAL** | Taxonomy | Based on module type |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | BOM | e.g., "LONGi" |
| `model` | **REQUIRED** | BOM | e.g., "LR5-72HIH-550M" |
| `rated_power_w` | **REQUIRED** | BOM | e.g., 550 |
| `quantity` | **REQUIRED** | BOM | e.g., 250,000 |
| `module_type` | DESIRABLE | BOM | "Bifacial", "Monofacial" |
| `efficiency_pct` | DESIRABLE | Datasheet | e.g., 21.2 |
| `dimensions_mm` | OPTIONAL | Datasheet | e.g., "2256x1133x35" |

**Tracking Level:** Usually `BULK_ONLY` (not individually tracked unless serialized)

---

## Asset Type: Transformer

**Category:** `Electrical > Transformers > Step-Up Transformers`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Equipment List | e.g., "TX01", "MVT-01" |
| `category` | **CRITICAL** | Taxonomy | Based on transformer type |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | BOM/Equipment List | e.g., "ABB" |
| `model` | **REQUIRED** | BOM/Equipment List | e.g., "RESIBLOC" |
| `rated_power_mva` | **REQUIRED** | BOM/Equipment List | e.g., 50 |
| `primary_voltage_kv` | **REQUIRED** | BOM/Equipment List | e.g., 33 |
| `secondary_voltage_kv` | **REQUIRED** | BOM/Equipment List | e.g., 132 |
| `cooling_type` | DESIRABLE | Equipment List | "ONAN", "ONAF" |
| `location` | DESIRABLE | Equipment List/Drawings | e.g., "Substation" |
| `serial_number` | OPTIONAL | As-built | Factory serial number |

---

## Asset Type: Circuit Breaker

**Category:** `Electrical > Switchgear > Circuit Breakers`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "CB-01", "52-TX01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "Schneider Electric" |
| `model` | **REQUIRED** | Equipment List | e.g., "Evolis" |
| `rated_voltage_kv` | **REQUIRED** | Equipment List | e.g., 33 |
| `rated_current_a` | **REQUIRED** | Equipment List | e.g., 1250 |
| `breaking_capacity_ka` | DESIRABLE | Equipment List | e.g., 25 |
| `location` | DESIRABLE | Equipment List | e.g., "33kV Switchboard" |
| `trip_settings` | OPTIONAL | Protection Settings | Overcurrent, earth fault settings |

---

## Asset Type: Protection Relay

**Category:** `Electrical > Protection > Multifunction Relays`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "87T-TX01" (transformer differential) |
| `category` | **CRITICAL** | Taxonomy | Based on protection function |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "SEL", "ABB" |
| `model` | **REQUIRED** | Equipment List | e.g., "SEL-387E" |
| `protection_function` | **REQUIRED** | Equipment List | "Differential", "Overcurrent", "Distance" |
| `location` | DESIRABLE | Equipment List | e.g., "Panel 11B3" |
| `protected_equipment` | DESIRABLE | Resolved | Link to protected asset (e.g., TX01) |
| `settings_file` | OPTIONAL | Protection Settings | Path to settings file |

---

## Asset Type: DC Box / Combiner Box

**Category:** `Electrical > DC Equipment > Combiner Boxes`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Schedule | e.g., "DCB-B1-01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | BOM | e.g., "Sungrow" |
| `model` | **REQUIRED** | BOM | e.g., "SCB1500" |
| `string_inputs` | **REQUIRED** | BOM | Number of string inputs (e.g., 15) |
| `rated_voltage_vdc` | DESIRABLE | BOM | e.g., 1500 |
| `rated_current_a` | DESIRABLE | BOM | e.g., 125 |
| `location` | DESIRABLE | Drawings | e.g., "Block 01, Section 3" |

---

## Inference Rules

### Rule 1: Status Inference

**For design stage documents:**
- Default all assets to `status = "Specified"`
- If document is marked "IFC" → `status = "Specified"` (ready for construction)
- If document is marked "As-Built" → `status = "Installed"`

### Rule 2: Category Inference

**From document context:**
- BOM code starts with "EL.CB.MV" → Category: `Cables > AC > MV Feeder Cables`
- Equipment list title contains "Protection" → Category: `Electrical > Protection > ...`
- File in "DC Calculation" → Assets are DC-related

### Rule 3: Location Inference

**From naming conventions:**
- Asset name contains "B1" or "BL-01" → Location: "Block 01"
- Asset name contains "SS" or "SUB" → Location: "Substation"
- Cable from/to references → Infer location from equipment location

### Rule 4: Equipment Reference Resolution

**For cables:**
1. Parse `from_location` and `to_location` (e.g., "BL-08", "Panel 11B4.2")
2. Search for equipment assets at those locations
3. Match by naming pattern (e.g., "BL-08" → "MVT-08")
4. Assign confidence score based on match quality
5. If confidence < 95% → Flag for manual review

---

## Data Completeness Decision Matrix

### For Individual Equipment Assets (Inverters, Transformers, Breakers)

| Condition | Completeness | Action |
|-----------|--------------|--------|
| All CRITICAL + REQUIRED + most DESIRABLE | **FULL** | ✅ Create asset, upload to ACC |
| All CRITICAL + REQUIRED, missing DESIRABLE | **PARTIAL** | ✅ Create asset, flag missing fields |
| Missing REQUIRED fields | **INSUFFICIENT** | ❌ Do not create asset, flag error |
| Missing CRITICAL fields | **INVALID** | ❌ Cannot process, flag error |

### For Cables

| Condition | Completeness | Action |
|-----------|--------------|--------|
| Has individual cable ID + from/to + size + length | **FULL** | ✅ Create individual cable asset |
| Has individual cable ID + size + length, missing from/to | **PARTIAL** | ✅ Create asset, cannot link to equipment |
| Has cable type + size, only total length | **BULK_ONLY** | ⚠️ Create bulk material entry, search for schedules |
| Only cable type, no quantities | **INSUFFICIENT** | ❌ Flag error, cannot create asset |

### For Bulk Materials (PV Modules, Conduits, Fittings)

| Condition | Completeness | Action |
|-----------|--------------|--------|
| Has type + specs + quantity | **BULK_FULL** | ✅ Create bulk material entry |
| Has type + quantity, missing specs | **BULK_PARTIAL** | ✅ Create entry, flag missing specs |
| Only type, no quantity | **INSUFFICIENT** | ❌ Cannot create entry |

---

## Validation Checklist

**Before uploading to ACC, validate:**

1. ✅ All assets have `name`, `category`, `status` (CRITICAL fields)
2. ✅ All equipment assets have manufacturer + model (REQUIRED)
3. ✅ All cable assets have size + length + from/to (REQUIRED)
4. ✅ Categories match ACC taxonomy (hierarchical with ">")
5. ✅ Status values match ACC status sets
6. ✅ No duplicate asset names
7. ✅ Equipment references in cables are resolvable (or flagged)

**Generate warnings for:**
- ⚠️ Assets missing DESIRABLE fields (>20% missing)
- ⚠️ Cables with unresolved equipment references (>10%)
- ⚠️ Bulk materials that should be individually tracked

---

## Next Steps

1. **Implement field validation** in extraction engine
2. **Create completeness scoring** algorithm
3. **Build reference resolution** engine
4. **Test with Goonumbla** to validate rules
5. **Refine based on real data** patterns

**Ready to implement these rules in the POC?**


---

## Additional Solar Farm Equipment

### Asset Type: BESS (Battery Energy Storage System)

**Category:** `BESS > Battery Racks > Lithium-Ion`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Equipment List | e.g., "BESS-01", "RACK-01-01" |
| `category` | **CRITICAL** | Taxonomy | Based on battery type |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | BOM | e.g., "Tesla", "BYD", "Sungrow" |
| `model` | **REQUIRED** | BOM | e.g., "Megapack 2XL" |
| `capacity_mwh` | **REQUIRED** | BOM | e.g., 3.9 |
| `power_rating_mw` | **REQUIRED** | BOM | e.g., 1.5 |
| `voltage_vdc` | DESIRABLE | BOM/Datasheet | e.g., 1500 |
| `chemistry` | DESIRABLE | BOM | "Lithium-Ion", "LFP", "NMC" |
| `location` | DESIRABLE | Drawings | e.g., "BESS Container 01" |
| `cycle_life` | OPTIONAL | Datasheet | e.g., 10000 cycles |

---

### Asset Type: Meteorological Station

**Category:** `Monitoring > Met Stations > Weather Stations`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Schedule | e.g., "MET-01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | BOM | e.g., "Vaisala", "Campbell Scientific" |
| `model` | **REQUIRED** | BOM | e.g., "WXT536" |
| `sensors` | DESIRABLE | BOM | "Irradiance, Temperature, Wind, Humidity" |
| `location` | DESIRABLE | Drawings | e.g., "Central Met Station" |
| `mounting_height_m` | OPTIONAL | Drawings | e.g., 2.0 |

---

### Asset Type: SCADA System

**Category:** `SCADA > Control Systems > Main SCADA`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "SCADA-MAIN" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "Schneider Electric", "Siemens" |
| `model` | **REQUIRED** | Equipment List | e.g., "ClearSCADA" |
| `software_version` | DESIRABLE | Equipment List | e.g., "2023 R2" |
| `location` | DESIRABLE | Equipment List | e.g., "Control Room" |
| `redundancy` | OPTIONAL | Equipment List | "Hot Standby", "N+1" |

---

### Asset Type: Communication Equipment

**Category:** `Communications > Network Equipment > Fiber Switches`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "SW-01", "FIBER-SWITCH-01" |
| `category` | **CRITICAL** | Taxonomy | Based on equipment type |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "Cisco", "Hirschmann" |
| `model` | **REQUIRED** | Equipment List | e.g., "IE-5000" |
| `port_count` | DESIRABLE | Equipment List | e.g., 24 |
| `port_type` | DESIRABLE | Equipment List | "Fiber", "Copper", "SFP" |
| `location` | DESIRABLE | Equipment List | e.g., "Comms Room" |

---

### Asset Type: Security Equipment

**Category:** `Security > Access Control > Card Readers`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Schedule | e.g., "ACR-GATE-01" |
| `category` | **CRITICAL** | Taxonomy | Based on security type |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | BOM | e.g., "Gallagher", "HID" |
| `model` | **REQUIRED** | BOM | e.g., "T20" |
| `access_type` | DESIRABLE | BOM | "Card Reader", "Biometric", "Keypad" |
| `location` | DESIRABLE | Drawings | e.g., "Main Gate" |

---

## Additional Substation Equipment

### Asset Type: Voltage Transformer (VT/PT)

**Category:** `Electrical > Instrument Transformers > Voltage Transformers`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "VT-01", "59-TX01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "ABB", "Schneider" |
| `model` | **REQUIRED** | Equipment List | e.g., "IOG 72.5" |
| `primary_voltage_kv` | **REQUIRED** | Equipment List | e.g., 66 |
| `secondary_voltage_v` | **REQUIRED** | Equipment List | e.g., 110 |
| `accuracy_class` | DESIRABLE | Equipment List | e.g., "0.2" |
| `location` | DESIRABLE | Equipment List | e.g., "66kV Bay 1" |

---

### Asset Type: Current Transformer (CT)

**Category:** `Electrical > Instrument Transformers > Current Transformers`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "CT-01", "50-TX01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "ABB", "Arteche" |
| `model` | **REQUIRED** | Equipment List | e.g., "TYP RKU" |
| `primary_current_a` | **REQUIRED** | Equipment List | e.g., 1200 |
| `secondary_current_a` | **REQUIRED** | Equipment List | e.g., 1 or 5 |
| `accuracy_class` | DESIRABLE | Equipment List | e.g., "5P20" |
| `location` | DESIRABLE | Equipment List | e.g., "TX01 HV Side" |

---

### Asset Type: Disconnector / Isolator

**Category:** `Electrical > Switchgear > Disconnectors`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "DS-01", "89-TX01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "ABB", "Siemens" |
| `model` | **REQUIRED** | Equipment List | e.g., "DSLF" |
| `rated_voltage_kv` | **REQUIRED** | Equipment List | e.g., 132 |
| `rated_current_a` | **REQUIRED** | Equipment List | e.g., 2000 |
| `operation_type` | DESIRABLE | Equipment List | "Manual", "Motorized" |
| `location` | DESIRABLE | Equipment List | e.g., "132kV Feeder Bay" |

---

### Asset Type: Surge Arrester

**Category:** `Electrical > Protection > Surge Arresters`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "SA-01", "LA-TX01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "ABB", "Siemens" |
| `model` | **REQUIRED** | Equipment List | e.g., "PEXLIM Q" |
| `rated_voltage_kv` | **REQUIRED** | Equipment List | e.g., 132 |
| `mcov_kv` | DESIRABLE | Equipment List | Maximum continuous operating voltage |
| `location` | DESIRABLE | Equipment List | e.g., "TX01 HV Terminal" |

---

### Asset Type: Control Panel / Switchboard

**Category:** `Electrical > Control Panels > Protection Panels`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "PANEL-11B4.2", "TX01-PROT-PANEL" |
| `category` | **CRITICAL** | Taxonomy | Based on panel function |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "Schneider", "Custom Built" |
| `model` | DESIRABLE | Equipment List | May be custom |
| `panel_function` | **REQUIRED** | Equipment List | "Protection", "Control", "Metering", "DC Supply" |
| `voltage_rating_v` | DESIRABLE | Equipment List | e.g., 110 (DC), 240 (AC) |
| `location` | DESIRABLE | Equipment List | e.g., "Control Room" |
| `contains_equipment` | DESIRABLE | Resolved | List of relays/devices in panel |

---

### Asset Type: Battery Charger (DC Supply)

**Category:** `Electrical > DC Systems > Battery Chargers`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "BC-01", "CHARGER-110VDC" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | **REQUIRED** | Equipment List | e.g., "Enersys", "Chloride" |
| `model` | **REQUIRED** | Equipment List | e.g., "NXr+" |
| `output_voltage_vdc` | **REQUIRED** | Equipment List | e.g., 110 |
| `output_current_a` | **REQUIRED** | Equipment List | e.g., 50 |
| `battery_capacity_ah` | DESIRABLE | Equipment List | e.g., 200 |
| `location` | DESIRABLE | Equipment List | e.g., "DC Supply Room" |

---

### Asset Type: Control & Relay Panel (CRP)

**Category:** `Electrical > Control Panels > Control & Relay Panels`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Equipment List | e.g., "CRP-01", "11B3" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `manufacturer` | DESIRABLE | Equipment List | Often custom built |
| `protected_equipment` | **REQUIRED** | Equipment List/Resolved | e.g., "TX01" |
| `protection_functions` | **REQUIRED** | Equipment List | "Differential, Overcurrent, REF" |
| `location` | DESIRABLE | Equipment List | e.g., "Control Building" |
| `contains_relays` | DESIRABLE | Resolved | List of relay IDs |

---

## Civil & Structural Assets

### Asset Type: Foundation

**Category:** `Civil > Foundations > Concrete Foundations`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM/Drawings | e.g., "FND-INV-01", "TRACKER-FND-B1-001" |
| `category` | **CRITICAL** | Taxonomy | Based on foundation type |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `foundation_type` | **REQUIRED** | BOM/Drawings | "Concrete Pad", "Pile", "Screw Pile" |
| `supports_equipment` | **REQUIRED** | Resolved | Link to equipment (e.g., INV-01) |
| `dimensions` | DESIRABLE | Drawings | e.g., "2.0m x 2.0m x 0.5m" |
| `concrete_grade` | DESIRABLE | Specification | e.g., "N32" |
| `location` | DESIRABLE | Drawings | e.g., "Block 01" |

---

### Asset Type: Fence / Perimeter Security

**Category:** `Civil > Security Infrastructure > Perimeter Fence`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | BOM | e.g., "FENCE-PERIMETER" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `fence_type` | **REQUIRED** | BOM | "Chain Link", "Palisade", "Welded Mesh" |
| `height_m` | **REQUIRED** | BOM | e.g., 2.1 |
| `total_length_m` | **REQUIRED** | BOM | e.g., 10337.6 |
| `barbed_wire` | DESIRABLE | BOM | "Yes" or "No" |
| `location` | DESIRABLE | Drawings | "Site Perimeter" |

**Tracking Level:** Usually `BULK` (tracked by total length, not individual sections)

---

### Asset Type: Access Road

**Category:** `Civil > Roads > Internal Access Roads`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Drawings | e.g., "ROAD-MAIN", "ACCESS-B1" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `road_type` | **REQUIRED** | Specification | "Gravel", "Sealed", "Compacted Earth" |
| `width_m` | **REQUIRED** | Drawings | e.g., 6.0 |
| `length_m` | **REQUIRED** | Drawings | e.g., 1500 |
| `surface_material` | DESIRABLE | Specification | "Crushed Rock", "Asphalt" |
| `location` | DESIRABLE | Drawings | "Main Access Road" |

**Tracking Level:** Usually `BULK` or by named sections

---

### Asset Type: Drainage System

**Category:** `Civil > Drainage > Stormwater Drainage`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Drawings | e.g., "DRAIN-BASIN-01", "CULVERT-01" |
| `category` | **CRITICAL** | Taxonomy | Based on drainage type |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `drainage_type` | **REQUIRED** | Drawings | "Basin", "Ditch", "Culvert", "Pipe" |
| `capacity_m3` | DESIRABLE | Drawings | For basins |
| `diameter_mm` | DESIRABLE | Drawings | For pipes/culverts |
| `length_m` | DESIRABLE | Drawings | For ditches/pipes |
| `location` | DESIRABLE | Drawings | e.g., "Block 01 North" |

---

## Earthing / Grounding Assets

### Asset Type: Earthing Grid

**Category:** `Electrical > Earthing > Earth Grids`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Drawings | e.g., "EARTH-GRID-SS", "EARTH-GRID-B1" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `grid_type` | **REQUIRED** | Drawings | "Substation Grid", "Equipment Grid", "Perimeter Grid" |
| `conductor_size_mm2` | **REQUIRED** | Specification | e.g., 95 |
| `conductor_material` | **REQUIRED** | Specification | "Copper", "Galvanized Steel" |
| `grid_resistance_ohm` | DESIRABLE | Calculation | e.g., 0.5 |
| `location` | DESIRABLE | Drawings | e.g., "Substation" |

**Tracking Level:** Usually individual grids, not individual conductors

---

### Asset Type: Earth Electrode / Rod

**Category:** `Electrical > Earthing > Earth Electrodes`

| Field | Priority | Source | Notes |
|-------|----------|--------|-------|
| `name` | **CRITICAL** | Drawings | e.g., "EARTH-ROD-01" |
| `category` | **CRITICAL** | Taxonomy | Fixed category |
| `status` | **CRITICAL** | Inferred | Default "Specified" |
| `electrode_type` | **REQUIRED** | Specification | "Driven Rod", "Plate", "Chemical" |
| `length_m` | **REQUIRED** | Specification | e.g., 3.0 |
| `diameter_mm` | DESIRABLE | Specification | e.g., 16 |
| `material` | DESIRABLE | Specification | "Copper-Clad Steel" |
| `location` | DESIRABLE | Drawings | e.g., "Substation Corner" |

**Tracking Level:** Can be individual or bulk depending on project

---

## Summary: Asset Type Coverage

### Solar Farm Assets
- ✅ Inverters
- ✅ Trackers
- ✅ PV Modules (bulk)
- ✅ DC Boxes / Combiner Boxes
- ✅ BESS
- ✅ Met Stations
- ✅ Cables (MV, DC, AC)

### Substation Assets
- ✅ Transformers
- ✅ Circuit Breakers
- ✅ Disconnectors
- ✅ Voltage Transformers
- ✅ Current Transformers
- ✅ Protection Relays
- ✅ Control Panels
- ✅ Surge Arresters
- ✅ Battery Chargers
- ✅ Cables (Control, Communication, Power)

### SCADA & Communications
- ✅ SCADA Systems
- ✅ Network Equipment
- ✅ Communication Cables

### Security
- ✅ Access Control
- ✅ CCTV
- ✅ Perimeter Security

### Civil & Structural
- ✅ Foundations
- ✅ Fences
- ✅ Roads
- ✅ Drainage

### Earthing
- ✅ Earth Grids
- ✅ Earth Electrodes
- ✅ Earthing Cables

---

**This should cover the majority of assets we'll encounter. Are there any other equipment types I'm missing?**
