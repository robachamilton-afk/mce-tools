# MCE Tools - Architecture Documentation

## System Overview

The MCE Tools suite is a **monorepo-based microservices architecture** designed to support Main Character Energy's consulting operations. All tools share common infrastructure while maintaining logical separation for independent development and deployment.

## Design Principles

### 1. **Monorepo for Knowledge Sharing**
All internal consulting tools are housed in a single repository to:
- Share common data models and business logic
- Maintain consistent coding standards
- Enable cross-tool data integration
- Simplify dependency management
- Facilitate AI-assisted development across sessions

### 2. **Microservices Architecture**
Each tool operates as an independent service with:
- Dedicated API endpoints
- Isolated frontend application
- Shared database with logical separation
- Independent scaling capabilities

### 3. **Data-Centric Design**
Given the data-heavy nature (millions of datapoints from hundreds of thousands of documents):
- PostgreSQL as the single source of truth
- Batch processing for large-scale operations
- Caching layer (Redis) for frequently accessed data
- Asynchronous task processing (Celery) for long-running jobs

### 4. **Security by Design**
Handling sensitive project data requires:
- Authentication and authorization at every layer
- Row-level security in PostgreSQL
- Audit logging for compliance
- Encrypted data at rest and in transit

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Client Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Spec Gen UI  │  │ Perf Model   │  │ Risk Assess  │  │ Bench DB    │ │
│  │ (React)      │  │ UI (React)   │  │ UI (React)   │  │ UI (React)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTPS/JWT
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Gateway / Nginx                              │
│                     (Reverse Proxy, Load Balancing)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       Backend Services Layer                             │
│                          (FastAPI + Python)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Spec Gen API │  │ Perf Model   │  │ Risk Assess  │  │ Bench DB    │ │
│  │ /api/specs   │  │ API          │  │ API          │  │ API         │ │
│  │              │  │ /api/perf    │  │ /api/risk    │  │ /api/bench  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Shared Business Logic                         │   │
│  │  • Authentication & Authorization (JWT)                          │   │
│  │  • Data Validation (Pydantic)                                    │   │
│  │  • Database Models (SQLAlchemy)                                  │   │
│  │  • Utility Functions                                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      Asynchronous Task Layer                             │
│                         (Celery + Redis)                                 │
│  • Document parsing and scraping                                         │
│  • Batch data processing                                                 │
│  • Report generation                                                     │
│  • Performance model calculations                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          Data Layer                                      │
│  ┌──────────────────────────────────┐  ┌───────────────────────────┐   │
│  │      PostgreSQL 15+              │  │      Redis                │   │
│  │  • Projects                      │  │  • Session cache          │   │
│  │  • Specifications                │  │  • Query cache            │   │
│  │  • Performance data              │  │  • Celery task queue      │   │
│  │  • Risk assessments              │  │                           │   │
│  │  • Benchmarking data             │  │                           │   │
│  │  • Users & permissions           │  │                           │   │
│  │  • Audit logs                    │  │                           │   │
│  └──────────────────────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack Rationale

### Backend: Python + FastAPI

**Why Python:**
- Excellent for data processing (pandas, NumPy, scikit-learn)
- Strong document parsing libraries (PyPDF2, python-docx, BeautifulSoup)
- Perfect for batch processing and ETL pipelines
- Easier to implement complex algorithms (performance modeling, risk assessment)
- Rich ecosystem for scientific computing

**Why FastAPI:**
- Modern async framework (better performance than Flask/Django)
- Automatic API documentation (OpenAPI/Swagger)
- Type safety with Python type hints
- Built-in data validation (Pydantic)
- Easy to test and maintain

### Frontend: React + TypeScript + TailwindCSS

**Why React:**
- Component-based architecture (reusable UI elements)
- Large ecosystem and community support
- Excellent for data-heavy applications
- Easy to integrate with backend APIs

**Why TypeScript:**
- Type safety reduces bugs
- Better IDE support and autocomplete
- Easier to refactor and maintain
- Matches backend type system (Pydantic)

**Why TailwindCSS:**
- Rapid UI development
- Consistent design system across all tools
- Smaller bundle sizes
- Easy to customize and extend

### Database: PostgreSQL

**Why PostgreSQL:**
- Handles millions of rows efficiently
- JSONB support for flexible data models
- Full-text search capabilities
- Row-level security for data isolation
- Excellent for complex queries and joins
- ACID compliance for data integrity
- Free and open-source

### Caching & Tasks: Redis + Celery

**Why Redis:**
- Fast in-memory caching
- Session management
- Task queue for Celery
- Pub/sub for real-time updates

**Why Celery:**
- Distributed task processing
- Handles long-running batch jobs
- Task scheduling and retries
- Progress tracking

## Data Flow Patterns

### Pattern 1: Simple CRUD Operations
```
User → Frontend → API → PostgreSQL → API → Frontend → User
```

**Example:** Creating a new project specification
1. User fills form in Spec Generator UI
2. Frontend sends POST request to `/api/specs/create`
3. Backend validates data (Pydantic)
4. Backend saves to PostgreSQL
5. Backend returns success response
6. Frontend updates UI

### Pattern 2: Batch Processing
```
User → Frontend → API → Celery Task → PostgreSQL → Notification → User
```

**Example:** Scraping 1000 design documents
1. User uploads document list in Data Scraper UI
2. Frontend sends POST request to `/api/scraper/batch`
3. Backend creates Celery task
4. Backend returns task ID immediately
5. Celery worker processes documents asynchronously
6. Results saved to PostgreSQL
7. User receives notification when complete

### Pattern 3: Cached Queries
```
User → Frontend → API → Redis (cache hit) → Frontend → User
                      ↓ (cache miss)
                  PostgreSQL → Redis (cache set) → Frontend → User
```

**Example:** Loading benchmarking data
1. User requests benchmarking data
2. Backend checks Redis cache
3. If cache hit: return immediately
4. If cache miss: query PostgreSQL, cache result, return

### Pattern 4: Cross-Tool Data Sharing
```
Tool A → PostgreSQL ← Tool B
```

**Example:** Risk Assessment using Spec Generator data
1. Risk Assessment tool queries projects table
2. Retrieves specifications created by Spec Generator
3. Analyzes historical risk patterns
4. Generates risk matrix for new project

## Security Architecture

### Authentication Flow

```
User → Login → Backend → JWT Token → Frontend (stores in memory)
                                    ↓
                        All subsequent API requests include JWT
                                    ↓
                        Backend validates JWT on every request
                                    ↓
                        Row-level security enforces data access
```

### Security Layers

1. **Transport Security:** HTTPS/TLS for all communications
2. **Authentication:** JWT tokens with expiration
3. **Authorization:** Role-based access control (RBAC)
4. **Data Security:** PostgreSQL row-level security
5. **Audit Logging:** All data access logged to database
6. **Secrets Management:** Environment variables (never in code)

### Row-Level Security Example

```sql
-- Users can only access projects they own or are assigned to
CREATE POLICY user_project_access ON projects
  USING (
    owner_id = current_user_id() OR
    id IN (SELECT project_id FROM project_members WHERE user_id = current_user_id())
  );
```

## Deployment Architecture

### Development Environment (Docker Compose)

```
docker-compose.yml:
  - frontend (React dev server on :3000)
  - backend (FastAPI on :8000)
  - postgres (PostgreSQL on :5432)
  - redis (Redis on :6379)
  - celery-worker (background tasks)
```

### Production Environment (Self-Hosted)

```
Nginx (Reverse Proxy)
  ├── Frontend (Static files served by Nginx)
  ├── Backend (FastAPI via Gunicorn/Uvicorn)
  ├── PostgreSQL (Persistent volume)
  ├── Redis (Persistent volume)
  └── Celery Workers (Multiple instances)
```

## Scalability Considerations

### Current Scale (Self-Hosted)
- **Users:** 1-10 concurrent users
- **Data:** Millions of datapoints, hundreds of thousands of documents
- **Processing:** Batch processing acceptable (minutes to hours)

### Future Scale (Cloud-Hosted)
- **Horizontal Scaling:** Add more backend/Celery workers
- **Database Scaling:** PostgreSQL read replicas
- **Caching:** Redis cluster for distributed caching
- **Load Balancing:** Nginx or cloud load balancer
- **CDN:** Static assets on CDN

## Integration Points

### Tool-to-Tool Integration

Tools can share data through:
1. **Shared Database:** Common PostgreSQL tables
2. **Internal APIs:** Tools can call each other's APIs
3. **Shared Libraries:** Common Python/TypeScript code

**Example:** Performance Model using Spec Generator data
```python
# In performance-model tool
from shared.database.models import Project, Specification

# Query specifications created by spec-generator
specs = db.query(Specification).filter_by(project_id=project_id).all()
```

### External Integration

Tools can integrate with external systems:
1. **ACC (Autodesk Construction Cloud):** Data Scraper exports to ACC
2. **File Storage:** S3 or local filesystem for documents
3. **Email/Notifications:** SMTP for alerts
4. **APIs:** Third-party APIs for data enrichment

## Development Workflow

### Adding a New Tool

1. Create directory in `tools/new-tool/`
2. Set up FastAPI backend in `tools/new-tool/backend/`
3. Set up React frontend in `tools/new-tool/frontend/`
4. Add database models to `shared/database/models/`
5. Add API routes to `tools/new-tool/backend/routes/`
6. Update Docker Compose configuration
7. Document in `docs/API_CONTRACTS.md`

### Adding a Shared Feature

1. Implement in `shared/utils/` or `shared/components/`
2. Document in `docs/SHARED_LIBRARIES.md`
3. Import in tools that need it

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Add new table"

# Apply migration
alembic upgrade head
```

## Monitoring & Observability

### Logging Strategy

- **Application Logs:** Python logging module → stdout → Docker logs
- **Access Logs:** Nginx access logs
- **Error Logs:** Sentry or similar (future)
- **Audit Logs:** PostgreSQL table with all data modifications

### Health Checks

Each service exposes a health check endpoint:
- Backend: `GET /health`
- Database: Connection test
- Redis: Ping test
- Celery: Worker status

## Disaster Recovery

### Backup Strategy

1. **Database Backups:** PostgreSQL daily backups (pg_dump)
2. **File Backups:** Document storage backups
3. **Configuration Backups:** Docker configs and .env files
4. **Code Backups:** Git repository (GitHub)

### Recovery Process

1. Restore PostgreSQL from latest backup
2. Restore file storage
3. Redeploy Docker containers
4. Verify data integrity

## Future Considerations

### Potential Enhancements

1. **Real-time Collaboration:** WebSocket support for multi-user editing
2. **Advanced Analytics:** Machine learning models for predictions
3. **Mobile Apps:** React Native apps for field use
4. **API Gateway:** Kong or similar for advanced routing
5. **Microservices Split:** Separate databases per tool if needed
6. **Event-Driven Architecture:** Message queue (RabbitMQ/Kafka) for tool communication

### Migration to Cloud

When ready to migrate from self-hosted to cloud:
1. **Database:** Managed PostgreSQL (AWS RDS, DigitalOcean Managed DB)
2. **Caching:** Managed Redis (AWS ElastiCache, Redis Cloud)
3. **Compute:** Kubernetes cluster or container service (ECS, GKE)
4. **Storage:** S3 or equivalent object storage
5. **CDN:** CloudFront or similar for static assets

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
