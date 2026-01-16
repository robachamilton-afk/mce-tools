# Performance Assessment Tool - Architecture

## 1. Overview

The Performance Assessment Tool is a new service within the MCE Tools suite, designed to ingest, analyze, and report on the performance of solar farms in the National Electricity Market (NEM). It provides three core functionalities:

1.  **Contract Compliance:** Assess asset performance against contractual schedules using client-provided meteorological and performance data.
2.  **Internal Modeling:** Evaluate asset performance against MCE's proprietary performance models.
3.  **AEMO SCADA Monitoring:** Continuously monitor public AEMO data to identify underperforming assets, calculate curtailment, and provide market-wide performance dashboards.

This document outlines the technical architecture for the tool, which will be integrated into the existing `mce-tools` monorepo.

## 2. System Architecture

The architecture follows the established microservices pattern of the MCE Tools suite, comprising a frontend, a backend API, an asynchronous task layer, and a data storage layer.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Frontend (React + TypeScript)                      │
│  ┌─────────────────────────┬─────────────────────────┬──────────────────┐ │
│  │   Compliance Dashboard  │   Internal Model Dashboard  │  AEMO Dashboard  │ │
│  └─────────────────────────┴─────────────────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTPS/JWT
┌─────────────────────────────────────────────────────────────────────────┐
│                  Backend API (FastAPI + Python)                         │
│  ┌─────────────────────────┬─────────────────────────┬──────────────────┐ │
│  │  Compliance Endpoints   │  Internal Model Endpoints   │   AEMO Endpoints   │ │
│  └─────────────────────────┴─────────────────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  Asynchronous Task Layer (Celery + Redis)                 │
│  ┌─────────────────────────┬─────────────────────────┬──────────────────┐ │
│  │   SCADA/Dispatch Scraper│  Performance Model Engine   │  Report Generator  │ │
│  └─────────────────────────┴─────────────────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 Data Layer (PostgreSQL + TimescaleDB)                   │
│  ┌──────────────────┬───────────────────┬──────────────────┬───────────┐ │
│  │ perf_solar_farms │ perf_scada_data   │ perf_dispatch_data │ perf_assessments │ │
│  └──────────────────┴───────────────────┴──────────────────┴───────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Data Ingestion and Workflow

The core of the AEMO monitoring functionality is a set of scheduled tasks that scrape data from the NEMWEB portal.

1.  **5-Minute SCADA Scraper:**
    *   **Schedule:** Runs every 5 minutes.
    *   **Source:** `https://www.nemweb.com.au/REPORTS/CURRENT/Dispatch_SCADA/`
    *   **Action:** Downloads the latest `PUBLIC_DISPATCHSCADA_*.zip` file.
    *   **Processing:** Parses the CSV to extract `SCADAVALUE` for all registered solar farm DUIDs.
    *   **Storage:** Inserts the data into the `perf_scada_data` table.

2.  **Daily Aggregated Dispatch Scraper:**
    *   **Schedule:** Runs once daily, shortly after 04:00 AEST.
    *   **Source:** `https://www.nemweb.com.au/REPORTS/CURRENT/Daily_Reports/`
    *   **Action:** Downloads the `PUBLIC_DAILY_*.zip` file for the previous day.
    *   **Processing:** Parses the large CSV to extract the `DUNIT` table records. For each solar farm DUID, it extracts the `TOTALCLEARED` (Dispatch Target) and `AVAILABILITY` for every 5-minute interval of the previous day.
    *   **Storage:** Inserts the data into the `perf_dispatch_data` table.

### 4. Curtailment and Performance Analysis

Once the data is ingested, the analysis engine can perform the key calculations.

*   **Curtailment Calculation:** For any given 5-minute interval, curtailment is calculated by joining the `perf_scada_data` and `perf_dispatch_data` tables on `solar_farm_id` and `timestamp`.

    > **Curtailment (MW) = `dispatch_target_mw` - `scada_value_mw`**

*   **Performance Ratio (PR) Calculation:** This requires meteorological data, which will be uploaded for specific assessments. The performance engine will compare the actual output (`scada_value_mw`) against the expected output derived from the performance model and meteorological inputs.

### 5. API and Frontend

The backend API will provide endpoints to serve both the raw time-series data and the processed analytical results. The frontend will consume these endpoints to render the dashboards, allowing users to visualize performance, track curtailment, and identify underperforming assets.
