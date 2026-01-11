# MCE Tools - API Contracts Documentation

## Overview

This document defines all API endpoints across the MCE Tools suite. All APIs follow RESTful conventions and return JSON responses.

## Base Configuration

### Base URLs (Development)
- **Spec Generator:** `http://localhost:8000/api/specs`
- **Performance Model:** `http://localhost:8000/api/performance`
- **Risk Assessment:** `http://localhost:8000/api/risk`
- **Benchmarking DB:** `http://localhost:8000/api/benchmarking`
- **Data Scraper:** `http://localhost:8000/api/scraper`

### Authentication
All endpoints (except `/auth/*`) require JWT authentication:

```http
Authorization: Bearer <jwt_token>
```

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Standard HTTP Status Codes
- `200 OK` - Successful GET/PUT/PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

## Authentication Endpoints

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "organization_id": "uuid" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user"
    },
    "token": "jwt_token_here"
  }
}
```

### POST `/auth/login`
Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user"
    },
    "token": "jwt_token_here",
    "expires_at": "2026-01-12T10:00:00Z"
  }
}
```

### POST `/auth/logout`
Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/auth/me`
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "organization_id": "uuid"
  }
}
```

## Project Endpoints

### GET `/projects`
List all projects accessible to the user.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `completed`, `archived`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Project Alpha",
        "description": "Description here",
        "project_code": "PROJ-001",
        "status": "active",
        "owner": {
          "id": "uuid",
          "full_name": "John Doe"
        },
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-10T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### POST `/projects`
Create a new project.

**Request Body:**
```json
{
  "name": "Project Alpha",
  "description": "Project description",
  "project_code": "PROJ-001",
  "metadata": {
    "client": "Client Name",
    "location": "Sydney, Australia"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Project Alpha",
    "project_code": "PROJ-001",
    "status": "active",
    "created_at": "2026-01-11T00:00:00Z"
  }
}
```

### GET `/projects/{project_id}`
Get project details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Project Alpha",
    "description": "Description",
    "project_code": "PROJ-001",
    "status": "active",
    "owner": {
      "id": "uuid",
      "full_name": "John Doe"
    },
    "members": [
      {
        "user_id": "uuid",
        "full_name": "Jane Smith",
        "role": "editor"
      }
    ],
    "metadata": {},
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-10T00:00:00Z"
  }
}
```

### PUT `/projects/{project_id}`
Update project details.

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "completed"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Project Name",
    "updated_at": "2026-01-11T10:00:00Z"
  }
}
```

### DELETE `/projects/{project_id}`
Soft delete a project.

**Response (204):**
No content.

## Spec Generator Endpoints

### GET `/api/specs/documents`
List specification documents.

**Query Parameters:**
- `project_id` (optional): Filter by project
- `document_type` (optional): Filter by type
- `status` (optional): Filter by status
- `page`, `limit`: Pagination

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "title": "Technical Specification v1",
        "document_type": "specification",
        "status": "approved",
        "version": 1,
        "created_by": {
          "id": "uuid",
          "full_name": "John Doe"
        },
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST `/api/specs/documents`
Create a new specification document.

**Request Body:**
```json
{
  "project_id": "uuid",
  "title": "Technical Specification",
  "document_type": "specification",
  "content": "Document content here...",
  "metadata": {}
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Technical Specification",
    "version": 1,
    "status": "draft",
    "created_at": "2026-01-11T00:00:00Z"
  }
}
```

### GET `/api/specs/documents/{document_id}`
Get specification document details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "title": "Technical Specification",
    "document_type": "specification",
    "content": "Full document content...",
    "version": 1,
    "status": "approved",
    "sections": [
      {
        "id": "uuid",
        "section_number": "1.0",
        "title": "Introduction",
        "content": "Section content...",
        "order_index": 1
      }
    ],
    "metadata": {},
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-10T00:00:00Z"
  }
}
```

### POST `/api/specs/generate`
Generate specification from template.

**Request Body:**
```json
{
  "project_id": "uuid",
  "template_id": "uuid",
  "variables": {
    "project_name": "Project Alpha",
    "client_name": "Client Corp",
    "location": "Sydney"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "title": "Generated Specification - Project Alpha",
    "status": "draft"
  }
}
```

### GET `/api/specs/templates`
List available templates.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Standard Technical Specification",
        "category": "technical",
        "description": "Template description",
        "variables": ["project_name", "client_name", "location"]
      }
    ]
  }
}
```

## Performance Model Endpoints

### GET `/api/performance/datasets`
List performance datasets.

**Query Parameters:**
- `project_id` (optional): Filter by project
- `dataset_type` (optional): Filter by type

**Response (200):**
```json
{
  "success": true,
  "data": {
    "datasets": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "name": "Q4 2025 Performance Data",
        "dataset_type": "time_series",
        "data_source": "imported",
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST `/api/performance/datasets`
Create a new performance dataset.

**Request Body:**
```json
{
  "project_id": "uuid",
  "name": "Q4 2025 Performance Data",
  "description": "Quarterly performance metrics",
  "dataset_type": "time_series",
  "data_source": "manual"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Q4 2025 Performance Data",
    "created_at": "2026-01-11T00:00:00Z"
  }
}
```

### POST `/api/performance/datasets/{dataset_id}/datapoints`
Add datapoints to a dataset.

**Request Body:**
```json
{
  "datapoints": [
    {
      "metric_name": "productivity",
      "metric_value": 87.5,
      "metric_unit": "percent",
      "measured_at": "2025-12-01T00:00:00Z"
    },
    {
      "metric_name": "efficiency",
      "metric_value": 92.3,
      "metric_unit": "percent",
      "measured_at": "2025-12-01T00:00:00Z"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "added": 2,
    "dataset_id": "uuid"
  }
}
```

### POST `/api/performance/analyze`
Analyze performance data and generate report.

**Request Body:**
```json
{
  "project_id": "uuid",
  "dataset_id": "uuid",
  "report_type": "detailed",
  "analysis_options": {
    "include_trends": true,
    "include_forecasting": true,
    "comparison_period": "previous_quarter"
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "message": "Analysis started. Check /api/performance/reports/{job_id} for status."
  }
}
```

### GET `/api/performance/reports/{report_id}`
Get performance report.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "title": "Q4 2025 Performance Analysis",
    "report_type": "detailed",
    "status": "completed",
    "content": {
      "summary": {
        "overall_score": 89.2,
        "trend": "improving"
      },
      "metrics": [
        {
          "name": "productivity",
          "current": 87.5,
          "previous": 82.1,
          "change": 5.4
        }
      ],
      "insights": ["Productivity increased by 5.4%..."],
      "recommendations": ["Continue current practices..."]
    },
    "pdf_url": "https://example.com/reports/report.pdf",
    "created_at": "2026-01-11T00:00:00Z"
  }
}
```

## Risk Assessment Endpoints

### GET `/api/risk/matrices`
List risk matrices.

**Query Parameters:**
- `project_id` (optional): Filter by project
- `matrix_type` (optional): Filter by type

**Response (200):**
```json
{
  "success": true,
  "data": {
    "matrices": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "name": "CIS Risk Matrix - Project Alpha",
        "matrix_type": "cis",
        "status": "approved",
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST `/api/risk/matrices`
Create a new risk matrix.

**Request Body:**
```json
{
  "project_id": "uuid",
  "name": "CIS Risk Matrix - Project Alpha",
  "description": "Comprehensive risk assessment",
  "matrix_type": "cis"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "CIS Risk Matrix - Project Alpha",
    "status": "draft",
    "created_at": "2026-01-11T00:00:00Z"
  }
}
```

### POST `/api/risk/matrices/{matrix_id}/items`
Add risk item to matrix.

**Request Body:**
```json
{
  "risk_code": "RISK-001",
  "title": "Material Supply Delay",
  "description": "Potential delay in material delivery",
  "category": "supply_chain",
  "likelihood": 3,
  "impact": 4,
  "mitigation_strategy": "Establish backup suppliers"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "risk_code": "RISK-001",
    "risk_score": 12,
    "created_at": "2026-01-11T00:00:00Z"
  }
}
```

### GET `/api/risk/matrices/{matrix_id}`
Get risk matrix with all items.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "name": "CIS Risk Matrix",
    "matrix_type": "cis",
    "status": "approved",
    "items": [
      {
        "id": "uuid",
        "risk_code": "RISK-001",
        "title": "Material Supply Delay",
        "category": "supply_chain",
        "likelihood": 3,
        "impact": 4,
        "risk_score": 12,
        "mitigation_strategy": "Establish backup suppliers",
        "status": "mitigated"
      }
    ],
    "summary": {
      "total_risks": 15,
      "high_risks": 3,
      "medium_risks": 8,
      "low_risks": 4
    }
  }
}
```

### POST `/api/risk/analyze-historical`
Analyze historical risk data for benchmarking.

**Request Body:**
```json
{
  "project_type": "commercial_construction",
  "region": "NSW",
  "risk_categories": ["supply_chain", "safety", "financial"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "historical_analysis": {
      "supply_chain": {
        "average_likelihood": 2.8,
        "average_impact": 3.2,
        "occurrence_rate": 0.45
      }
    },
    "recommendations": [
      "Supply chain risks occur in 45% of similar projects..."
    ]
  }
}
```

## Benchmarking Database Endpoints

### GET `/api/benchmarking/datasets`
List benchmarking datasets.

**Query Parameters:**
- `industry` (optional): Filter by industry
- `project_type` (optional): Filter by project type
- `region` (optional): Filter by region

**Response (200):**
```json
{
  "success": true,
  "data": {
    "datasets": [
      {
        "id": "uuid",
        "name": "Commercial Construction - Sydney 2025",
        "industry": "construction",
        "project_type": "commercial",
        "region": "NSW",
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST `/api/benchmarking/datasets`
Create benchmarking dataset.

**Request Body:**
```json
{
  "project_id": "uuid",
  "name": "Commercial Construction - Sydney 2025",
  "industry": "construction",
  "project_type": "commercial",
  "region": "NSW",
  "data_source": "industry_report"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Commercial Construction - Sydney 2025",
    "created_at": "2026-01-11T00:00:00Z"
  }
}
```

### POST `/api/benchmarking/compare`
Compare project against benchmarks.

**Request Body:**
```json
{
  "project_id": "uuid",
  "benchmark_dataset_id": "uuid",
  "metrics": ["cost_per_sqm", "duration", "safety_incidents"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "cost_per_sqm": {
        "project_value": 2850,
        "benchmark_median": 2650,
        "percentile": 65,
        "status": "above_average"
      },
      "duration": {
        "project_value": 18,
        "benchmark_median": 20,
        "percentile": 35,
        "status": "better_than_average"
      }
    }
  }
}
```

## Data Scraper Endpoints

### POST `/api/scraper/jobs`
Create a new scraping job.

**Request Body:**
```json
{
  "project_id": "uuid",
  "name": "Design Documents Batch 1",
  "job_type": "batch",
  "documents": [
    {
      "file_name": "drawing_001.pdf",
      "file_path": "/uploads/drawing_001.pdf"
    },
    {
      "file_name": "spec_002.docx",
      "file_path": "/uploads/spec_002.docx"
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "pending",
    "total_documents": 2,
    "message": "Job queued for processing"
  }
}
```

### GET `/api/scraper/jobs/{job_id}`
Get scraping job status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Design Documents Batch 1",
    "status": "processing",
    "total_documents": 2,
    "processed_documents": 1,
    "failed_documents": 0,
    "progress": 50,
    "started_at": "2026-01-11T10:00:00Z",
    "estimated_completion": "2026-01-11T10:15:00Z"
  }
}
```

### GET `/api/scraper/jobs/{job_id}/results`
Get scraping job results.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "completed",
    "documents": [
      {
        "id": "uuid",
        "file_name": "drawing_001.pdf",
        "status": "completed",
        "extracted_data": {
          "tables": 5,
          "text_blocks": 23,
          "metadata": {...}
        },
        "acc_model_id": "ACC-12345"
      }
    ]
  }
}
```

### POST `/api/scraper/export-to-acc`
Export scraped data to ACC.

**Request Body:**
```json
{
  "job_id": "uuid",
  "acc_project_id": "ACC-PROJECT-123",
  "mapping_config": {
    "table_mapping": "standard",
    "metadata_fields": ["project_code", "revision"]
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "export_job_id": "uuid",
    "status": "exporting",
    "message": "Export to ACC started"
  }
}
```

## Webhook Endpoints

### POST `/webhooks/celery-status`
Receive Celery task status updates (internal).

### POST `/webhooks/acc-callback`
Receive callbacks from ACC integration (internal).

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
