# Contract-Based Performance Model - Database Schema

**Author:** Manus AI  
**Date:** January 12, 2026

## Overview

This document defines the database schema for the contract-based performance model. The schema is designed to store the parsed contract information, the performance model parameters, and the results of the compliance assessments. It is intended to be used with a relational database like PostgreSQL.

## Table Definitions

### `contracts`

Stores information about each performance contract.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the contract. |
| `name` | `VARCHAR(255)` | `NOT NULL` | A human-readable name for the contract (e.g., "Royalla Solar Farm PPA"). |
| `project_duid` | `VARCHAR(10)` | `NOT NULL` | The DUID of the associated solar farm. |
| `pdf_file_path` | `VARCHAR(512)` | | The path to the original PDF contract file in the file store. |
| `raw_text` | `TEXT` | | The full raw text extracted from the PDF. |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of when the record was created. |
| `updated_at` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of when the record was last updated. |

### `performance_models`

Stores the structured performance model extracted from a contract.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the performance model. |
| `contract_id` | `INTEGER` | `FOREIGN KEY (contracts.id)` | Links to the associated contract. |
| `model_json` | `JSONB` | `NOT NULL` | A JSON object containing the full structured performance model, including equations, parameters, and data source specifications. |
| `version` | `INTEGER` | `NOT NULL, DEFAULT 1` | Version number for the model, in case the contract is amended. |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of when the record was created. |

**Example `model_json` structure:**

```json
{
  "equations": {
    "expected_power_kw": "(G_poa * Area) * (1 - (T_mod - 25) * Temp_Coeff)",
    "performance_ratio": "(Actual_Energy_kWh / (SUM(Expected_Power_kW) * Interval_hours)) * 100"
  },
  "parameters": {
    "Area": {
      "value": 50000,
      "unit": "m^2"
    },
    "Temp_Coeff": {
      "value": 0.004,
      "unit": "/°C"
    }
  },
  "data_sources": {
    "G_poa": "on_site_pyranometer_ghi",
    "T_mod": "on_site_module_temp_sensor"
  },
  "compliance_criteria": {
    "performance_ratio": {
      "operator": ">=",
      "value": 85,
      "period": "monthly"
    }
  }
}
```

### `compliance_assessments`

Stores the results of each performance assessment run.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the assessment. |
| `performance_model_id` | `INTEGER` | `FOREIGN KEY (performance_models.id)` | Links to the performance model used for the assessment. |
| `assessment_period_start` | `TIMESTAMP` | `NOT NULL` | The start of the period being assessed. |
| `assessment_period_end` | `TIMESTAMP` | `NOT NULL` | The end of the period being assessed. |
| `status` | `VARCHAR(50)` | `NOT NULL` | The status of the assessment (e.g., `RUNNING`, `COMPLETED`, `FAILED`). |
| `compliance_status` | `VARCHAR(50)` | | The final compliance outcome (e.g., `PASS`, `FAIL`, `INDETERMINATE`). |
| `results_json` | `JSONB` | | A JSON object containing the detailed results, including calculated PR, expected vs. actual energy, etc. |
| `report_file_path` | `VARCHAR(512)` | | The path to the generated PDF report. |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of when the assessment was initiated. |

## Time-Series Data

Time-series data (meteorological and performance) will be stored in a dedicated time-series database like **InfluxDB** or **TimescaleDB** (a PostgreSQL extension). This is more efficient for handling the large volumes of high-frequency data required for these assessments.

The schema for the time-series data would look something like this:

**Measurement:** `site_data`

**Tags:**
- `duid` (e.g., `ROYALLA1`)
- `source` (e.g., `on_site_pyranometer`, `scada_meter`)

**Fields:**
- `G_poa` (float)
- `T_mod` (float)
- `P_ac` (float)
- `Wind_Speed` (float)
- ... (other relevant measurements)

**Timestamp:** The time of the measurement.
