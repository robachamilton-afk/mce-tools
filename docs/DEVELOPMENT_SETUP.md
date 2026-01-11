# MCE Tools - Development Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed on your development machine:

### Required Software

- **Docker** (20.10+) and **Docker Compose** (2.0+)
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)
  - Verify: `docker --version` and `docker-compose --version`

- **Git** (2.30+)
  - Verify: `git --version`

- **Python** (3.11+) - for local development without Docker
  - [Install Python](https://www.python.org/downloads/)
  - Verify: `python3 --version`

- **Node.js** (18+) and **pnpm** - for frontend development
  - [Install Node.js](https://nodejs.org/)
  - Install pnpm: `npm install -g pnpm`
  - Verify: `node --version` and `pnpm --version`

- **PostgreSQL** (15+) - if running without Docker
  - [Install PostgreSQL](https://www.postgresql.org/download/)

- **Redis** (7+) - if running without Docker
  - [Install Redis](https://redis.io/download)

### Recommended Tools

- **VS Code** or **PyCharm** - IDE with Python support
- **Postman** or **Insomnia** - API testing
- **pgAdmin** or **DBeaver** - Database management
- **GitHub CLI** (`gh`) - for repository management

## Quick Start with Docker (Recommended)

This is the fastest way to get the entire stack running locally.

### 1. Clone the Repository

```bash
git clone https://github.com/robachamilton-afk/mce-tools.git
cd mce-tools
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=mce_tools
POSTGRES_USER=mce_user
POSTGRES_PASSWORD=your_secure_password_here

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# JWT Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Application
ENVIRONMENT=development
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# File Storage
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE_MB=100

# ACC Integration (optional)
ACC_API_KEY=your_acc_api_key_here
ACC_PROJECT_ID=your_acc_project_id_here
```

### 3. Start All Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Backend API (port 8000)
- Frontend applications (ports 3001-3005)
- Celery worker (background tasks)

### 4. Initialize Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head

# (Optional) Seed with sample data
docker-compose exec backend python scripts/seed_data.py
```

### 5. Access the Applications

- **API Documentation:** http://localhost:8000/docs
- **Spec Generator:** http://localhost:3001
- **Performance Model:** http://localhost:3002
- **Risk Assessment:** http://localhost:3003
- **Benchmarking DB:** http://localhost:3004
- **Data Scraper:** http://localhost:3005

### 6. Create Admin User

```bash
docker-compose exec backend python scripts/create_admin.py
```

Follow the prompts to create an admin account.

## Local Development Without Docker

If you prefer to run services locally without Docker:

### 1. Set Up Python Virtual Environment

```bash
cd mce-tools
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up PostgreSQL Database

```bash
# Create database
createdb mce_tools

# Or using psql
psql -U postgres
CREATE DATABASE mce_tools;
CREATE USER mce_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mce_tools TO mce_user;
\q
```

### 4. Set Up Redis

```bash
# Start Redis server
redis-server

# Or on macOS with Homebrew
brew services start redis
```

### 5. Configure Environment Variables

Create `.env` file with local configuration:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mce_tools
POSTGRES_USER=mce_user
POSTGRES_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379

# ... (rest of configuration)
```

### 6. Run Database Migrations

```bash
alembic upgrade head
```

### 7. Start Backend Server

```bash
uvicorn shared.main:app --reload --host 0.0.0.0 --port 8000
```

### 8. Start Celery Worker (in separate terminal)

```bash
celery -A shared.celery_app worker --loglevel=info
```

### 9. Set Up Frontend Applications

For each tool (e.g., spec-generator):

```bash
cd tools/spec-generator/frontend
pnpm install
pnpm dev
```

Repeat for other tools, adjusting ports as needed.

## Development Workflow

### Making Changes to Backend

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes to Python code** in:
   - `shared/` - shared utilities and models
   - `tools/{tool-name}/backend/` - tool-specific backend code

3. **Run tests:**
   ```bash
   pytest
   ```

4. **Check code quality:**
   ```bash
   # Format code
   black .
   
   # Check linting
   flake8
   
   # Type checking
   mypy .
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

### Making Changes to Frontend

1. **Navigate to tool frontend:**
   ```bash
   cd tools/spec-generator/frontend
   ```

2. **Make changes to React/TypeScript code**

3. **Run linting and type checking:**
   ```bash
   pnpm lint
   pnpm type-check
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

### Database Migrations

When you modify database models:

1. **Generate migration:**
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```

2. **Review generated migration** in `alembic/versions/`

3. **Apply migration:**
   ```bash
   alembic upgrade head
   ```

4. **Rollback if needed:**
   ```bash
   alembic downgrade -1
   ```

### Adding a New Tool

1. **Create directory structure:**
   ```bash
   mkdir -p tools/new-tool/backend
   mkdir -p tools/new-tool/frontend
   ```

2. **Set up backend:**
   ```bash
   cd tools/new-tool/backend
   # Create main.py, routes.py, models.py, etc.
   ```

3. **Set up frontend:**
   ```bash
   cd tools/new-tool/frontend
   pnpm create vite . --template react-ts
   pnpm install
   pnpm add tailwindcss @tanstack/react-query axios
   ```

4. **Update Docker Compose** to include new services

5. **Document in README.md** and update API_CONTRACTS.md

## Testing

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=shared --cov=tools

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_login_success
```

### Frontend Tests

```bash
cd tools/spec-generator/frontend

# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pytest tests/integration/

# Tear down
docker-compose -f docker-compose.test.yml down
```

## Debugging

### Backend Debugging

**Using VS Code:**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "shared.main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
      ],
      "jinja": true,
      "justMyCode": false
    }
  ]
}
```

**Using pdb:**

Add breakpoint in code:

```python
import pdb; pdb.set_trace()
```

### Frontend Debugging

**Using Browser DevTools:**
- Open Chrome/Firefox DevTools (F12)
- Use React DevTools extension
- Check Console for errors
- Use Network tab for API calls

**Using VS Code:**

Install "Debugger for Chrome" extension and create launch configuration.

### Database Debugging

**View logs:**

```bash
docker-compose logs postgres
```

**Connect to database:**

```bash
# Using psql
docker-compose exec postgres psql -U mce_user -d mce_tools

# Or connect from host
psql -h localhost -U mce_user -d mce_tools
```

**Query slow queries:**

```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### Celery Debugging

**View worker logs:**

```bash
docker-compose logs celery-worker
```

**Monitor tasks:**

```bash
# Install flower (Celery monitoring tool)
pip install flower

# Start flower
celery -A shared.celery_app flower
```

Access at http://localhost:5555

## Common Issues & Solutions

### Issue: Docker containers won't start

**Solution:**
```bash
# Check logs
docker-compose logs

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Issue: Database connection refused

**Solution:**
- Check PostgreSQL is running: `docker-compose ps`
- Verify credentials in `.env`
- Check PostgreSQL logs: `docker-compose logs postgres`

### Issue: Frontend can't connect to backend

**Solution:**
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in backend `.env`
- Check frontend API base URL configuration

### Issue: Celery tasks not processing

**Solution:**
- Check Celery worker is running: `docker-compose ps celery-worker`
- Check Redis connection: `redis-cli ping`
- View Celery logs: `docker-compose logs celery-worker`

### Issue: Port already in use

**Solution:**
```bash
# Find process using port
lsof -i :8000  # On macOS/Linux
netstat -ano | findstr :8000  # On Windows

# Kill process or change port in docker-compose.yml
```

## Code Style & Standards

### Python

- **Style Guide:** PEP 8
- **Formatter:** Black (line length: 100)
- **Linter:** Flake8
- **Type Checker:** MyPy
- **Docstrings:** Google style

**Example:**

```python
from typing import List, Optional
from pydantic import BaseModel


class User(BaseModel):
    """User model representing a system user.
    
    Attributes:
        id: Unique identifier for the user.
        email: User's email address.
        full_name: User's full name.
    """
    
    id: str
    email: str
    full_name: str
    
    def get_display_name(self) -> str:
        """Get user's display name.
        
        Returns:
            The user's full name or email if name is not set.
        """
        return self.full_name or self.email
```

### TypeScript/React

- **Style Guide:** Airbnb TypeScript Style Guide
- **Formatter:** Prettier
- **Linter:** ESLint
- **Component Style:** Functional components with hooks

**Example:**

```typescript
import React, { useState, useEffect } from 'react';
import { User } from '@/types';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId);
  }, [userId]);

  const fetchUser = async (id: string) => {
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h2>{user.full_name}</h2>
      <p>{user.email}</p>
    </div>
  );
};
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_HOST` | PostgreSQL host | `localhost` | Yes |
| `POSTGRES_PORT` | PostgreSQL port | `5432` | Yes |
| `POSTGRES_DB` | Database name | `mce_tools` | Yes |
| `POSTGRES_USER` | Database user | `mce_user` | Yes |
| `POSTGRES_PASSWORD` | Database password | - | Yes |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `JWT_SECRET_KEY` | JWT signing key | - | Yes |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` | No |
| `JWT_EXPIRATION_HOURS` | Token expiration | `24` | No |
| `ENVIRONMENT` | Environment name | `development` | No |
| `DEBUG` | Debug mode | `False` | No |
| `ALLOWED_ORIGINS` | CORS origins | `*` | No |

## Additional Resources

- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **React Documentation:** https://react.dev/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Docker Documentation:** https://docs.docker.com/
- **Celery Documentation:** https://docs.celeryq.dev/

## Getting Help

- **Internal Documentation:** Check `/docs` folder
- **API Documentation:** http://localhost:8000/docs (when running)
- **GitHub Issues:** Report bugs and request features
- **Team Chat:** Contact development team

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
