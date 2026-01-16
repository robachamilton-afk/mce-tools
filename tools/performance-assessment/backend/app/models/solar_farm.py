"""
Solar Farm Database Models
"""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, String, Numeric, Date, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from shared.database.base import Base


class SolarFarm(Base):
    """
    Represents a solar farm in the NEM.
    """
    __tablename__ = "perf_solar_farms"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    duid = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    region = Column(String(10), nullable=False)
    capacity_mw = Column(Numeric(10, 2), nullable=False)
    commissioning_date = Column(Date, nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    metadata = Column(JSONB, default={})
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(TIMESTAMP, nullable=True)

    # Relationships
    scada_data = relationship("SCADAData", back_populates="solar_farm")
    meteorological_data = relationship("MeteorologicalData", back_populates="solar_farm")
    assessments = relationship("PerformanceAssessment", back_populates="solar_farm")

    def __repr__(self):
        return f"<SolarFarm(duid={self.duid}, name={self.name}, capacity={self.capacity_mw}MW)>"


__table_args__ = (
    Index("idx_perf_solar_farms_duid", "duid"),
    Index("idx_perf_solar_farms_project", "project_id"),
)
