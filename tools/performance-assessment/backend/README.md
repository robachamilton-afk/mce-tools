# Performance Assessment Tool - Backend

**Author:** Manus AI  
**Date:** January 12, 2026

## 1. Overview

This directory contains the complete backend implementation for the Solar Farm Performance Assessment Tool. It is a FastAPI application that provides a comprehensive suite of services for data ingestion, storage, analysis, and reporting.

## 2. Features

*   **Relational Database:** Uses PostgreSQL with SQLAlchemy for storing structured data like solar farm parameters, contracts, and assessment metadata.
*   **Time-Series Database:** Integrates with InfluxDB for efficient storage and querying of high-frequency SCADA, dispatch, and weather data.
*   **AEMO Data Scraper:** A robust scraper for fetching SCADA and dispatch data from NEMWEB, with data validation and error handling.
*   **Safe Equation Interpreter:** A secure interpreter for evaluating mathematical equations from performance contracts using Python's AST module.
*   **Background Task Processing:** Uses Celery with Redis for scheduling and executing long-running tasks like data scraping and performance assessments.
*   **Comprehensive API:** A full set of FastAPI endpoints for interacting with all backend services.

## 3. Project Structure

```
backend/
├── app/
│   ├── api/                  # FastAPI endpoints
│   │   └── performance_api.py
│   ├── database/
│   │   ├── connection.py     # SQLAlchemy session management
│   │   ├── crud.py           # CRUD operations
│   │   ├── models.py         # SQLAlchemy models
│   │   └── timeseries.py     # InfluxDB client
│   ├── services/
│   │   ├── aemo_scraper_v2.py  # AEMO scraper with DB integration
│   │   └── ...
│   ├── tasks/
│   │   ├── assessment_tasks.py # Celery tasks for assessments
│   │   └── scraping_tasks.py   # Celery tasks for scraping
│   ├── celery_app.py         # Celery application configuration
│   └── main.py               # Main FastAPI application
├── README.md                 # This file
└── requirements.txt          # Python dependencies
```

## 4. Getting Started

### 4.1. Prerequisites

*   Docker and Docker Compose
*   Python 3.11+
*   An OpenAI API key (set as `OPENAI_API_KEY`)

### 4.2. Environment Setup

1.  **Create a `.env` file** in the `backend/` directory with the following variables:

    ```env
    DATABASE_URL=postgresql://postgres:postgres@db:5432/performance_assessment
    REDIS_URL=redis://redis:6379/0
    INFLUXDB_URL=http://influxdb:8086
    INFLUXDB_TOKEN=your-influxdb-token
    INFLUXDB_ORG=mce
    INFLUXDB_BUCKET=performance_assessment
    OPENAI_API_KEY=your-openai-api-key
    ```

2.  **Create a `docker-compose.yml` file** to run the required services (PostgreSQL, Redis, InfluxDB).

### 4.3. Installation & Running

1.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

2.  **Initialize the database:**

    Run the following Python script to create the database tables:

    ```python
    from app.database.connection import init_db
    init_db()
    ```

3.  **Run the API server:**

    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```

4.  **Run the Celery worker:**

    ```bash
    celery -A app.celery_app worker -l info -Q scraping,assessment
    ```

5.  **Run the Celery beat scheduler:**

    ```bash
    celery -A app.celery_app beat -l info
    ```

## 5. Key Components

### 5.1. Database Layer

*   **SQLAlchemy Models (`models.py`):** Defines the relational schema for all structured data.
*   **CRUD Operations (`crud.py`):** Provides a clean interface for all database interactions.
*   **InfluxDB Client (`timeseries.py`):** A dedicated client for all time-series data operations, including methods for writing and querying SCADA, dispatch, and weather data.

### 5.2. AEMO Scraper

*   **`AEMOScraper` (`aemo_scraper_v2.py`):** The main class for fetching data from NEMWEB.
*   **Error Handling:** Includes robust error handling and logging for network issues and parsing errors.
*   **Database Integration:** Stores all scraped data in the appropriate database (PostgreSQL for metadata, InfluxDB for time-series).

### 5.3. Equation Interpreter

*   **`EquationInterpreter` (`equation_interpreter.py`):** Safely evaluates equations from contracts in a sandboxed environment.
*   **AST-based:** Uses Python's Abstract Syntax Tree to prevent arbitrary code execution.

### 5.4. Celery Tasks

*   **Scraping Tasks (`scraping_tasks.py`):** Background tasks for scraping SCADA and dispatch data.
*   **Assessment Tasks (`assessment_tasks.py`):** Tasks for calculating daily and monthly performance assessments.
*   **Scheduled Jobs (`celery_app.py`):** A full Celery Beat schedule for running tasks automatically.


