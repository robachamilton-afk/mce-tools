"""
Performance Assessment Engine

Calculates expected and actual performance for solar farms
based on different performance models.
"""
from datetime import datetime, date
from typing import Dict, List, Optional
from decimal import Decimal

import pandas as pd
from sqlalchemy.orm import Session

from app.models.solar_farm import SolarFarm
from app.models.scada_data import SCADAData
from app.models.meteorological_data import MeteorologicalData
from app.models.performance import PerformanceModel, PerformanceAssessment


class PerformanceEngine:
    """
    Core engine for calculating solar farm performance.
    """

    def __init__(self, db: Session):
        self.db = db

    def calculate_performance_ratio(
        self,
        solar_farm_id: str,
        model_id: str,
        start_date: date,
        end_date: date
    ) -> Dict:
        """
        Calculate the Performance Ratio (PR) for a solar farm over a time period.

        PR = (Actual Energy Output) / (Expected Energy Output)

        Args:
            solar_farm_id: UUID of the solar farm
            model_id: UUID of the performance model to use
            start_date: Start date of assessment period
            end_date: End date of assessment period

        Returns:
            Dictionary containing PR and detailed breakdown
        """
        # Fetch solar farm
        solar_farm = self.db.query(SolarFarm).filter(SolarFarm.id == solar_farm_id).first()
        if not solar_farm:
            raise ValueError(f"Solar farm {solar_farm_id} not found")

        # Fetch performance model
        model = self.db.query(PerformanceModel).filter(PerformanceModel.id == model_id).first()
        if not model:
            raise ValueError(f"Performance model {model_id} not found")

        # Get actual output from SCADA data
        actual_output_mwh = self._get_actual_output(solar_farm_id, start_date, end_date)

        # Calculate expected output based on model type
        if model.type == "contractual":
            expected_output_mwh = self._calculate_contractual_expected(
                solar_farm, model, start_date, end_date
            )
        elif model.type == "internal":
            expected_output_mwh = self._calculate_internal_expected(
                solar_farm, model, start_date, end_date
            )
        else:
            raise ValueError(f"Unknown model type: {model.type}")

        # Calculate Performance Ratio
        if expected_output_mwh > 0:
            performance_ratio = actual_output_mwh / expected_output_mwh
        else:
            performance_ratio = Decimal(0)

        # Create assessment record
        assessment = PerformanceAssessment(
            solar_farm_id=solar_farm_id,
            performance_model_id=model_id,
            start_date=start_date,
            end_date=end_date,
            expected_output_mwh=expected_output_mwh,
            actual_output_mwh=actual_output_mwh,
            performance_ratio=performance_ratio,
            assessment_details={
                "model_type": model.type,
                "model_name": model.name,
                "capacity_mw": float(solar_farm.capacity_mw),
                "days": (end_date - start_date).days,
            }
        )
        self.db.add(assessment)
        self.db.commit()

        return {
            "assessment_id": str(assessment.id),
            "performance_ratio": float(performance_ratio),
            "expected_output_mwh": float(expected_output_mwh),
            "actual_output_mwh": float(actual_output_mwh),
            "compliance": "compliant" if performance_ratio >= 0.85 else "non-compliant",
            "details": assessment.assessment_details
        }

    def _get_actual_output(self, solar_farm_id: str, start_date: date, end_date: date) -> Decimal:
        """
        Get actual energy output from SCADA data.
        SCADA values are in MW (instantaneous), need to integrate to get MWh.
        """
        scada_records = self.db.query(SCADAData).filter(
            SCADAData.solar_farm_id == solar_farm_id,
            SCADAData.settlement_date >= start_date,
            SCADAData.settlement_date < end_date
        ).all()

        if not scada_records:
            return Decimal(0)

        # Convert to pandas for easier calculation
        df = pd.DataFrame([
            {
                "timestamp": r.settlement_date,
                "power_mw": float(r.scada_value)
            }
            for r in scada_records
        ])

        # SCADA is 5-minute intervals, so energy = power * (5/60) hours
        df["energy_mwh"] = df["power_mw"] * (5 / 60)
        total_energy_mwh = df["energy_mwh"].sum()

        return Decimal(str(total_energy_mwh))

    def _calculate_contractual_expected(
        self,
        solar_farm: SolarFarm,
        model: PerformanceModel,
        start_date: date,
        end_date: date
    ) -> Decimal:
        """
        Calculate expected output based on contractual performance model.
        This typically uses a P50 or P90 energy yield from the PPA.
        """
        params = model.model_parameters

        # Example: Contract specifies annual P50 yield
        annual_p50_mwh = Decimal(str(params.get("annual_p50_mwh", 0)))

        # Pro-rate for the assessment period
        days_in_period = (end_date - start_date).days
        expected_mwh = annual_p50_mwh * (Decimal(days_in_period) / Decimal(365))

        return expected_mwh

    def _calculate_internal_expected(
        self,
        solar_farm: SolarFarm,
        model: PerformanceModel,
        start_date: date,
        end_date: date
    ) -> Decimal:
        """
        Calculate expected output based on MCE's internal performance model.
        This uses meteorological data and system parameters.
        """
        # Fetch meteorological data for the period
        met_records = self.db.query(MeteorologicalData).filter(
            MeteorologicalData.solar_farm_id == solar_farm.id,
            MeteorologicalData.timestamp >= start_date,
            MeteorologicalData.timestamp < end_date
        ).all()

        if not met_records:
            # Fallback to capacity-based estimate if no met data
            return self._capacity_based_estimate(solar_farm, start_date, end_date)

        # Convert to pandas
        df = pd.DataFrame([
            {
                "timestamp": r.timestamp,
                "poa_irradiance": float(r.poa_irradiance or 0),
                "ambient_temp": float(r.ambient_temp or 25),
                "module_temp": float(r.module_temp or 25),
            }
            for r in met_records
        ])

        # Simple performance model (can be replaced with more sophisticated models)
        params = model.model_parameters
        system_efficiency = Decimal(str(params.get("system_efficiency", 0.8)))
        temp_coeff = Decimal(str(params.get("temp_coefficient", -0.004)))  # %/°C

        # Calculate expected energy for each timestamp
        # E = (POA Irradiance * Area * Efficiency * Temp Factor) / 1000
        # Simplified: E = (POA * Capacity * Efficiency) / 1000
        capacity_kw = float(solar_farm.capacity_mw) * 1000
        df["expected_power_kw"] = (
            df["poa_irradiance"] * capacity_kw * float(system_efficiency) / 1000
        )

        # Apply temperature derating
        df["temp_factor"] = 1 + (df["module_temp"] - 25) * float(temp_coeff)
        df["expected_power_kw"] = df["expected_power_kw"] * df["temp_factor"]

        # Integrate to get energy (assuming hourly data)
        df["expected_energy_kwh"] = df["expected_power_kw"] * 1  # 1 hour
        total_energy_kwh = df["expected_energy_kwh"].sum()

        return Decimal(str(total_energy_kwh / 1000))  # Convert to MWh

    def _capacity_based_estimate(
        self,
        solar_farm: SolarFarm,
        start_date: date,
        end_date: date
    ) -> Decimal:
        """
        Fallback: Estimate expected output based on capacity and typical capacity factor.
        """
        capacity_mw = solar_farm.capacity_mw
        days = (end_date - start_date).days
        hours = Decimal(days * 24)

        # Assume typical capacity factor of 25% for solar
        capacity_factor = Decimal("0.25")

        expected_mwh = capacity_mw * hours * capacity_factor
        return expected_mwh
