# ACC Tools - Architecture Documentation

## System Overview

ACC Tools is a **product-focused monorepo** containing two tightly integrated applications: a data scraper and a site inspection tool. Both applications share a unified backend API, database, and authentication system while maintaining separate frontend interfaces optimized for their specific use cases.

## Design Principles

### 1. **Product-First Architecture**
- Designed for commercialization from day one
- Multi-tenant architecture with complete data isolation
- Usage tracking and billing integration
- Scalable to thousands of concurrent users

### 2. **Tight Integration**
- Scraper and inspection tools share data models
- Unified authentication and user management
- Seamless data flow between applications
- Shared ACC integration layer

### 3. **Mobile-First for Inspections**
- Progressive Web App (PWA) for offline capability
- Responsive design for tablets and phones
- Touch-optimized interfaces
- Photo capture and annotation

### 4. **Intelligent Data Processing**
- ML/NLP for document understanding
- Automated data extraction and validation
- Batch processing for scalability
- Quality assurance workflows

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                     │
│  ┌────────────────────────┐         ┌────────────────────────────────┐  │
│  │   Data Scraper UI      │         │   Site Inspection UI (PWA)     │  │
│  │   (React Web App)      │         │   (React PWA + Offline)        │  │
│  │                        │         │                                │  │
│  │  • Document upload     │         │  • Inspection forms            │  │
│  │  • Extraction config   │         │  • Photo capture               │  │
│  │  • Results review      │         │  • Offline sync                │  │
│  │  • ACC export          │         │  • Report generation           │  │
│  └────────────────────────┘         └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTPS/JWT
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Gateway / Load Balancer                      │
│                     (Rate Limiting, Authentication)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       Unified Backend API (FastAPI)                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │  Auth Service    │  │  Scraper Service │  │  Inspection Service│   │
│  │  • JWT tokens    │  │  • Document parse│  │  • Form management │   │
│  │  • ACC SSO       │  │  • ML extraction │  │  • Photo storage   │   │
│  │  • RBAC          │  │  • Validation    │  │  • Report gen      │   │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ACC Integration Layer                         │   │
│  │  • Forge API client                                              │   │
│  │  • Document access                                               │   │
│  │  • Data model export                                             │   │
│  │  • Webhook handling                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Shared Business Logic                         │   │
│  │  • Multi-tenant management                                       │   │
│  │  • Usage tracking & billing                                      │   │
│  │  • Audit logging                                                 │   │
│  │  • Notification service                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      Asynchronous Processing Layer                       │
│                         (Celery + Redis Queue)                           │
│  • Document parsing and extraction                                       │
│  • ML model inference                                                    │
│  • Batch processing jobs                                                 │
│  • Report generation                                                     │
│  • ACC data export                                                       │
│  • Email notifications                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          Data & Storage Layer                            │
│  ┌──────────────────────────────────┐  ┌───────────────────────────┐   │
│  │      PostgreSQL Database         │  │      Redis Cache          │   │
│  │  • Users & tenants               │  │  • Session cache          │   │
│  │  • Documents & extractions       │  │  • Job queue              │   │
│  │  • Inspections & photos          │  │  • Rate limiting          │   │
│  │  • Usage & billing               │  │                           │   │
│  │  • Audit logs                    │  │                           │   │
│  └──────────────────────────────────┘  └───────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────┐  ┌───────────────────────────┐   │
│  │      S3 / Object Storage         │  │      ML Model Storage     │   │
│  │  • Uploaded documents            │  │  • Trained models         │   │
│  │  • Inspection photos             │  │  • Model versions         │   │
│  │  • Generated reports             │  │  • Training data          │   │
│  └──────────────────────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Architecture

### Tenant Isolation

Every customer (tenant) has complete data isolation:

```sql
-- All tables include tenant_id for isolation
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- ... other fields
);

-- Row-level security enforces isolation
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Tenant Management

```python
class TenantMiddleware:
    """Middleware to set tenant context for each request."""
    
    async def __call__(self, request: Request, call_next):
        # Extract tenant from JWT token
        tenant_id = get_tenant_from_token(request)
        
        # Set tenant context for database queries
        set_tenant_context(tenant_id)
        
        # Process request
        response = await call_next(request)
        return response
```

## Data Flow Patterns

### Pattern 1: Document Scraping Flow

```
User uploads document → API validates → Store in S3 → Create Celery task
                                                              ↓
User receives task ID ← API returns ← Task queued ← Job created
                                                              ↓
                                              Celery worker picks up task
                                                              ↓
                                              Parse document (PyPDF2, etc.)
                                                              ↓
                                              Extract data (ML models)
                                                              ↓
                                              Validate extracted data
                                                              ↓
                                              Store in PostgreSQL
                                                              ↓
User polls for status ← API returns status ← Update task status
                                                              ↓
User views results ← API returns data ← Extraction complete
                                                              ↓
User exports to ACC ← API calls ACC API ← Export requested
```

### Pattern 2: Site Inspection Flow (Online)

```
User opens inspection form → Load template from API → Render form
                                                              ↓
User fills form + captures photos → Upload to S3 → Store metadata in DB
                                                              ↓
User submits inspection → API validates → Save to PostgreSQL
                                                              ↓
Generate report (async) ← Create Celery task ← Inspection saved
                                                              ↓
User receives notification ← Email sent ← Report generated
                                                              ↓
User views report ← API serves PDF ← Report stored in S3
```

### Pattern 3: Site Inspection Flow (Offline)

```
User opens app (offline) → Load cached templates → Render form
                                                              ↓
User fills form + captures photos → Store in IndexedDB → Mark for sync
                                                              ↓
User goes online → Detect connection → Sync pending data
                                                              ↓
Upload photos to S3 → Save inspection to DB → Clear local cache
                                                              ↓
User sees sync complete ← Notification shown ← Sync successful
```

## ACC Integration Architecture

### Forge API Integration

```python
class ForgeClient:
    """Client for Autodesk Forge API."""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
    
    async def authenticate(self):
        """Get OAuth access token."""
        # Implement OAuth flow
        pass
    
    async def get_project_documents(self, project_id: str):
        """Retrieve documents from ACC project."""
        # Call Forge API
        pass
    
    async def export_data_model(self, project_id: str, data: dict):
        """Export extracted data to ACC."""
        # Call Forge API to create/update data model
        pass
```

### ACC Webhook Handling

```python
@app.post("/webhooks/acc")
async def handle_acc_webhook(payload: dict):
    """Handle webhook events from ACC."""
    
    event_type = payload.get("event")
    
    if event_type == "document.uploaded":
        # Trigger automatic scraping
        create_scraping_job(payload["document_id"])
    
    elif event_type == "project.updated":
        # Sync project metadata
        sync_project(payload["project_id"])
    
    return {"status": "received"}
```

## Machine Learning Pipeline

### Document Understanding

```
Document Input → Preprocessing → Feature Extraction → ML Model → Post-processing
                                                                         ↓
                                                              Structured Output
```

### ML Model Architecture

1. **Text Extraction:** PyPDF2, pdfplumber
2. **Table Detection:** Camelot, Tabula
3. **Entity Recognition:** spaCy NER models
4. **Classification:** Custom transformers for document types
5. **Validation:** Rule-based + ML confidence scoring

### Model Training Pipeline

```python
class ExtractionModel:
    """ML model for intelligent data extraction."""
    
    def __init__(self):
        self.nlp = spacy.load("en_core_web_trf")
        self.classifier = load_custom_classifier()
    
    def extract_entities(self, text: str) -> dict:
        """Extract named entities from text."""
        doc = self.nlp(text)
        entities = {
            "dates": [ent.text for ent in doc.ents if ent.label_ == "DATE"],
            "money": [ent.text for ent in doc.ents if ent.label_ == "MONEY"],
            "orgs": [ent.text for ent in doc.ents if ent.label_ == "ORG"],
        }
        return entities
    
    def classify_section(self, text: str) -> str:
        """Classify document section type."""
        return self.classifier.predict(text)
```

## Security Architecture

### Authentication Flow

```
User → Login → API validates credentials → Generate JWT token → Return to user
                                                                        ↓
User stores token → Include in requests → API validates token → Process request
```

### ACC SSO Integration

```
User → Click "Login with ACC" → Redirect to ACC OAuth → User authorizes
                                                                ↓
ACC redirects back → API exchanges code for token → Create user session
                                                                ↓
Return JWT token → User authenticated → Access granted
```

### Authorization (RBAC)

```python
class Role(Enum):
    ADMIN = "admin"           # Full access
    MANAGER = "manager"       # Manage team, view all data
    INSPECTOR = "inspector"   # Create inspections, view own data
    VIEWER = "viewer"         # Read-only access

def require_role(required_role: Role):
    """Decorator to enforce role-based access."""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user_role = get_user_role(request)
            if not has_permission(user_role, required_role):
                raise HTTPException(403, "Insufficient permissions")
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator
```

## Scalability Considerations

### Horizontal Scaling

- **API Servers:** Stateless, can add more instances behind load balancer
- **Celery Workers:** Add more workers to process jobs faster
- **Database:** Read replicas for query scaling
- **Redis:** Redis Cluster for distributed caching

### Performance Optimizations

1. **Caching Strategy:**
   - User sessions in Redis (1 hour TTL)
   - Inspection templates in Redis (24 hour TTL)
   - ACC project metadata in Redis (1 hour TTL)

2. **Database Indexing:**
   - Tenant ID on all tables
   - Document status for filtering
   - Inspection date for reporting
   - Full-text search on extracted data

3. **Async Processing:**
   - All heavy operations (parsing, ML inference) in Celery
   - Non-blocking API responses
   - Progress tracking via polling or WebSockets

### Cost Optimization

- **Storage Tiering:** Move old documents to cheaper storage (S3 Glacier)
- **ML Model Caching:** Cache model predictions for similar documents
- **Database Archiving:** Archive old inspections to separate tables
- **CDN:** Serve static assets from CDN

## Deployment Architecture

### Development

```
Docker Compose:
  - api (FastAPI)
  - scraper-worker (Celery)
  - postgres
  - redis
  - frontend-scraper (React dev server)
  - frontend-inspection (React dev server)
```

### Production (Kubernetes)

```
Kubernetes Cluster:
  - Ingress (HTTPS termination, routing)
  - API Deployment (3+ replicas)
  - Scraper Worker Deployment (5+ replicas)
  - Frontend Deployment (Nginx serving static files)
  - PostgreSQL (Managed service: RDS, Cloud SQL)
  - Redis (Managed service: ElastiCache, MemoryStore)
  - S3 (Object storage)
```

## Monitoring & Observability

### Metrics to Track

- **API Performance:** Request latency, error rates
- **Scraping Success Rate:** % of documents successfully parsed
- **ML Model Accuracy:** Extraction confidence scores
- **User Engagement:** Active users, inspections per day
- **System Health:** CPU, memory, disk usage
- **Cost Metrics:** API calls, storage usage, compute time

### Logging Strategy

```python
import structlog

logger = structlog.get_logger()

logger.info(
    "document_scraped",
    tenant_id=tenant_id,
    document_id=document_id,
    extraction_time_ms=elapsed_ms,
    confidence_score=confidence,
)
```

## Future Enhancements

### Phase 1 Enhancements
- Real-time collaboration on inspections
- Advanced analytics dashboard
- Custom ML model training per tenant

### Phase 2 Enhancements
- Mobile native apps (React Native)
- Voice-to-text for inspections
- AR overlay for site inspections

### Phase 3 Enhancements
- Computer vision for photo analysis
- Predictive analytics for risk assessment
- Integration with other construction platforms

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
