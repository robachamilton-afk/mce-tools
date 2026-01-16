"""
SCADA Data Database Models
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, BigInteger, Numeric, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from shared.database.base import Base


class SCADAData(Base):
    """
    Stores time-series SCADA data for solar farms.
    Downloaded from AEMO NEMWEB every 5 minutes.
    """
    __tablename__ = "perf_scada_data"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    solar_farm_id = Column(PGUUID(as_uuid=True), ForeignKey("perf_solar_farms.id"), nullable=False)
    settlement_date = Column(TIMESTAMP, nullable=False)
    scada_value = Column(Numeric(12, 4), nullable=False)
    last_changed = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    solar_farm = relationship("SolarFarm", back_populates="scada_data")

    def __repr__(self):
        return f"<SCADAData(solar_farm_id={self.solar_farm_id}, settlement_date={self.settlement_date}, value={self.scada_value}MW)>"


__table_args__ = (
    Index("idx_perf_scada_data_farm_time", "solar_farm_id", "settlement_date"),
)
