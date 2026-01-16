"""
CRUD Operations

Database operations for all models.

Author: Manus AI
Date: January 12, 2026
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from . import models


# ============================================================================
# Solar Farm CRUD
# ============================================================================

def create_solar_farm(
    db: Session,
    duid: str,
    name: str,
    ac_capacity_kw: float,
    latitude: float,
    longitude: float,
    dc_capacity_kw: Optional[float] = None,
    commissioning_date: Optional[date] = None,
    is_inferred: bool = False
) -> models.SolarFarm:
    """Create a new solar farm record."""
    farm = models.SolarFarm(
        duid=duid,
        name=name,
        registered_capacity_kw=ac_capacity_kw,
        dc_capacity_kw=dc_capacity_kw,
        latitude=latitude,
        longitude=longitude,
        commissioning_date=commissioning_date,
        is_inferred=is_inferred
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


def get_solar_farm_by_duid(db: Session, duid: str) -> Optional[models.SolarFarm]:
    """Get a solar farm by DUID."""
    return db.query(models.SolarFarm).filter(models.SolarFarm.duid == duid).first()


def get_solar_farm_by_id(db: Session, farm_id: int) -> Optional[models.SolarFarm]:
    """Get a solar farm by ID."""
    return db.query(models.SolarFarm).filter(models.SolarFarm.id == farm_id).first()


def list_solar_farms(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None
) -> List[models.SolarFarm]:
    """List all solar farms with optional filtering."""
    query = db.query(models.SolarFarm)
    if status:
        query = query.filter(models.SolarFarm.status == status)
    return query.offset(skip).limit(limit).all()


def update_solar_farm(
    db: Session,
    farm_id: int,
    **kwargs
) -> Optional[models.SolarFarm]:
    """Update a solar farm record."""
    farm = get_solar_farm_by_id(db, farm_id)
    if not farm:
        return None
    
    for key, value in kwargs.items():
        if hasattr(farm, key):
            setattr(farm, key, value)
    
    db.commit()
    db.refresh(farm)
    return farm


# ============================================================================
# Module/Inverter/Array Specs CRUD
# ============================================================================

def create_module_spec(
    db: Session,
    solar_farm_id: int,
    technology: str,
    temp_coeff_power: float,
    is_inferred: bool = False,
    **kwargs
) -> models.PVModuleSpec:
    """Create module specifications."""
    spec = models.PVModuleSpec(
        solar_farm_id=solar_farm_id,
        technology=technology,
        temp_coeff_power=temp_coeff_power,
        is_inferred=is_inferred,
        **kwargs
    )
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec


def create_inverter_spec(
    db: Session,
    solar_farm_id: int,
    efficiency: float,
    is_inferred: bool = False,
    **kwargs
) -> models.InverterSpec:
    """Create inverter specifications."""
    spec = models.InverterSpec(
        solar_farm_id=solar_farm_id,
        efficiency=efficiency,
        is_inferred=is_inferred,
        **kwargs
    )
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec


def create_array_spec(
    db: Session,
    solar_farm_id: int,
    tilt_angle: Optional[float],
    azimuth_angle: Optional[float],
    tracker_type: str,
    is_inferred: bool = False
) -> models.ArraySpec:
    """Create array specifications."""
    spec = models.ArraySpec(
        solar_farm_id=solar_farm_id,
        tilt_angle=tilt_angle,
        azimuth_angle=azimuth_angle,
        tracker_type=tracker_type,
        is_inferred=is_inferred
    )
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return spec


# ============================================================================
# Performance Assessment CRUD
# ============================================================================

def create_assessment_result(
    db: Session,
    solar_farm_id: int,
    timestamp: datetime,
    period: str,
    metrics: dict
) -> models.PerformanceAssessmentResult:
    """Create a performance assessment result."""
    result = models.PerformanceAssessmentResult(
        solar_farm_id=solar_farm_id,
        timestamp=timestamp,
        period=period,
        **metrics
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def get_assessment_results(
    db: Session,
    solar_farm_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    period: Optional[str] = None
) -> List[models.PerformanceAssessmentResult]:
    """Get assessment results for a solar farm."""
    query = db.query(models.PerformanceAssessmentResult).filter(
        models.PerformanceAssessmentResult.solar_farm_id == solar_farm_id
    )
    
    if start_date:
        query = query.filter(models.PerformanceAssessmentResult.timestamp >= start_date)
    if end_date:
        query = query.filter(models.PerformanceAssessmentResult.timestamp <= end_date)
    if period:
        query = query.filter(models.PerformanceAssessmentResult.period == period)
    
    return query.order_by(models.PerformanceAssessmentResult.timestamp).all()


# ============================================================================
# Contract CRUD
# ============================================================================

def create_contract(
    db: Session,
    name: str,
    solar_farm_id: int,
    pdf_file_path: Optional[str] = None,
    raw_text: Optional[str] = None
) -> models.Contract:
    """Create a new contract."""
    contract = models.Contract(
        name=name,
        solar_farm_id=solar_farm_id,
        pdf_file_path=pdf_file_path,
        raw_text=raw_text
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


def get_contract_by_id(db: Session, contract_id: int) -> Optional[models.Contract]:
    """Get a contract by ID."""
    return db.query(models.Contract).filter(models.Contract.id == contract_id).first()


def create_performance_model(
    db: Session,
    contract_id: int,
    model_json: dict,
    version: int = 1
) -> models.PerformanceModel:
    """Create a performance model from parsed contract."""
    model = models.PerformanceModel(
        contract_id=contract_id,
        model_json=model_json,
        version=version
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def get_latest_performance_model(
    db: Session,
    contract_id: int
) -> Optional[models.PerformanceModel]:
    """Get the latest version of a performance model."""
    return db.query(models.PerformanceModel).filter(
        models.PerformanceModel.contract_id == contract_id
    ).order_by(models.PerformanceModel.version.desc()).first()


def create_compliance_assessment(
    db: Session,
    performance_model_id: int,
    start_date: datetime,
    end_date: datetime,
    status: str = "RUNNING"
) -> models.ComplianceAssessment:
    """Create a compliance assessment."""
    assessment = models.ComplianceAssessment(
        performance_model_id=performance_model_id,
        assessment_period_start=start_date,
        assessment_period_end=end_date,
        status=status
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


def update_compliance_assessment(
    db: Session,
    assessment_id: int,
    **kwargs
) -> Optional[models.ComplianceAssessment]:
    """Update a compliance assessment."""
    assessment = db.query(models.ComplianceAssessment).filter(
        models.ComplianceAssessment.id == assessment_id
    ).first()
    
    if not assessment:
        return None
    
    for key, value in kwargs.items():
        if hasattr(assessment, key):
            setattr(assessment, key, value)
    
    db.commit()
    db.refresh(assessment)
    return assessment


# ============================================================================
# AEMO Data Sync CRUD
# ============================================================================

def create_or_update_sync_status(
    db: Session,
    duid: str,
    data_type: str,
    status: str,
    message: Optional[str] = None,
    records_synced: Optional[int] = None
) -> models.AEMODataSync:
    """Create or update AEMO data sync status."""
    sync = db.query(models.AEMODataSync).filter(
        models.AEMODataSync.duid == duid,
        models.AEMODataSync.data_type == data_type
    ).first()
    
    if sync:
        # Update existing
        sync.last_sync_timestamp = datetime.now()
        sync.last_sync_status = status
        sync.last_sync_message = message
        sync.records_synced = records_synced
    else:
        # Create new
        sync = models.AEMODataSync(
            duid=duid,
            data_type=data_type,
            last_sync_timestamp=datetime.now(),
            last_sync_status=status,
            last_sync_message=message,
            records_synced=records_synced
        )
        db.add(sync)
    
    db.commit()
    db.refresh(sync)
    return sync


def get_sync_status(
    db: Session,
    duid: Optional[str] = None,
    data_type: Optional[str] = None
) -> List[models.AEMODataSync]:
    """Get AEMO data sync status."""
    query = db.query(models.AEMODataSync)
    
    if duid:
        query = query.filter(models.AEMODataSync.duid == duid)
    if data_type:
        query = query.filter(models.AEMODataSync.data_type == data_type)
    
    return query.order_by(models.AEMODataSync.last_sync_timestamp.desc()).all()
