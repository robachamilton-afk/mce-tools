"""
Performance Assessment Tool - Main FastAPI Application

Author: Manus AI
Date: January 12, 2026
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.performance_api import router as performance_router

# Create FastAPI app
app = FastAPI(
    title="Solar Performance Assessment API",
    description="API for contract-based and IEC 61724-compliant solar farm performance assessment",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(performance_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Solar Performance Assessment API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
