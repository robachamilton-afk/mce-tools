"""
Parameter Inference Engine

This module infers technical parameters for solar farms where detailed
specifications are not available (e.g., scraped projects from AEMO data).

Author: Manus AI
Date: January 12, 2026
"""

from typing import Dict, Optional
from datetime import datetime
import math


class ParameterInferenceEngine:
    """
    Infers technical parameters for solar farms based on limited information.
    
    Uses heuristics, industry standards, and geographical data to estimate
    parameters required for IEC 61724 performance calculations.
    """
    
    # Module technology evolution over time
    MODULE_TECH_BY_YEAR = {
        (2010, 2015): {
            'technology': 'poly-Si',
            'temp_coeff_power': -0.45,
            'efficiency': 0.15
        },
        (2015, 2019): {
            'technology': 'poly-Si',
            'temp_coeff_power': -0.42,
            'efficiency': 0.17
        },
        (2019, 2022): {
            'technology': 'mono-Si PERC',
            'temp_coeff_power': -0.40,
            'efficiency': 0.19
        },
        (2022, 2030): {
            'technology': 'mono-Si PERC/TOPCon',
            'temp_coeff_power': -0.38,
            'efficiency': 0.21
        }
    }
    
    # Typical system losses by component
    TYPICAL_LOSSES = {
        'soiling': 0.02,  # 2%
        'mismatch': 0.02,  # 2%
        'wiring_dc': 0.02,  # 2%
        'inverter': 0.03,  # 3%
        'transformer': 0.01,  # 1%
        'wiring_ac': 0.01,  # 1%
        'availability': 0.02,  # 2%
        'degradation_per_year': 0.005  # 0.5% per year
    }
    
    @staticmethod
    def infer_tilt_angle(latitude: float) -> float:
        """
        Infer optimal tilt angle based on latitude.
        
        For fixed-tilt systems in Australia:
        - Optimal tilt ≈ latitude for year-round production
        - Many farms use latitude - 10° to favor summer production
        
        Args:
            latitude: Site latitude in degrees
            
        Returns:
            Estimated tilt angle in degrees
        """
        # Use latitude as base, but cap at reasonable values
        tilt = abs(latitude)
        
        # Most Australian solar farms are between 20-35° tilt
        tilt = max(15, min(35, tilt))
        
        return round(tilt, 1)
    
    @staticmethod
    def infer_azimuth_angle(latitude: float) -> float:
        """
        Infer azimuth angle based on hemisphere.
        
        Args:
            latitude: Site latitude in degrees
            
        Returns:
            Estimated azimuth angle in degrees (0° = North, 180° = South)
        """
        # Southern hemisphere (Australia) - face North (0°)
        if latitude < 0:
            return 0.0
        # Northern hemisphere - face South (180°)
        else:
            return 180.0
    
    @staticmethod
    def infer_tracker_type(
        commissioning_year: int,
        capacity_mw: float
    ) -> str:
        """
        Infer tracker type based on commissioning year and capacity.
        
        Tracking systems became more common after 2018 for large projects.
        
        Args:
            commissioning_year: Year the farm was commissioned
            capacity_mw: Capacity in MW
            
        Returns:
            Tracker type: 'FIXED', 'SINGLE_AXIS', or 'DUAL_AXIS'
        """
        # Single-axis tracking became standard for large projects after 2018
        if commissioning_year >= 2018 and capacity_mw > 50:
            return 'SINGLE_AXIS'
        # Dual-axis is rare and expensive, only for very specific cases
        elif commissioning_year >= 2020 and capacity_mw > 200:
            # 10% chance of dual-axis for very large modern projects
            return 'SINGLE_AXIS'  # Conservative assumption
        else:
            return 'FIXED'
    
    @staticmethod
    def infer_module_specs(commissioning_date: Optional[datetime]) -> Dict:
        """
        Infer module specifications based on commissioning date.
        
        Args:
            commissioning_date: Date the farm was commissioned
            
        Returns:
            Dictionary with inferred module specs
        """
        if commissioning_date is None:
            # Use most recent technology as default
            year = datetime.now().year
        else:
            year = commissioning_date.year
        
        # Find matching technology period
        for (start_year, end_year), specs in ParameterInferenceEngine.MODULE_TECH_BY_YEAR.items():
            if start_year <= year < end_year:
                return {
                    'technology': specs['technology'],
                    'temp_coeff_power': specs['temp_coeff_power'],
                    'efficiency': specs['efficiency'],
                    'is_inferred': True
                }
        
        # Default to most recent if out of range
        return {
            'technology': 'mono-Si PERC',
            'temp_coeff_power': -0.40,
            'efficiency': 0.20,
            'is_inferred': True
        }
    
    @staticmethod
    def infer_dc_capacity(
        ac_capacity_kw: float,
        commissioning_year: int
    ) -> float:
        """
        Infer DC capacity from AC capacity based on typical DC/AC ratios.
        
        DC/AC ratio has increased over time as inverter costs decreased.
        
        Args:
            ac_capacity_kw: Registered AC capacity in kW
            commissioning_year: Year the farm was commissioned
            
        Returns:
            Estimated DC capacity in kW
        """
        # DC/AC ratio evolution
        if commissioning_year < 2015:
            dc_ac_ratio = 1.15
        elif commissioning_year < 2018:
            dc_ac_ratio = 1.20
        elif commissioning_year < 2021:
            dc_ac_ratio = 1.25
        else:
            dc_ac_ratio = 1.30
        
        return ac_capacity_kw * dc_ac_ratio
    
    @staticmethod
    def calculate_total_system_losses(
        commissioning_date: Optional[datetime],
        current_date: Optional[datetime] = None
    ) -> float:
        """
        Calculate total expected system losses including degradation.
        
        Args:
            commissioning_date: Date the farm was commissioned
            current_date: Current date (defaults to now)
            
        Returns:
            Total system losses as a decimal (0.15 = 15%)
        """
        if current_date is None:
            current_date = datetime.now()
        
        # Base losses (excluding degradation)
        base_losses = sum([
            ParameterInferenceEngine.TYPICAL_LOSSES['soiling'],
            ParameterInferenceEngine.TYPICAL_LOSSES['mismatch'],
            ParameterInferenceEngine.TYPICAL_LOSSES['wiring_dc'],
            ParameterInferenceEngine.TYPICAL_LOSSES['inverter'],
            ParameterInferenceEngine.TYPICAL_LOSSES['transformer'],
            ParameterInferenceEngine.TYPICAL_LOSSES['wiring_ac'],
            ParameterInferenceEngine.TYPICAL_LOSSES['availability']
        ])
        
        # Add degradation losses
        if commissioning_date:
            years_operating = (current_date - commissioning_date).days / 365.25
            degradation_loss = (
                years_operating * 
                ParameterInferenceEngine.TYPICAL_LOSSES['degradation_per_year']
            )
        else:
            degradation_loss = 0.0
        
        total_losses = base_losses + degradation_loss
        
        # Cap at reasonable maximum
        return min(total_losses, 0.25)
    
    @classmethod
    def infer_all_parameters(
        cls,
        duid: str,
        ac_capacity_kw: float,
        latitude: float,
        longitude: float,
        commissioning_date: Optional[datetime] = None
    ) -> Dict:
        """
        Infer all required parameters for a solar farm.
        
        Args:
            duid: AEMO Dispatchable Unit Identifier
            ac_capacity_kw: Registered AC capacity
            latitude: Site latitude
            longitude: Site longitude
            commissioning_date: Date commissioned (optional)
            
        Returns:
            Dictionary containing all inferred parameters
        """
        commissioning_year = (
            commissioning_date.year if commissioning_date 
            else datetime.now().year
        )
        capacity_mw = ac_capacity_kw / 1000.0
        
        # Infer all parameters
        tilt = cls.infer_tilt_angle(latitude)
        azimuth = cls.infer_azimuth_angle(latitude)
        tracker_type = cls.infer_tracker_type(commissioning_year, capacity_mw)
        module_specs = cls.infer_module_specs(commissioning_date)
        dc_capacity = cls.infer_dc_capacity(ac_capacity_kw, commissioning_year)
        system_losses = cls.calculate_total_system_losses(commissioning_date)
        
        # Adjust tilt for tracking systems
        if tracker_type == 'SINGLE_AXIS':
            tilt = 0.0  # Horizontal axis tracking
        elif tracker_type == 'DUAL_AXIS':
            tilt = None  # Variable
            azimuth = None  # Variable
        
        return {
            'duid': duid,
            'ac_capacity_kw': ac_capacity_kw,
            'dc_capacity_kw': dc_capacity,
            'latitude': latitude,
            'longitude': longitude,
            'commissioning_date': commissioning_date,
            'array_specs': {
                'tilt_angle': tilt,
                'azimuth_angle': azimuth,
                'tracker_type': tracker_type,
                'is_inferred': True
            },
            'module_specs': module_specs,
            'inverter_specs': {
                'efficiency': 0.98,  # Typical modern inverter
                'is_inferred': True
            },
            'system_losses': system_losses,
            'confidence': cls._calculate_confidence(commissioning_date)
        }
    
    @staticmethod
    def _calculate_confidence(commissioning_date: Optional[datetime]) -> str:
        """
        Calculate confidence level of inferred parameters.
        
        Args:
            commissioning_date: Date commissioned
            
        Returns:
            Confidence level: 'HIGH', 'MEDIUM', or 'LOW'
        """
        if commissioning_date is None:
            return 'LOW'
        
        years_since = (datetime.now() - commissioning_date).days / 365.25
        
        # More recent projects have better data and more predictable tech
        if years_since < 3:
            return 'HIGH'
        elif years_since < 7:
            return 'MEDIUM'
        else:
            return 'LOW'


# Example usage
if __name__ == "__main__":
    engine = ParameterInferenceEngine()
    
    # Example: Infer parameters for a hypothetical solar farm
    params = engine.infer_all_parameters(
        duid='EXAMPLE1',
        ac_capacity_kw=100000,  # 100 MW
        latitude=-35.3,  # Canberra region
        longitude=149.1,
        commissioning_date=datetime(2020, 6, 15)
    )
    
    print("Inferred Parameters:")
    print(f"DUID: {params['duid']}")
    print(f"AC Capacity: {params['ac_capacity_kw']/1000:.1f} MW")
    print(f"DC Capacity: {params['dc_capacity_kw']/1000:.1f} MW")
    print(f"DC/AC Ratio: {params['dc_capacity_kw']/params['ac_capacity_kw']:.2f}")
    print(f"\nArray Specs:")
    print(f"  Tilt: {params['array_specs']['tilt_angle']}°")
    print(f"  Azimuth: {params['array_specs']['azimuth_angle']}°")
    print(f"  Tracker: {params['array_specs']['tracker_type']}")
    print(f"\nModule Specs:")
    print(f"  Technology: {params['module_specs']['technology']}")
    print(f"  Temp Coeff: {params['module_specs']['temp_coeff_power']}%/°C")
    print(f"  Efficiency: {params['module_specs']['efficiency']*100:.1f}%")
    print(f"\nSystem Losses: {params['system_losses']*100:.1f}%")
    print(f"Confidence: {params['confidence']}")
