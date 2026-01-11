# MCE Tools - Shared Libraries Documentation

## Overview

The `shared/` directory contains code, components, and utilities used across multiple tools in the MCE Tools suite. This promotes code reuse, consistency, and maintainability.

## Directory Structure

```
shared/
├── components/          # React UI components
├── styles/             # CSS and design tokens
├── utils/              # Python/JS utility functions
├── database/           # Database models and migrations
├── types/              # TypeScript type definitions
├── auth/               # Authentication utilities
├── api/                # API client and helpers
└── config/             # Configuration management
```

## Backend Shared Libraries (Python)

### Database Models (`shared/database/models/`)

All SQLAlchemy models are defined here and imported by tools.

**Base Model:**

```python
# shared/database/models/base.py
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
import uuid

Base = declarative_base()

class BaseModel(Base):
    """Base model with common fields for all tables."""
    
    __abstract__ = True
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
```

**User Model:**

```python
# shared/database/models/user.py
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class User(BaseModel):
    """User account model."""
    
    __tablename__ = 'users'
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default='user', nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    projects = relationship("Project", back_populates="owner")
```

**Usage in Tools:**

```python
# In any tool's backend code
from shared.database.models import User, Project

# Query users
users = db.query(User).filter(User.is_active == True).all()
```

### Authentication (`shared/auth/`)

JWT authentication utilities.

**JWT Handler:**

```python
# shared/auth/jwt.py
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

class JWTHandler:
    """Handle JWT token creation and validation."""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_token(self, user_id: str, expiration_hours: int = 24) -> str:
        """Create JWT token for user.
        
        Args:
            user_id: User's unique identifier
            expiration_hours: Token expiration time in hours
            
        Returns:
            Encoded JWT token string
        """
        expiration = datetime.utcnow() + timedelta(hours=expiration_hours)
        payload = {
            "user_id": user_id,
            "exp": expiration,
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> dict:
        """Verify and decode JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
        """FastAPI dependency to get current user from token.
        
        Args:
            credentials: HTTP authorization credentials
            
        Returns:
            User ID from token
        """
        payload = self.verify_token(credentials.credentials)
        return payload["user_id"]
```

**Usage:**

```python
# In FastAPI route
from shared.auth import jwt_handler
from fastapi import Depends

@app.get("/api/specs/documents")
async def get_documents(user_id: str = Depends(jwt_handler.get_current_user)):
    # user_id is automatically extracted from JWT token
    documents = db.query(SpecDocument).filter_by(created_by=user_id).all()
    return documents
```

### Utilities (`shared/utils/`)

Common utility functions.

**Validation Utilities:**

```python
# shared/utils/validation.py
import re
from typing import Optional

def validate_email(email: str) -> bool:
    """Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """Validate password strength.
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    return True, None
```

**Date/Time Utilities:**

```python
# shared/utils/datetime.py
from datetime import datetime, timezone
from typing import Optional

def utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)

def format_datetime(dt: datetime, format: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime to string.
    
    Args:
        dt: Datetime object
        format: Format string
        
    Returns:
        Formatted datetime string
    """
    return dt.strftime(format)

def parse_datetime(date_string: str, format: str = "%Y-%m-%d %H:%M:%S") -> Optional[datetime]:
    """Parse datetime from string.
    
    Args:
        date_string: Date string to parse
        format: Format string
        
    Returns:
        Datetime object or None if parsing fails
    """
    try:
        return datetime.strptime(date_string, format)
    except ValueError:
        return None
```

**File Utilities:**

```python
# shared/utils/files.py
import os
from pathlib import Path
from typing import Optional

def ensure_directory(path: str) -> None:
    """Ensure directory exists, create if not.
    
    Args:
        path: Directory path
    """
    Path(path).mkdir(parents=True, exist_ok=True)

def get_file_extension(filename: str) -> str:
    """Get file extension from filename.
    
    Args:
        filename: File name
        
    Returns:
        File extension (lowercase, without dot)
    """
    return Path(filename).suffix.lower().lstrip('.')

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove or replace unsafe characters
    return "".join(c for c in filename if c.isalnum() or c in (' ', '.', '_', '-')).strip()
```

### Configuration (`shared/config/`)

Centralized configuration management.

```python
# shared/config/settings.py
from pydantic import BaseSettings, PostgresDsn, RedisDsn
from typing import List

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    postgres_host: str
    postgres_port: int = 5432
    postgres_db: str
    postgres_user: str
    postgres_password: str
    
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    # Redis
    redis_host: str
    redis_port: int = 6379
    redis_password: str = ""
    
    @property
    def redis_url(self) -> str:
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/0"
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Application
    environment: str = "development"
    debug: bool = False
    allowed_origins: List[str] = ["*"]
    
    # File Upload
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()
```

**Usage:**

```python
from shared.config import settings

# Access configuration
database_url = settings.database_url
debug_mode = settings.debug
```

## Frontend Shared Libraries (TypeScript/React)

### Type Definitions (`shared/types/`)

TypeScript interfaces and types used across frontend applications.

```typescript
// shared/types/user.ts
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'viewer';
  organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}
```

```typescript
// shared/types/project.ts
export interface Project {
  id: string;
  name: string;
  description?: string;
  project_code: string;
  status: 'active' | 'completed' | 'archived';
  owner: {
    id: string;
    full_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  user_id: string;
  full_name: string;
  role: 'owner' | 'editor' | 'member' | 'viewer';
  added_at: string;
}
```

```typescript
// shared/types/api.ts
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

### API Client (`shared/api/`)

Axios-based API client with authentication.

```typescript
// shared/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  loadToken(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.token = token;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
```

**Usage:**

```typescript
import { apiClient } from '@/shared/api/client';
import { Project, APIResponse } from '@/shared/types';

// Fetch projects
const response = await apiClient.get<APIResponse<{ projects: Project[] }>>('/api/projects');
const projects = response.data?.projects;
```

### UI Components (`shared/components/`)

Reusable React components.

**Button Component:**

```typescript
// shared/components/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
}) => {
  const baseClasses = 'rounded font-medium transition-colors focus:outline-none focus:ring-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
    disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
  }`;
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

**Input Component:**

```typescript
// shared/components/Input.tsx
import React from 'react';

interface InputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
```

**Card Component:**

```typescript
// shared/components/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
};
```

### Styles (`shared/styles/`)

Shared CSS and Tailwind configuration.

```css
/* shared/styles/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
}

body {
  @apply bg-gray-50 text-gray-900;
}

.container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}
```

```javascript
// shared/styles/tailwind.config.js
module.exports = {
  content: [
    './tools/**/frontend/src/**/*.{js,ts,jsx,tsx}',
    './shared/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
};
```

## Best Practices

### When to Add to Shared Libraries

**DO add to shared:**
- Code used by 2+ tools
- Authentication/authorization logic
- Database models
- API client utilities
- Common UI components (buttons, inputs, cards)
- Type definitions used across tools
- Validation logic
- Configuration management

**DON'T add to shared:**
- Tool-specific business logic
- Tool-specific UI components
- One-off utilities
- Experimental code

### Importing Shared Code

**Python:**

```python
# Absolute imports from shared
from shared.database.models import User, Project
from shared.auth import jwt_handler
from shared.utils.validation import validate_email
```

**TypeScript:**

```typescript
// Use path alias configured in tsconfig.json
import { User, Project } from '@/shared/types';
import { apiClient } from '@/shared/api/client';
import { Button, Input } from '@/shared/components';
```

### Versioning

Shared libraries follow semantic versioning. Breaking changes require:
1. Update all dependent tools
2. Document migration path
3. Test all tools thoroughly

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
