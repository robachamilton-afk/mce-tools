# MCE Tools - Database Schema Documentation

## Overview

The MCE Tools suite uses a **single PostgreSQL database** with logical separation between tools. This approach enables:
- Data sharing across tools
- Referential integrity
- Simplified backup and recovery
- Efficient cross-tool queries

## Database Design Principles

1. **Shared Core Tables:** Users, projects, organizations
2. **Tool-Specific Tables:** Prefixed by tool name (e.g., `spec_`, `perf_`, `risk_`)
3. **Audit Logging:** All modifications tracked in `audit_logs` table
4. **Soft Deletes:** Records marked as deleted, not physically removed
5. **Timestamps:** All tables have `created_at` and `updated_at`

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       │ owns/creates
       │
       ├──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │
       ↓                  ↓                  ↓                  ↓
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  projects   │    │organizations│    │ audit_logs  │    │   sessions  │
└──────┬──────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │
       │ belongs to
       │
       ├──────────────────┬──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │                  │
       ↓                  ↓                  ↓                  ↓                  ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│spec_documents│   │perf_datasets │   │risk_matrices │   │bench_datasets│   │scrape_jobs   │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

## Core Tables

### `users`
Stores user accounts and authentication information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin', 'user', 'viewer'
    organization_id UUID REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `email`: User email (unique, used for login)
- `password_hash`: Bcrypt hashed password
- `full_name`: User's full name
- `role`: User role for RBAC (admin, user, viewer)
- `organization_id`: Optional organization membership
- `is_active`: Account status
- `last_login_at`: Last successful login timestamp
- `created_at`: Account creation timestamp
- `updated_at`: Last modification timestamp
- `deleted_at`: Soft delete timestamp (NULL if active)

### `organizations`
Stores organization/company information for multi-tenant support.

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
```

### `projects`
Central table for all projects across all tools.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_code VARCHAR(50) UNIQUE,
    owner_id UUID REFERENCES users(id) NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_code ON projects(project_code);
CREATE INDEX idx_projects_status ON projects(status);
```

**Columns:**
- `id`: Unique identifier
- `name`: Project name
- `description`: Project description
- `project_code`: Unique project code/reference
- `owner_id`: User who created the project
- `organization_id`: Organization that owns the project
- `status`: Project status (active, completed, archived)
- `metadata`: Flexible JSONB field for tool-specific data
- `created_at`, `updated_at`, `deleted_at`: Timestamps

### `project_members`
Many-to-many relationship between users and projects.

```sql
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- 'owner', 'editor', 'member', 'viewer'
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

### `audit_logs`
Comprehensive audit trail for all data modifications.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
    entity_type VARCHAR(100) NOT NULL, -- 'project', 'spec_document', etc.
    entity_id UUID NOT NULL,
    changes JSONB, -- Before/after values for updates
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### `sessions`
User session management for JWT tokens.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

## Tool-Specific Tables

### Spec Generator Tables

#### `spec_documents`
Stores project specifications and templates.

```sql
CREATE TABLE spec_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'specification', 'template', 'contract'
    content TEXT,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'archived'
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_spec_documents_project ON spec_documents(project_id);
CREATE INDEX idx_spec_documents_type ON spec_documents(document_type);
CREATE INDEX idx_spec_documents_status ON spec_documents(status);
```

#### `spec_sections`
Individual sections within specification documents.

```sql
CREATE TABLE spec_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES spec_documents(id) NOT NULL,
    section_number VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    order_index INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spec_sections_document ON spec_sections(document_id);
CREATE INDEX idx_spec_sections_order ON spec_sections(document_id, order_index);
```

#### `spec_templates`
Reusable specification templates.

```sql
CREATE TABLE spec_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    content TEXT,
    variables JSONB DEFAULT '[]', -- Template variables
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_spec_templates_category ON spec_templates(category);
CREATE INDEX idx_spec_templates_public ON spec_templates(is_public);
```

### Performance Model Tables

#### `perf_datasets`
Performance data collections for analysis.

```sql
CREATE TABLE perf_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dataset_type VARCHAR(50), -- 'time_series', 'snapshot', 'comparison'
    data_source VARCHAR(100), -- 'manual', 'imported', 'scraped'
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_perf_datasets_project ON perf_datasets(project_id);
CREATE INDEX idx_perf_datasets_type ON perf_datasets(dataset_type);
```

#### `perf_datapoints`
Individual performance measurements.

```sql
CREATE TABLE perf_datapoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES perf_datasets(id) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(50),
    measured_at TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perf_datapoints_dataset ON perf_datapoints(dataset_id);
CREATE INDEX idx_perf_datapoints_metric ON perf_datapoints(metric_name);
CREATE INDEX idx_perf_datapoints_measured ON perf_datapoints(measured_at);
```

#### `perf_reports`
Generated performance analysis reports.

```sql
CREATE TABLE perf_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    dataset_id UUID REFERENCES perf_datasets(id),
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50), -- 'summary', 'detailed', 'comparison'
    content JSONB, -- Structured report data
    pdf_url TEXT, -- Link to generated PDF
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_perf_reports_project ON perf_reports(project_id);
CREATE INDEX idx_perf_reports_dataset ON perf_reports(dataset_id);
```

### Risk Assessment Tables

#### `risk_matrices`
Risk assessment matrices for projects.

```sql
CREATE TABLE risk_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    matrix_type VARCHAR(50), -- 'cis', 'safety', 'financial', 'schedule'
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_risk_matrices_project ON risk_matrices(project_id);
CREATE INDEX idx_risk_matrices_type ON risk_matrices(matrix_type);
```

#### `risk_items`
Individual risk items within a matrix.

```sql
CREATE TABLE risk_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matrix_id UUID REFERENCES risk_matrices(id) NOT NULL,
    risk_code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
    impact INTEGER CHECK (impact BETWEEN 1 AND 5),
    risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
    mitigation_strategy TEXT,
    owner_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'identified',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_risk_items_matrix ON risk_items(matrix_id);
CREATE INDEX idx_risk_items_score ON risk_items(risk_score);
CREATE INDEX idx_risk_items_category ON risk_items(category);
```

#### `risk_historical_data`
Historical risk data for benchmarking.

```sql
CREATE TABLE risk_historical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    risk_category VARCHAR(100),
    likelihood INTEGER,
    impact INTEGER,
    actual_outcome VARCHAR(50), -- 'occurred', 'mitigated', 'avoided'
    notes TEXT,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_risk_historical_category ON risk_historical_data(risk_category);
CREATE INDEX idx_risk_historical_outcome ON risk_historical_data(actual_outcome);
```

### Benchmarking Database Tables

#### `bench_datasets`
Benchmarking datasets for TDD projects.

```sql
CREATE TABLE bench_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    project_type VARCHAR(100),
    region VARCHAR(100),
    data_source VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_bench_datasets_industry ON bench_datasets(industry);
CREATE INDEX idx_bench_datasets_type ON bench_datasets(project_type);
CREATE INDEX idx_bench_datasets_region ON bench_datasets(region);
```

#### `bench_metrics`
Individual benchmarking metrics.

```sql
CREATE TABLE bench_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES bench_datasets(id) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    percentile_rank NUMERIC, -- 0-100
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bench_metrics_dataset ON bench_metrics(dataset_id);
CREATE INDEX idx_bench_metrics_name ON bench_metrics(metric_name);
```

### Data Scraper Tables

#### `scrape_jobs`
Document scraping job tracking.

```sql
CREATE TABLE scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    job_type VARCHAR(50), -- 'pdf', 'dwg', 'docx', 'batch'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_documents INTEGER,
    processed_documents INTEGER DEFAULT 0,
    failed_documents INTEGER DEFAULT 0,
    error_log TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scrape_jobs_project ON scrape_jobs(project_id);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);
```

#### `scrape_documents`
Individual documents processed by scraper.

```sql
CREATE TABLE scrape_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scrape_jobs(id) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_type VARCHAR(50),
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'pending',
    extracted_data JSONB,
    acc_model_id VARCHAR(255), -- ACC data model reference
    error_message TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scrape_documents_job ON scrape_documents(job_id);
CREATE INDEX idx_scrape_documents_status ON scrape_documents(status);
```

#### `scrape_extracted_data`
Structured data extracted from documents.

```sql
CREATE TABLE scrape_extracted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES scrape_documents(id) NOT NULL,
    data_type VARCHAR(100), -- 'table', 'text', 'metadata', 'drawing'
    content JSONB NOT NULL,
    confidence_score NUMERIC, -- 0.0-1.0
    page_number INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scrape_extracted_document ON scrape_extracted_data(document_id);
CREATE INDEX idx_scrape_extracted_type ON scrape_extracted_data(data_type);
```

## Database Functions & Triggers

### Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Apply to all other tables similarly)
```

### Row-Level Security Policies

```sql
-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can see projects they own or are members of
CREATE POLICY project_access_policy ON projects
    FOR SELECT
    USING (
        owner_id = current_setting('app.current_user_id')::UUID OR
        id IN (
            SELECT project_id FROM project_members
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Users can only update projects they own
CREATE POLICY project_update_policy ON projects
    FOR UPDATE
    USING (owner_id = current_setting('app.current_user_id')::UUID);
```

## Indexes Strategy

### Primary Indexes
- All primary keys (UUID) automatically indexed
- Foreign keys indexed for join performance

### Secondary Indexes
- User email for login lookups
- Project codes for quick reference
- Status fields for filtering
- Timestamp fields for date range queries
- JSONB fields using GIN indexes for metadata queries

### Full-Text Search

```sql
-- Add full-text search to spec_documents
ALTER TABLE spec_documents ADD COLUMN search_vector tsvector;

CREATE INDEX idx_spec_documents_search ON spec_documents USING GIN(search_vector);

CREATE TRIGGER spec_documents_search_update BEFORE INSERT OR UPDATE ON spec_documents
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', title, content);
```

## Backup & Maintenance

### Backup Strategy

```bash
# Daily full backup
pg_dump -U postgres -d mce_tools -F c -f backup_$(date +%Y%m%d).dump

# Weekly backup with compression
pg_dump -U postgres -d mce_tools -F c -Z 9 -f backup_weekly_$(date +%Y%m%d).dump
```

### Maintenance Tasks

```sql
-- Vacuum and analyze (run weekly)
VACUUM ANALYZE;

-- Reindex (run monthly)
REINDEX DATABASE mce_tools;

-- Clean up old audit logs (run monthly, keep 1 year)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- Clean up expired sessions (run daily)
DELETE FROM sessions WHERE expires_at < NOW();
```

## Migration Management

Using **Alembic** for database migrations:

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
