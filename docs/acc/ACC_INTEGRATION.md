# ACC Tools - Autodesk Construction Cloud Integration Guide

## Overview

This guide covers integrating ACC Tools with Autodesk Construction Cloud (ACC) using the Forge Platform APIs. The integration enables seamless document access, data model export, and real-time synchronization.

## Prerequisites

### 1. Autodesk Account
- Create an Autodesk account at https://accounts.autodesk.com/
- Subscribe to Autodesk Construction Cloud

### 2. Forge App Registration
- Go to https://forge.autodesk.com/
- Sign in with your Autodesk account
- Create a new app

### 3. App Configuration

**App Information:**
- **App Name:** ACC Tools (or your custom name)
- **App Description:** Document scraping and site inspection tools
- **Callback URL:** `https://yourdomain.com/auth/acc/callback`

**API Access:**
- ✅ Data Management API
- ✅ Model Derivative API
- ✅ BIM 360 API
- ✅ Webhooks API

**Credentials:**
After creating the app, you'll receive:
- **Client ID:** `your_client_id_here`
- **Client Secret:** `your_client_secret_here`

## Authentication Flow

### OAuth 2.0 Three-Legged Flow

This flow allows users to authorize ACC Tools to access their ACC data.

```
┌──────────┐                                  ┌──────────┐
│   User   │                                  │ ACC Tools│
└────┬─────┘                                  └────┬─────┘
     │                                             │
     │  1. Click "Login with ACC"                 │
     ├────────────────────────────────────────────>│
     │                                             │
     │  2. Redirect to Autodesk OAuth             │
     │<────────────────────────────────────────────┤
     │                                             │
┌────▼─────┐                                      │
│ Autodesk │                                      │
│  OAuth   │                                      │
└────┬─────┘                                      │
     │                                             │
     │  3. User authorizes ACC Tools              │
     │                                             │
     │  4. Redirect back with authorization code  │
     ├─────────────────────────────────────────────>│
     │                                             │
     │  5. Exchange code for access token         │
     │<────────────────────────────────────────────┤
     │                                             │
     │  6. Return access token                    │
     ├─────────────────────────────────────────────>│
     │                                             │
     │  7. User authenticated                     │
     │<────────────────────────────────────────────┤
     │                                             │
```

### Implementation

**Step 1: Redirect to Autodesk OAuth**

```python
from fastapi import APIRouter
from urllib.parse import urlencode

router = APIRouter()

@router.get("/auth/acc/login")
async def acc_login():
    """Redirect user to Autodesk OAuth."""
    
    params = {
        "response_type": "code",
        "client_id": settings.forge_client_id,
        "redirect_uri": settings.forge_callback_url,
        "scope": "data:read data:write data:create account:read",
    }
    
    auth_url = f"https://developer.api.autodesk.com/authentication/v1/authorize?{urlencode(params)}"
    
    return RedirectResponse(auth_url)
```

**Step 2: Handle Callback**

```python
import httpx

@router.get("/auth/acc/callback")
async def acc_callback(code: str):
    """Handle OAuth callback and exchange code for token."""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://developer.api.autodesk.com/authentication/v1/gettoken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": settings.forge_client_id,
                "client_secret": settings.forge_client_secret,
                "redirect_uri": settings.forge_callback_url,
            },
        )
    
    token_data = response.json()
    
    # Store tokens in database
    await store_user_tokens(
        access_token=token_data["access_token"],
        refresh_token=token_data["refresh_token"],
        expires_in=token_data["expires_in"],
    )
    
    # Create user session
    jwt_token = create_jwt_token(user_id)
    
    return {"token": jwt_token}
```

**Step 3: Refresh Token**

```python
async def refresh_acc_token(refresh_token: str) -> dict:
    """Refresh expired access token."""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://developer.api.autodesk.com/authentication/v1/refreshtoken",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.forge_client_id,
                "client_secret": settings.forge_client_secret,
            },
        )
    
    return response.json()
```

## Forge API Client

### Base Client

```python
import httpx
from typing import Optional

class ForgeClient:
    """Client for Autodesk Forge API."""
    
    BASE_URL = "https://developer.api.autodesk.com"
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, *args):
        await self.client.aclose()
    
    async def get(self, endpoint: str, **kwargs):
        """Make GET request."""
        response = await self.client.get(endpoint, **kwargs)
        response.raise_for_status()
        return response.json()
    
    async def post(self, endpoint: str, **kwargs):
        """Make POST request."""
        response = await self.client.post(endpoint, **kwargs)
        response.raise_for_status()
        return response.json()
```

## Data Management API

### List Projects

```python
async def get_acc_projects(access_token: str) -> list:
    """Get list of ACC projects user has access to."""
    
    async with ForgeClient(access_token) as client:
        # Get hubs (accounts)
        hubs = await client.get("/project/v1/hubs")
        
        projects = []
        for hub in hubs["data"]:
            # Get projects in each hub
            hub_projects = await client.get(f"/project/v1/hubs/{hub['id']}/projects")
            projects.extend(hub_projects["data"])
        
        return projects
```

### List Documents

```python
async def get_project_documents(
    access_token: str,
    project_id: str,
    folder_id: Optional[str] = None
) -> list:
    """Get documents from ACC project."""
    
    async with ForgeClient(access_token) as client:
        if not folder_id:
            # Get root folder
            folders = await client.get(f"/project/v1/hubs/{hub_id}/projects/{project_id}/topFolders")
            folder_id = folders["data"][0]["id"]
        
        # Get folder contents
        contents = await client.get(f"/data/v1/projects/{project_id}/folders/{folder_id}/contents")
        
        documents = [
            item for item in contents["data"]
            if item["type"] == "items"
        ]
        
        return documents
```

### Download Document

```python
async def download_document(
    access_token: str,
    project_id: str,
    item_id: str,
    output_path: str
) -> str:
    """Download document from ACC."""
    
    async with ForgeClient(access_token) as client:
        # Get item details
        item = await client.get(f"/data/v1/projects/{project_id}/items/{item_id}")
        
        # Get download URL
        storage_id = item["data"]["relationships"]["storage"]["data"]["id"]
        storage = await client.get(f"/data/v1/projects/{project_id}/storage/{storage_id}")
        
        download_url = storage["data"]["relationships"]["storage"]["meta"]["link"]["href"]
        
        # Download file
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(download_url)
            
            with open(output_path, "wb") as f:
                f.write(response.content)
        
        return output_path
```

## Model Derivative API

### Convert Document

```python
async def convert_document_to_pdf(
    access_token: str,
    urn: str
) -> str:
    """Convert document to PDF using Model Derivative API."""
    
    async with ForgeClient(access_token) as client:
        # Start conversion job
        job = await client.post(
            "/modelderivative/v2/designdata/job",
            json={
                "input": {
                    "urn": urn
                },
                "output": {
                    "formats": [
                        {
                            "type": "pdf",
                            "advanced": {
                                "resolution": 300
                            }
                        }
                    ]
                }
            }
        )
        
        return job["urn"]
```

### Check Conversion Status

```python
async def get_conversion_status(
    access_token: str,
    urn: str
) -> dict:
    """Check status of document conversion."""
    
    async with ForgeClient(access_token) as client:
        manifest = await client.get(f"/modelderivative/v2/designdata/{urn}/manifest")
        return manifest
```

## BIM 360 API

### Export Data to ACC

```python
async def export_to_acc_data_model(
    access_token: str,
    project_id: str,
    data: dict
) -> dict:
    """Export extracted data to ACC data model."""
    
    async with ForgeClient(access_token) as client:
        # Create or update data model
        result = await client.post(
            f"/bim360/v1/projects/{project_id}/data",
            json={
                "type": "custom_data",
                "attributes": data,
            }
        )
        
        return result
```

## Webhooks

### Register Webhook

```python
async def register_acc_webhook(
    access_token: str,
    project_id: str,
    callback_url: str,
    events: list
) -> dict:
    """Register webhook for ACC events."""
    
    async with ForgeClient(access_token) as client:
        webhook = await client.post(
            "/webhooks/v1/systems/data/events",
            json={
                "callbackUrl": callback_url,
                "scope": {
                    "folder": project_id
                },
                "hookAttribute": {
                    "events": events  # e.g., ["dm.version.added", "dm.folder.added"]
                }
            }
        )
        
        return webhook
```

### Handle Webhook Event

```python
@router.post("/webhooks/acc")
async def handle_acc_webhook(payload: dict):
    """Handle webhook events from ACC."""
    
    event_type = payload.get("hook", {}).get("event")
    
    if event_type == "dm.version.added":
        # New document version uploaded
        item_id = payload["resourceUrn"]
        await trigger_document_scraping(item_id)
    
    elif event_type == "dm.folder.added":
        # New folder created
        folder_id = payload["resourceUrn"]
        await sync_folder(folder_id)
    
    return {"status": "received"}
```

## Complete Integration Example

### Scrape Document from ACC

```python
async def scrape_acc_document(
    user_id: str,
    project_id: str,
    document_id: str
) -> dict:
    """Complete flow: download from ACC, scrape, export results."""
    
    # 1. Get user's ACC access token
    user = await get_user(user_id)
    access_token = user.acc_access_token
    
    # 2. Download document from ACC
    temp_path = f"/tmp/{document_id}.pdf"
    await download_document(access_token, project_id, document_id, temp_path)
    
    # 3. Scrape document
    extracted_data = await scrape_document(temp_path)
    
    # 4. Store in database
    scrape_result = await store_scrape_result(
        user_id=user_id,
        document_id=document_id,
        data=extracted_data
    )
    
    # 5. Export to ACC (optional)
    if user.auto_export_to_acc:
        await export_to_acc_data_model(
            access_token,
            project_id,
            extracted_data
        )
    
    return scrape_result
```

## Environment Configuration

```env
# ACC/Forge Configuration
FORGE_CLIENT_ID=your_client_id_here
FORGE_CLIENT_SECRET=your_client_secret_here
FORGE_CALLBACK_URL=https://yourdomain.com/auth/acc/callback

# Forge API Endpoints
FORGE_BASE_URL=https://developer.api.autodesk.com
FORGE_AUTH_URL=https://developer.api.autodesk.com/authentication/v1
FORGE_DATA_URL=https://developer.api.autodesk.com/data/v1
FORGE_MODEL_URL=https://developer.api.autodesk.com/modelderivative/v2

# OAuth Scopes
FORGE_SCOPES=data:read data:write data:create account:read
```

## Error Handling

```python
class ForgeAPIError(Exception):
    """Base exception for Forge API errors."""
    pass

class ForgeAuthError(ForgeAPIError):
    """Authentication/authorization error."""
    pass

class ForgeRateLimitError(ForgeAPIError):
    """Rate limit exceeded."""
    pass

async def safe_forge_request(func, *args, **kwargs):
    """Wrapper for Forge API requests with error handling."""
    
    try:
        return await func(*args, **kwargs)
    
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            # Token expired, try to refresh
            await refresh_user_token()
            return await func(*args, **kwargs)
        
        elif e.response.status_code == 429:
            # Rate limit, wait and retry
            await asyncio.sleep(60)
            return await func(*args, **kwargs)
        
        else:
            raise ForgeAPIError(f"Forge API error: {e}")
```

## Rate Limits

Forge API has rate limits:
- **Authentication:** 100 requests/minute
- **Data Management:** 100 requests/minute
- **Model Derivative:** 50 requests/minute

**Best Practices:**
- Cache access tokens (valid for 1 hour)
- Implement exponential backoff on rate limit errors
- Use webhooks instead of polling

## Testing

### Mock Forge Client

```python
class MockForgeClient:
    """Mock Forge client for testing."""
    
    async def get_acc_projects(self):
        return [
            {
                "id": "project-123",
                "name": "Test Project",
                "type": "projects"
            }
        ]
    
    async def download_document(self, project_id, item_id, output_path):
        # Return mock PDF
        with open(output_path, "wb") as f:
            f.write(b"Mock PDF content")
        return output_path
```

## Troubleshooting

### Common Issues

**1. "Invalid token" error**
- Check token expiration
- Refresh token if expired
- Verify scopes match API requirements

**2. "Forbidden" error**
- User doesn't have access to project
- Check user permissions in ACC
- Verify project ID is correct

**3. "Rate limit exceeded"**
- Implement backoff strategy
- Cache responses where possible
- Consider upgrading Forge plan

**4. Document download fails**
- Check document exists and is accessible
- Verify storage location
- Check file size limits

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
