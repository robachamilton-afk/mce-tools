# IEC 61724-Compliant Model - Database Schema

**Author:** Manus AI  
**Date:** January 12, 2026

## Overview

This document defines the database schema for the IEC 61724-compliant internal performance model. The schema is designed to store the detailed technical specifications of each solar farm, including parameters that are explicitly provided (for engaged projects) and those that are inferred (for scraped projects). It also includes tables for storing the results of the performance assessments.

## Table Definitions

### `solar_farms`

Stores the core information and technical specifications for each solar farm.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the solar farm. |
| `duid` | `VARCHAR(10)` | `NOT NULL, UNIQUE` | The AEMO Dispatchable Unit Identifier. |
| `name` | `VARCHAR(255)` | `NOT NULL` | The common name of the solar farm. |
| `registered_capacity_kw` | `FLOAT` | `NOT NULL` | The AC capacity registered with AEMO. |
| `dc_capacity_kw` | `FLOAT` | | The total DC nameplate capacity of the PV modules. |
| `latitude` | `FLOAT` | `NOT NULL` | The geographical latitude of the site. |
| `longitude` | `FLOAT` | `NOT NULL` | The geographical longitude of the site. |
| `commissioning_date` | `DATE` | | The date the farm was officially commissioned. |
| `status` | `VARCHAR(50)` | | The operational status (e.g., `OPERATING`, `UNDER_CONSTRUCTION`). |
| `is_inferred` | `BOOLEAN` | `DEFAULT FALSE` | A flag to indicate if the parameters for this farm were inferred. |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of when the record was created. |
| `updated_at` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of when the record was last updated. |

### `pv_module_specs`

Stores the specifications for the PV modules used at a solar farm.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the module specification. |
| `solar_farm_id` | `INTEGER` | `FOREIGN KEY (solar_farms.id)` | Links to the associated solar farm. |
| `manufacturer` | `VARCHAR(255)` | | The name of the module manufacturer. |
| `model` | `VARCHAR(255)` | | The model number of the PV module. |
| `technology` | `VARCHAR(50)` | | The cell technology (e.g., `mono-Si`, `poly-Si`, `CdTe`). |
| `power_stc_w` | `FLOAT` | | The module power at Standard Test Conditions (STC). |
| `temp_coeff_power` | `FLOAT` | | The temperature coefficient of power (%/°C). |
| `is_inferred` | `BOOLEAN` | `DEFAULT FALSE` | Flag to indicate if these specs were inferred. |

### `inverter_specs`

Stores the specifications for the inverters used at a solar farm.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the inverter specification. |
| `solar_farm_id` | `INTEGER` | `FOREIGN KEY (solar_farms.id)` | Links to the associated solar farm. |
| `manufacturer` | `VARCHAR(255)` | | The name of the inverter manufacturer. |
| `model` | `VARCHAR(255)` | | The model number of the inverter. |
| `efficiency` | `FLOAT` | | The weighted or peak efficiency of the inverter. |
| `is_inferred` | `BOOLEAN` | `DEFAULT FALSE` | Flag to indicate if these specs were inferred. |

### `array_specs`

Stores the physical layout and orientation of the PV array.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the array specification. |
| `solar_farm_id` | `INTEGER` | `FOREIGN KEY (solar_farms.id)` | Links to the associated solar farm. |
| `tilt_angle` | `FLOAT` | | The tilt angle of the PV modules from horizontal (degrees). |
| `azimuth_angle` | `FLOAT` | | The azimuth angle of the PV modules (degrees from North). |
| `tracker_type` | `VARCHAR(50)` | | The type of tracking system (e.g., `FIXED`, `SINGLE_AXIS`, `DUAL_AXIS`). |
| `is_inferred` | `BOOLEAN` | `DEFAULT FALSE` | Flag to indicate if these specs were inferred. |

### `performance_assessment_results`

Stores the calculated performance metrics from the IEC 61724 engine.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Unique identifier for the result record. |
| `solar_farm_id` | `INTEGER` | `FOREIGN KEY (solar_farms.id)` | Links to the assessed solar farm. |
| `timestamp` | `TIMESTAMP` | `NOT NULL` | The timestamp for the aggregation period (e.g., start of the hour or day). |
| `period` | `VARCHAR(20)` | `NOT NULL` | The aggregation period (`HOURLY`, `DAILY`, `MONTHLY`). |
| `performance_ratio` | `FLOAT` | | The calculated Performance Ratio (PR) for the period. |
| `temp_corrected_pr` | `FLOAT` | | The temperature-corrected Performance Ratio. |
| `final_yield` | `FLOAT` | | The final system yield (Yf). |
| `reference_yield` | `FLOAT` | | The reference yield (Yr). |
| `array_yield` | `FLOAT` | | The PV array energy yield (Ya). |
| `array_capture_loss` | `FLOAT` | | The array capture loss (Lc). |
| `system_loss` | `FLOAT` | | The balance of system loss (Ls). |
| `data_completeness` | `FLOAT` | | The percentage of valid data points during the period. |

This schema provides a flexible foundation for storing both detailed and inferred parameters, allowing the system to cater to both engaged and scraped project assessments while maintaining compliance with the IEC 61724 standard.
