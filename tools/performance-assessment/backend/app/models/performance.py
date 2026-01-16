"""
Performance Model and Assessment Database Models
"""
from datetime import datetime, date
from uuid import UUID, uuid4

from sqlalchemy import Column, String, Text, Numeric, Date, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from shared.database.base import Base


class PerformanceModel(Base):
    """
    Stores performance model parameters.
    Can be contractual (from PPA) or internal (MCE proprietary).
    """
    __tablename__ = "perf_performance_models"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, comment="'contractual' or 'internal'")
    description = Column(Text, nullable=True)
    model_parameters = Column(JSONB, nullable=False, comment="Model-specific parameters (JSON)")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(TIMESTAMP, nullable=True)

    # Relationships
    assessments = relationship("PerformanceAssessment", back_populates="performance_model")

    def __repr__(self):
        return f"<PerformanceModel(name={self.name}, type={self.type})>"


class PerformanceAssessment(Base):
    """
    Stores the results of performance assessments.
    Links a solar farm, performance model, and time period.
    """
    __tablename__ = "perf_assessments"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    solar_farm_id = Column(PGUUID(as_uuid=True), ForeignKey("perf_solar_farms.id"), nullable=False)
    performance_model_id = Column(PGUUID(as_uuid=True), ForeignKey("perf_performance_models.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    expected_output_mwh = Column(Numeric(12, 4), nullable=False)
    actual_output_mwh = Column(Numeric(12, 4), nullable=False)
    performance_ratio = Column(Numeric(5, 4), nullable=False, comment="PR = Actual / Expected")
    assessment_details = Column(JSONB, default={}, comment="Detailed breakdown of assessment")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    solar_farm = relationship("SolarFarm", back_populates="assessments")
    performance_model = relationship("PerformanceModel", back_populates="assessments")

    def __repr__(self):
        return f"<PerformanceAssessment(solar_farm_id={self.solar_farm_id}, PR={self.performance_ratio})>"


__table_args__ = (
    Index("idx_perf_assessments_farm_model", "solar_farm_id", "performance_model_id"),
)
