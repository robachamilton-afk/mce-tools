# Performance Assessment Tool - Database Schema

## 1. Overview

The database schema for the Performance Assessment Tool extends the core `mce-tools` database with tool-specific tables, all prefixed with `perf_`. These tables are designed to store solar farm information, SCADA data, meteorological data, performance models, and assessment results.

## 2. ERD (Entity-Relationship Diagram)

```
┌──────────────────┐      ┌───────────────────────────┐
│     projects     │      │ perf_performance_models   │
└────────┬─────────┘      └────────────┬──────────────┘
         │                             │
         │                             │
         │                             │
┌────────┴──────────┐      ┌───────────┴───────────┐
│ perf_solar_farms  │      │    perf_assessments     │
└────────┬──────────┘      └───────────┬───────────┘
         │                             │
         │                             │
         │                             │
┌────────┴───────────────┐  ┌──────────┴───────────────┐
│   perf_scada_data      │  │ perf_meteorological_data │
└────────────────────────┘  └──────────────────────────┘
```

## 3. Tool-Specific Tables

### `perf_solar_farms`

Stores information about individual solar farms.

```sql
CREATE TABLE perf_solar_farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    duid VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(10) NOT NULL,
    capacity_mw NUMERIC(10, 2) NOT NULL,
    commissioning_date DATE,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_perf_solar_farms_duid ON perf_solar_farms(duid);
CREATE INDEX idx_perf_solar_farms_project ON perf_solar_farms(project_id);
```

### `perf_scada_data`

Stores time-series SCADA data for each solar farm, downloaded from AEMO NEMWEB.

```sql
CREATE TABLE perf_scada_data (
    id BIGSERIAL PRIMARY KEY,
    solar_farm_id UUID REFERENCES perf_solar_farms(id) NOT NULL,
    settlement_date TIMESTAMP NOT NULL,
    scada_value NUMERIC(12, 4) NOT NULL,
    last_changed TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perf_scada_data_farm_time ON perf_scada_data(solar_farm_id, settlement_date DESC);
SELECT create_hypertable('perf_scada_data', 'settlement_date');
```

**Note:** This table is a good candidate for a time-series extension like TimescaleDB for performance.

### `perf_meteorological_data`

Stores meteorological data for performance assessments.

```sql
CREATE TABLE perf_meteorological_data (
    id BIGSERIAL PRIMARY KEY,
    solar_farm_id UUID REFERENCES perf_solar_farms(id) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    ghi NUMERIC(10, 4),
    poa_irradiance NUMERIC(10, 4),
    ambient_temp NUMERIC(6, 2),
    module_temp NUMERIC(6, 2),
    wind_speed NUMERIC(6, 2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perf_met_data_farm_time ON perf_meteorological_data(solar_farm_id, timestamp DESC);
SELECT create_hypertable('perf_meteorological_data', 'timestamp');
```

### `perf_performance_models`

Stores the parameters for different performance models (contractual or internal).

```sql
CREATE TABLE perf_performance_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'contractual', 'internal'
    description TEXT,
    model_parameters JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

### `perf_assessments`

Stores the results of performance assessments.

```sql
CREATE TABLE perf_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solar_farm_id UUID REFERENCES perf_solar_farms(id) NOT NULL,
    performance_model_id UUID REFERENCES perf_performance_models(id) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    expected_output_mwh NUMERIC(12, 4) NOT NULL,
    actual_output_mwh NUMERIC(12, 4) NOT NULL,
    performance_ratio NUMERIC(5, 4) NOT NULL,
    assessment_details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perf_assessments_farm_model ON perf_assessments(solar_farm_id, performance_model_id);
```
