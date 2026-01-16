"""
Meteorological Data Database Models
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, BigInteger, Numeric, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from shared.database.base import Base


class MeteorologicalData(Base):
    """
    Stores meteorological data for solar farms.
    Used for performance modeling and assessment.
    """
    __tablename__ = "perf_meteorological_data"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    solar_farm_id = Column(PGUUID(as_uuid=True), ForeignKey("perf_solar_farms.id"), nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False)
    ghi = Column(Numeric(10, 4), nullable=True, comment="Global Horizontal Irradiance (W/m²)")
    poa_irradiance = Column(Numeric(10, 4), nullable=True, comment="Plane of Array Irradiance (W/m²)")
    ambient_temp = Column(Numeric(6, 2), nullable=True, comment="Ambient Temperature (°C)")
    module_temp = Column(Numeric(6, 2), nullable=True, comment="Module Temperature (°C)")
    wind_speed = Column(Numeric(6, 2), nullable=True, comment="Wind Speed (m/s)")
    metadata = Column(JSONB, default={})
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    solar_farm = relationship("SolarFarm", back_populates="meteorological_data")

    def __repr__(self):
        return f"<MeteorologicalData(solar_farm_id={self.solar_farm_id}, timestamp={self.timestamp}, ghi={self.ghi})>"


__table_args__ = (
    Index("idx_perf_met_data_farm_time", "solar_farm_id", "timestamp"),
)
