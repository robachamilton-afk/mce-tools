# MCE Tools - Internal Consulting Tools Suite

**Main Character Energy** internal tools monorepo for supporting consulting work and project management.

## Overview

This monorepo contains a suite of interconnected tools designed to support Main Character Energy's consulting operations. All tools share common infrastructure, data models, and utilities to ensure consistency and enable data sharing across the platform.

## Tools in This Suite

### 1. **Spec Generator** (`tools/spec-generator`)
A database-driven tool that stores project specifications and assists in generating new specifications and benchmarking against historical data.

**Status:** 🔨 In Development  
**Use Case:** Internal consulting support  
**Key Features:**
- Project specification database
- Template-based spec generation
- Historical benchmarking
- Search and comparison tools

### 2. **Performance Model** (`tools/performance-model`)
Analyzes project performance data and provides comprehensive reports and assessments.

**Status:** 🔨 In Development  
**Use Case:** Internal consulting support (potential future monetization)  
**Key Features:**
- Performance data ingestion
- Statistical analysis and modeling
- Report generation
- Trend analysis and forecasting

### 3. **Risk Assessment Tool** (`tools/risk-assessment`)
A project database interrogation tool for developing risk matrices for new projects based on historical CIS (Construction Industry Scheme) data.

**Status:** 🔨 In Development  
**Use Case:** Internal consulting support (outputs are client-facing)  
**Key Features:**
- Historical risk database
- Risk matrix generation
- CIS compliance tracking
- Customizable risk parameters

### 4. **Benchmarking Database** (`tools/benchmarking-db`)
Specialized database for Technical Due Diligence (TDD) projects with benchmarking capabilities.

**Status:** 🔨 In Development  
**Use Case:** Internal consulting support  
**Key Features:**
- TDD project data storage
- Industry benchmarking
- Comparative analysis
- Data visualization

### 5. **Data Scraper** (`tools/data-scraper`)
Scrapes data from design documentation and converts it into useable data models for ACC (Autodesk Construction Cloud) integration.

**Status:** 🔨 In Development  
**Use Case:** Internal consulting support  
**Key Features:**
- Document parsing (PDF, DWG, etc.)
- Data extraction and transformation
- ACC data model generation
- Batch processing support

## Technology Stack

### Backend
- **Python 3.11+** - Core language
- **FastAPI** - Web framework and API layer
- **SQLAlchemy** - ORM for database interactions
- **Celery** - Asynchronous task processing
- **Pydantic** - Data validation and settings

### Frontend
- **React 18+** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Query** - Data fetching and caching

### Database & Caching
- **PostgreSQL 15+** - Primary database
- **Redis** - Caching and task queue

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Local development orchestration
- **Nginx** - Reverse proxy (production)

## Repository Structure

```
mce-tools/
├── docs/                          # Comprehensive documentation
│   ├── ARCHITECTURE.md            # System design and data flow
│   ├── API_CONTRACTS.md           # API endpoints and schemas
│   ├── DATABASE_SCHEMA.md         # PostgreSQL schema documentation
│   ├── DEVELOPMENT_SETUP.md       # Local development guide
│   ├── DEPLOYMENT.md              # Production deployment guide
│   └── SHARED_LIBRARIES.md        # Shared code documentation
├── tools/                         # Individual tool applications
│   ├── spec-generator/            # Spec generation tool
│   ├── performance-model/         # Performance analysis tool
│   ├── risk-assessment/           # Risk matrix tool
│   ├── benchmarking-db/           # Benchmarking database tool
│   └── data-scraper/              # Document scraper tool
├── shared/                        # Shared code across all tools
│   ├── components/                # React UI components
│   ├── styles/                    # Shared CSS and design tokens
│   ├── utils/                     # Python/JS utility functions
│   ├── database/                  # Database models and migrations
│   └── types/                     # TypeScript type definitions
├── pipelines/                     # Data processing pipelines
├── docker/                        # Docker configurations
│   ├── docker-compose.yml         # Local development setup
│   ├── docker-compose.prod.yml    # Production setup
│   ├── Dockerfile.backend         # Backend container
│   └── Dockerfile.frontend        # Frontend container
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** installed
- **Python 3.11+** (for local development without Docker)
- **Node.js 18+** and **pnpm** (for frontend development)
- **PostgreSQL 15+** (if running without Docker)
- **Redis** (if running without Docker)

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/robachamilton-afk/mce-tools.git
   cd mce-tools
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the tools:**
   - Spec Generator: http://localhost:3001
   - Performance Model: http://localhost:3002
   - Risk Assessment: http://localhost:3003
   - Benchmarking DB: http://localhost:3004
   - Data Scraper: http://localhost:3005
   - API Documentation: http://localhost:8000/docs

### Development Setup

See [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md) for detailed local development instructions.

## Documentation

- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design, data flow, and architectural decisions
- **[API Contracts](docs/API_CONTRACTS.md)** - Complete API endpoint documentation
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - PostgreSQL schema and relationships
- **[Development Setup](docs/DEVELOPMENT_SETUP.md)** - Local development environment guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Shared Libraries](docs/SHARED_LIBRARIES.md)** - Documentation for shared code

## Security & Data Privacy

This repository handles **sensitive project data** and requires strict security measures:

- ✅ All data encrypted at rest and in transit (TLS/SSL)
- ✅ JWT-based authentication for API access
- ✅ Row-level security in PostgreSQL for data isolation
- ✅ Audit logging for all data access and modifications
- ✅ Environment-based secrets management (never commit `.env`)
- ✅ Regular security updates and dependency scanning

## Contributing

This is a private internal tool suite. Development is currently limited to Main Character Energy team members and authorized AI development assistants.

### Development Workflow

1. Create a feature branch from `main`
2. Develop and test locally
3. Update relevant documentation
4. Submit pull request for review
5. Merge to `main` after approval

## License

Proprietary - All Rights Reserved  
© 2026 Main Character Energy

## Support & Contact

For questions or issues, contact the Main Character Energy development team.

---

**Last Updated:** January 2026  
**Repository:** https://github.com/robachamilton-afk/mce-tools
