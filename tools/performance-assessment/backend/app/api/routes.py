"""
FastAPI Routes for Performance Assessment Tool
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from shared.database.session import get_db
from shared.auth.dependencies import get_current_user
from app.models.solar_farm import SolarFarm
from app.models.performance import PerformanceModel, PerformanceAssessment
from app.services.performance_engine import PerformanceEngine
from app.services.scada_scraper import SCADAScraper

router = APIRouter(prefix="/api/performance", tags=["Performance Assessment"])


# Pydantic Models for Request/Response
class SolarFarmCreate(BaseModel):
    duid: str = Field(..., max_length=20)
    name: str = Field(..., max_length=255)
    region: str = Field(..., max_length=10)
    capacity_mw: float
    commissioning_date: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SolarFarmResponse(BaseModel):
    id: UUID
    duid: str
    name: str
    region: str
    capacity_mw: float
    commissioning_date: Optional[date]

    class Config:
        from_attributes = True


class PerformanceModelCreate(BaseModel):
    name: str
    type: str = Field(..., pattern="^(contractual|internal)$")
    description: Optional[str] = None
    model_parameters: dict


class PerformanceModelResponse(BaseModel):
    id: UUID
    name: str
    type: str
    description: Optional[str]
    model_parameters: dict

    class Config:
        from_attributes = True


class AssessmentRequest(BaseModel):
    solar_farm_id: UUID
    performance_model_id: UUID
    start_date: date
    end_date: date


class AssessmentResponse(BaseModel):
    assessment_id: str
    performance_ratio: float
    expected_output_mwh: float
    actual_output_mwh: float
    compliance: str
    details: dict


# Solar Farm Endpoints
@router.post("/solar-farms", response_model=SolarFarmResponse, status_code=status.HTTP_201_CREATED)
def create_solar_farm(
    farm: SolarFarmCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Register a new solar farm in the system.
    """
    # Check if DUID already exists
    existing = db.query(SolarFarm).filter(SolarFarm.duid == farm.duid).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solar farm with DUID {farm.duid} already exists"
        )
    
    solar_farm = SolarFarm(**farm.dict())
    db.add(solar_farm)
    db.commit()
    db.refresh(solar_farm)
    
    return solar_farm


@router.get("/solar-farms", response_model=List[SolarFarmResponse])
def list_solar_farms(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List all registered solar farms, optionally filtered by region.
    """
    query = db.query(SolarFarm).filter(SolarFarm.deleted_at.is_(None))
    
    if region:
        query = query.filter(SolarFarm.region == region)
    
    farms = query.all()
    return farms


@router.get("/solar-farms/{farm_id}", response_model=SolarFarmResponse)
def get_solar_farm(
    farm_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get details of a specific solar farm.
    """
    farm = db.query(SolarFarm).filter(SolarFarm.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solar farm {farm_id} not found"
        )
    
    return farm


# Performance Model Endpoints
@router.post("/models", response_model=PerformanceModelResponse, status_code=status.HTTP_201_CREATED)
def create_performance_model(
    model: PerformanceModelCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new performance model (contractual or internal).
    """
    perf_model = PerformanceModel(**model.dict())
    db.add(perf_model)
    db.commit()
    db.refresh(perf_model)
    
    return perf_model


@router.get("/models", response_model=List[PerformanceModelResponse])
def list_performance_models(
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List all performance models, optionally filtered by type.
    """
    query = db.query(PerformanceModel).filter(PerformanceModel.deleted_at.is_(None))
    
    if type:
        query = query.filter(PerformanceModel.type == type)
    
    models = query.all()
    return models


# Assessment Endpoints
@router.post("/assessments", response_model=AssessmentResponse)
def run_assessment(
    request: AssessmentRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Run a performance assessment for a solar farm.
    """
    engine = PerformanceEngine(db)
    
    try:
        result = engine.calculate_performance_ratio(
            str(request.solar_farm_id),
            str(request.performance_model_id),
            request.start_date,
            request.end_date
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/assessments", response_model=List[dict])
def list_assessments(
    solar_farm_id: Optional[UUID] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List recent performance assessments.
    """
    query = db.query(PerformanceAssessment)
    
    if solar_farm_id:
        query = query.filter(PerformanceAssessment.solar_farm_id == solar_farm_id)
    
    assessments = query.order_by(PerformanceAssessment.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": str(a.id),
            "solar_farm_id": str(a.solar_farm_id),
            "performance_model_id": str(a.performance_model_id),
            "start_date": a.start_date.isoformat(),
            "end_date": a.end_date.isoformat(),
            "performance_ratio": float(a.performance_ratio),
            "expected_output_mwh": float(a.expected_output_mwh),
            "actual_output_mwh": float(a.actual_output_mwh),
            "created_at": a.created_at.isoformat()
        }
        for a in assessments
    ]


# SCADA Data Endpoints
@router.post("/scada/scrape-latest")
def trigger_scada_scrape(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually trigger a SCADA data scrape.
    """
    scraper = SCADAScraper(db)
    result = scraper.scrape_latest()
    return result


@router.get("/dashboard/underperforming")
def get_underperforming_assets(
    threshold: float = 0.75,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get a list of underperforming solar farms based on recent performance.
    """
    # This is a placeholder - actual implementation would query assessments
    # and filter based on the threshold
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    assessments = db.query(PerformanceAssessment).filter(
        PerformanceAssessment.start_date >= start_date,
        PerformanceAssessment.performance_ratio < threshold
    ).all()
    
    underperforming = []
    for assessment in assessments:
        farm = db.query(SolarFarm).filter(SolarFarm.id == assessment.solar_farm_id).first()
        if farm:
            underperforming.append({
                "duid": farm.duid,
                "name": farm.name,
                "region": farm.region,
                "capacity_mw": float(farm.capacity_mw),
                "performance_ratio": float(assessment.performance_ratio),
                "assessment_period": f"{assessment.start_date} to {assessment.end_date}"
            })
    
    return {
        "threshold": threshold,
        "period_days": days,
        "count": len(underperforming),
        "assets": underperforming
    }
