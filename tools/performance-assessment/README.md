# Solar Farm Performance Assessment Tool

**Status:** 🔨 In Development  
**Use Case:** Internal consulting support & business development

## 1. Overview

The Performance Assessment Tool is an internal application within the MCE Tools suite designed to analyze, monitor, and report on the performance of solar farms in the Australian National Electricity Market (NEM).

This tool provides a comprehensive suite of services for assessing the performance of solar farms. It is designed to be a core component of the `mce-tools` ecosystem and supports two primary performance assessment methodologies:

1.  **Contract-Based Assessment:** Automatically parses performance contracts (PDFs) and assesses compliance against the specific equations, data sources, and criteria defined within them.
2.  **IEC 61724-Compliant Internal Assessment:** Calculates a full range of industry-standard performance metrics (Performance Ratio, Yields, Losses) based on the IEC 61724-1:2021 standard.

The tool is architected to handle both **engaged projects**, where detailed technical specifications are available, and **scraped projects**, where parameters are inferred from public data sources like AEMO.

## 2. Key Features

*   **Dual Performance Models:** Supports both contractual and IEC 61724 standard models.
*   **LLM-Powered Contract Parsing:** Uses a Large Language Model (LLM) to intelligently extract complex performance equations, parameters, and compliance criteria from PDF contracts.
*   **Parameter Inference Engine:** Automatically estimates technical specifications for any solar farm in the NEM, enabling market-wide performance analysis.
*   **IEC 61724 Calculation Engine:** A robust, pandas-based engine for calculating all standard performance metrics.
*   **RESTful API:** A comprehensive FastAPI application provides endpoints for managing solar farms, uploading contracts, and running performance assessments.
*   **AEMO & Solcast Integration:** Designed to work with AEMO SCADA data for actual generation and Solcast for high-resolution weather and irradiance data.
*   **Automated Reporting:** Generate detailed performance assessment reports.

## 3. Project Structure

```
performance-assessment/
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI endpoints
│   │   │   └── performance_api.py
│   │   ├── models/               # Pydantic and database models
│   │   └── main.py               # Main FastAPI application
│   └── requirements.txt
├── contract_model/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   └── pdf_parser.py           # PDF parsing and LLM extraction service
├── docs/
│   ├── ARCHITECTURE.md         # High-level architecture
│   └── DATABASE_SCHEMA.md      # High-level database schema
├── examples/
│   ├── example_contract_assessment.py
│   └── example_iec61724_assessment.py
├── iec61724_model/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── iec61724_calculator.py  # IEC 61724 calculation engine
│   └── parameter_inference.py  # Parameter inference engine
└── README.md                   # This file
```

## 4. Technology Stack

This tool adheres to the standard MCE Tools technology stack:

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, Celery, pandas, pdfplumber, OpenAI
- **Database:** PostgreSQL 15+, Redis, InfluxDB/TimescaleDB
- **Frontend:** React 18+, TypeScript, Vite, TailwindCSS
- **Infrastructure:** Docker, Docker Compose

## 5. Getting Started

### 5.1. Prerequisites

*   Python 3.11+
*   An OpenAI API key (set as the `OPENAI_API_KEY` environment variable) for contract parsing.
*   A Solcast API key (for production use) for weather data.
*   Access to a PostgreSQL database.

### 5.2. Installation

1.  **Install dependencies:**

    ```bash
    cd backend
    pip install -r requirements.txt
    ```

2.  **Set up the database:**

    *   Create a PostgreSQL database.
    *   Apply the schemas defined in `contract_model/DATABASE_SCHEMA.md` and `iec61724_model/DATABASE_SCHEMA.md`.

3.  **Run the API server:**

    ```bash
    cd backend/app
    uvicorn main:app --reload
    ```

    The API will be available at `http://127.0.0.1:8000`.

### 5.3. Example Usage

Refer to the scripts in the `examples/` directory for detailed demonstrations of how to use the different components of the tool:

*   `example_iec61724_assessment.py`: Shows the end-to-end workflow for an IEC 61724-based assessment, including parameter inference and metric calculation.
*   `example_contract_assessment.py`: Demonstrates the process for parsing a contract and using the extracted model for compliance checking.

## 6. API Endpoints

The API provides a full suite of endpoints for interacting with the tool. See the auto-generated documentation at `http://127.0.0.1:8000/docs` for a complete reference.

**Key Endpoints:**

*   `POST /api/v1/performance/solar-farms`: Create a new solar farm record (with or without inference).
*   `POST /api/v1/performance/assess/iec61724`: Run an IEC 61724 performance assessment.
*   `POST /api/v1/performance/contracts/upload`: Upload a PDF contract for parsing.
*   `POST /api/v1/performance/contracts/{contract_id}/assess`: Run a compliance assessment against a specific contract.

## 7. Next Steps & Future Development

*   **Database Integration:** The current implementation includes placeholder comments (`# TODO: Save to database`). These need to be replaced with actual database logic using an ORM like SQLAlchemy.
*   **Frontend Dashboard:** Develop a web-based frontend to visualize performance data, manage contracts, and view compliance reports.
*   **AEMO Scraper Service:** Build out the scheduled service to continuously fetch and store AEMO SCADA and dispatch data.
*   **Refine LLM Prompts:** Further refine the prompts used for contract parsing to handle more complex and ambiguous contractual language.
