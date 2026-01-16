"""
SQLAlchemy Database Models

All database models for the performance assessment tool.

Author: Manus AI
Date: January 12, 2026
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


# ============================================================================
# Solar Farm Models
# ============================================================================

class SolarFarm(Base):
    """Main solar farm registry."""
    __tablename__ = "solar_farms"
    
    id = Column(Integer, primary_key=True, index=True)
    duid = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    registered_capacity_kw = Column(Float, nullable=False)
    dc_capacity_kw = Column(Float)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    commissioning_date = Column(Date)
    status = Column(String(50), default="OPERATING")
    is_inferred = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    module_specs = relationship("PVModuleSpec", back_populates="solar_farm", uselist=False)
    inverter_specs = relationship("InverterSpec", back_populates="solar_farm", uselist=False)
    array_specs = relationship("ArraySpec", back_populates="solar_farm", uselist=False)
    assessments = relationship("PerformanceAssessmentResult", back_populates="solar_farm")
    contracts = relationship("Contract", back_populates="solar_farm")


class PVModuleSpec(Base):
    """PV module specifications."""
    __tablename__ = "pv_module_specs"
    
    id = Column(Integer, primary_key=True, index=True)
    solar_farm_id = Column(Integer, ForeignKey("solar_farms.id"), nullable=False)
    manufacturer = Column(String(255))
    model = Column(String(255))
    technology = Column(String(50))
    power_stc_w = Column(Float)
    temp_coeff_power = Column(Float)
    is_inferred = Column(Boolean, default=False)
    
    # Relationship
    solar_farm = relationship("SolarFarm", back_populates="module_specs")


class InverterSpec(Base):
    """Inverter specifications."""
    __tablename__ = "inverter_specs"
    
    id = Column(Integer, primary_key=True, index=True)
    solar_farm_id = Column(Integer, ForeignKey("solar_farms.id"), nullable=False)
    manufacturer = Column(String(255))
    model = Column(String(255))
    efficiency = Column(Float)
    is_inferred = Column(Boolean, default=False)
    
    # Relationship
    solar_farm = relationship("SolarFarm", back_populates="inverter_specs")


class ArraySpec(Base):
    """Array physical specifications."""
    __tablename__ = "array_specs"
    
    id = Column(Integer, primary_key=True, index=True)
    solar_farm_id = Column(Integer, ForeignKey("solar_farms.id"), nullable=False)
    tilt_angle = Column(Float)
    azimuth_angle = Column(Float)
    tracker_type = Column(String(50))
    is_inferred = Column(Boolean, default=False)
    
    # Relationship
    solar_farm = relationship("SolarFarm", back_populates="array_specs")


# ============================================================================
# Performance Assessment Models
# ============================================================================

class PerformanceAssessmentResult(Base):
    """Results from IEC 61724 performance assessments."""
    __tablename__ = "performance_assessment_results"
    
    id = Column(Integer, primary_key=True, index=True)
    solar_farm_id = Column(Integer, ForeignKey("solar_farms.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    period = Column(String(20), nullable=False)  # HOURLY, DAILY, MONTHLY
    
    # Performance metrics
    performance_ratio = Column(Float)
    temp_corrected_pr = Column(Float)
    final_yield = Column(Float)
    reference_yield = Column(Float)
    array_yield = Column(Float)
    array_capture_loss = Column(Float)
    system_loss = Column(Float)
    capacity_factor = Column(Float)
    
    # Data quality
    data_completeness = Column(Float)
    confidence = Column(String(20))
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationship
    solar_farm = relationship("SolarFarm", back_populates="assessments")


# ============================================================================
# Contract Models
# ============================================================================

class Contract(Base):
    """Performance contracts."""
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    solar_farm_id = Column(Integer, ForeignKey("solar_farms.id"), nullable=False)
    pdf_file_path = Column(String(512))
    raw_text = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    solar_farm = relationship("SolarFarm", back_populates="contracts")
    performance_models = relationship("PerformanceModel", back_populates="contract")


class PerformanceModel(Base):
    """Parsed performance models from contracts."""
    __tablename__ = "performance_models"
    
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    model_json = Column(JSON, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    contract = relationship("Contract", back_populates="performance_models")
    compliance_assessments = relationship("ComplianceAssessment", back_populates="performance_model")


class ComplianceAssessment(Base):
    """Contract compliance assessment results."""
    __tablename__ = "compliance_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    performance_model_id = Column(Integer, ForeignKey("performance_models.id"), nullable=False)
    assessment_period_start = Column(DateTime, nullable=False)
    assessment_period_end = Column(DateTime, nullable=False)
    status = Column(String(50), nullable=False)  # RUNNING, COMPLETED, FAILED
    compliance_status = Column(String(50))  # PASS, FAIL, INDETERMINATE
    results_json = Column(JSON)
    report_file_path = Column(String(512))
    created_at = Column(DateTime, default=func.now())
    
    # Relationship
    performance_model = relationship("PerformanceModel", back_populates="compliance_assessments")


# ============================================================================
# AEMO Data Models (for metadata, actual data in time-series DB)
# ============================================================================

class AEMODataSync(Base):
    """Track AEMO data synchronization status."""
    __tablename__ = "aemo_data_syncs"
    
    id = Column(Integer, primary_key=True, index=True)
    duid = Column(String(10), index=True)
    data_type = Column(String(50), nullable=False)  # SCADA, DISPATCH, etc.
    last_sync_timestamp = Column(DateTime)
    last_sync_status = Column(String(50))  # SUCCESS, FAILED
    last_sync_message = Column(Text)
    records_synced = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
