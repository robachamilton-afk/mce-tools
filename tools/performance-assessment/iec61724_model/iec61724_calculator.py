"""
IEC 61724 Performance Calculation Engine

This module implements all the core performance calculations as defined by the
IEC 61724-1:2021 standard for photovoltaic system performance monitoring.

Author: Manus AI
Date: January 12, 2026
"""

from typing import Dict, List, Tuple
import pandas as pd
import numpy as np


class IEC61724Calculator:
    """
    A class containing all IEC 61724-compliant performance calculation methods.
    
    All methods are designed to work with pandas Series or numpy arrays for
    efficient time-series calculations.
    """
    
    # Constants
    REFERENCE_IRRADIANCE = 1.0  # kW/m²
    STC_TEMPERATURE = 25.0  # °C
    
    @staticmethod
    def calculate_reference_yield(
        poa_irradiance: pd.Series,
        interval_hours: float = 1.0
    ) -> pd.Series:
        """
        Calculate the reference yield (Yr) as per IEC 61724.
        
        Yr = H_i / G_ref
        
        where:
        - H_i is the in-plane irradiation (kWh/m²) for the period
        - G_ref is the reference irradiance (1.0 kW/m²)
        
        Args:
            poa_irradiance: Plane-of-array irradiance in W/m²
            interval_hours: The time interval of each measurement in hours
            
        Returns:
            Reference yield in hours
        """
        # Convert W/m² to kW/m²
        poa_irradiance_kw = poa_irradiance / 1000.0
        
        # Calculate irradiation (energy) over the interval
        irradiation_kwh_m2 = poa_irradiance_kw * interval_hours
        
        # Calculate reference yield
        reference_yield = irradiation_kwh_m2 / IEC61724Calculator.REFERENCE_IRRADIANCE
        
        return reference_yield
    
    @staticmethod
    def calculate_array_yield(
        dc_energy_kwh: pd.Series,
        array_capacity_kw: float
    ) -> pd.Series:
        """
        Calculate the PV array energy yield (Ya) as per IEC 61724.
        
        Ya = E_A / P_0
        
        where:
        - E_A is the DC energy output from the PV array (kWh)
        - P_0 is the rated DC power of the array at STC (kW)
        
        Args:
            dc_energy_kwh: DC energy output in kWh
            array_capacity_kw: Rated DC capacity in kW
            
        Returns:
            Array yield in hours
        """
        return dc_energy_kwh / array_capacity_kw
    
    @staticmethod
    def calculate_final_yield(
        ac_energy_kwh: pd.Series,
        array_capacity_kw: float
    ) -> pd.Series:
        """
        Calculate the final system yield (Yf) as per IEC 61724.
        
        Yf = E_AC / P_0
        
        where:
        - E_AC is the AC energy output from the inverter (kWh)
        - P_0 is the rated DC power of the array at STC (kW)
        
        Args:
            ac_energy_kwh: AC energy output in kWh
            array_capacity_kw: Rated DC capacity in kW
            
        Returns:
            Final yield in hours
        """
        return ac_energy_kwh / array_capacity_kw
    
    @staticmethod
    def calculate_performance_ratio(
        final_yield: pd.Series,
        reference_yield: pd.Series
    ) -> pd.Series:
        """
        Calculate the AC performance ratio (PR) as per IEC 61724.
        
        PR_AC = Y_f / Y_r
        
        Args:
            final_yield: Final system yield (Yf) in hours
            reference_yield: Reference yield (Yr) in hours
            
        Returns:
            Performance ratio as a decimal (0.85 = 85%)
        """
        # Avoid division by zero
        pr = np.where(
            reference_yield > 0,
            final_yield / reference_yield,
            np.nan
        )
        return pd.Series(pr, index=final_yield.index)
    
    @staticmethod
    def calculate_temperature_corrected_pr(
        performance_ratio: pd.Series,
        module_temperature: pd.Series,
        temp_coeff_power: float
    ) -> pd.Series:
        """
        Calculate temperature-corrected performance ratio.
        
        This adjusts the PR to account for the expected losses due to
        temperature deviation from STC (25°C).
        
        PR_corrected = PR / (1 + temp_coeff * (T_mod - 25))
        
        Args:
            performance_ratio: The raw performance ratio
            module_temperature: Module temperature in °C
            temp_coeff_power: Temperature coefficient of power (%/°C), typically -0.4
            
        Returns:
            Temperature-corrected performance ratio
        """
        temp_delta = module_temperature - IEC61724Calculator.STC_TEMPERATURE
        temp_factor = 1 + (temp_coeff_power / 100.0) * temp_delta
        
        pr_corrected = performance_ratio / temp_factor
        return pr_corrected
    
    @staticmethod
    def calculate_array_capture_loss(
        reference_yield: pd.Series,
        array_yield: pd.Series
    ) -> pd.Series:
        """
        Calculate the array capture loss (Lc) as per IEC 61724.
        
        Lc = Yr - Ya
        
        This represents losses in the PV array including:
        - Soiling
        - Mismatch
        - Wiring losses
        - Temperature effects
        
        Args:
            reference_yield: Reference yield (Yr) in hours
            array_yield: Array yield (Ya) in hours
            
        Returns:
            Array capture loss in hours
        """
        return reference_yield - array_yield
    
    @staticmethod
    def calculate_system_loss(
        array_yield: pd.Series,
        final_yield: pd.Series
    ) -> pd.Series:
        """
        Calculate the balance of system loss (Ls) as per IEC 61724.
        
        Ls = Ya - Yf
        
        This represents losses in the balance of system including:
        - Inverter losses
        - Transformer losses
        - AC wiring losses
        
        Args:
            array_yield: Array yield (Ya) in hours
            final_yield: Final yield (Yf) in hours
            
        Returns:
            System loss in hours
        """
        return array_yield - final_yield
    
    @staticmethod
    def calculate_capacity_factor(
        ac_energy_kwh: pd.Series,
        array_capacity_kw: float,
        interval_hours: float = 1.0
    ) -> pd.Series:
        """
        Calculate the capacity factor.
        
        CF = Actual Energy / (Capacity × Time)
        
        Args:
            ac_energy_kwh: AC energy output in kWh
            array_capacity_kw: Rated AC capacity in kW
            interval_hours: The time interval in hours
            
        Returns:
            Capacity factor as a decimal (0.25 = 25%)
        """
        max_possible_energy = array_capacity_kw * interval_hours
        capacity_factor = ac_energy_kwh / max_possible_energy
        return capacity_factor
    
    @staticmethod
    def calculate_expected_power_simple(
        poa_irradiance: pd.Series,
        array_capacity_kw: float,
        module_temperature: pd.Series,
        temp_coeff_power: float,
        system_losses: float = 0.14
    ) -> pd.Series:
        """
        Calculate expected DC power output using a simple model.
        
        This is a simplified model that can be used when detailed system
        parameters are not available (e.g., for scraped projects).
        
        P_expected = (G / G_ref) × P_0 × (1 + temp_coeff × (T - 25)) × (1 - losses)
        
        Args:
            poa_irradiance: Plane-of-array irradiance in W/m²
            array_capacity_kw: Rated DC capacity in kW
            module_temperature: Module temperature in °C
            temp_coeff_power: Temperature coefficient of power (%/°C)
            system_losses: Total system losses as a decimal (0.14 = 14%)
            
        Returns:
            Expected DC power in kW
        """
        # Normalize irradiance
        irradiance_factor = poa_irradiance / (IEC61724Calculator.REFERENCE_IRRADIANCE * 1000)
        
        # Temperature correction
        temp_delta = module_temperature - IEC61724Calculator.STC_TEMPERATURE
        temp_factor = 1 + (temp_coeff_power / 100.0) * temp_delta
        
        # Calculate expected power
        expected_power = (
            array_capacity_kw * 
            irradiance_factor * 
            temp_factor * 
            (1 - system_losses)
        )
        
        return expected_power
    
    @classmethod
    def generate_performance_report(
        cls,
        df: pd.DataFrame,
        array_capacity_kw: float,
        temp_coeff_power: float = -0.4,
        interval_hours: float = 1.0
    ) -> Dict:
        """
        Generate a complete IEC 61724 performance report from time-series data.
        
        Args:
            df: DataFrame with columns:
                - 'poa_irradiance': Plane-of-array irradiance (W/m²)
                - 'ac_energy_kwh': AC energy output (kWh)
                - 'module_temperature': Module temperature (°C)
            array_capacity_kw: Rated DC capacity in kW
            temp_coeff_power: Temperature coefficient of power (%/°C)
            interval_hours: Time interval of each measurement in hours
            
        Returns:
            Dictionary containing all calculated performance metrics
        """
        # Calculate yields
        reference_yield = cls.calculate_reference_yield(
            df['poa_irradiance'], 
            interval_hours
        )
        final_yield = cls.calculate_final_yield(
            df['ac_energy_kwh'], 
            array_capacity_kw
        )
        
        # Calculate performance ratio
        pr = cls.calculate_performance_ratio(final_yield, reference_yield)
        
        # Calculate temperature-corrected PR
        pr_corrected = cls.calculate_temperature_corrected_pr(
            pr,
            df['module_temperature'],
            temp_coeff_power
        )
        
        # Calculate capacity factor
        cf = cls.calculate_capacity_factor(
            df['ac_energy_kwh'],
            array_capacity_kw,
            interval_hours
        )
        
        # Aggregate results
        report = {
            'period_start': df.index.min(),
            'period_end': df.index.max(),
            'total_ac_energy_kwh': df['ac_energy_kwh'].sum(),
            'total_reference_yield_hours': reference_yield.sum(),
            'total_final_yield_hours': final_yield.sum(),
            'average_pr': pr.mean(),
            'median_pr': pr.median(),
            'average_pr_corrected': pr_corrected.mean(),
            'median_pr_corrected': pr_corrected.median(),
            'average_capacity_factor': cf.mean(),
            'data_completeness': 1.0 - (df.isna().sum().sum() / df.size)
        }
        
        return report


# Example usage
if __name__ == "__main__":
    # Create sample data
    dates = pd.date_range('2026-01-01', periods=24, freq='H')
    sample_data = pd.DataFrame({
        'poa_irradiance': [0, 0, 0, 0, 0, 100, 300, 500, 700, 850, 950, 1000,
                           1000, 950, 850, 700, 500, 300, 100, 0, 0, 0, 0, 0],
        'ac_energy_kwh': [0, 0, 0, 0, 0, 8, 25, 42, 59, 72, 81, 85,
                          85, 81, 72, 59, 42, 25, 8, 0, 0, 0, 0, 0],
        'module_temperature': [15, 14, 13, 13, 14, 20, 28, 35, 42, 48, 52, 55,
                               56, 54, 50, 45, 38, 30, 22, 18, 16, 15, 15, 14]
    }, index=dates)
    
    # Generate report
    calc = IEC61724Calculator()
    report = calc.generate_performance_report(
        sample_data,
        array_capacity_kw=100.0,
        temp_coeff_power=-0.4,
        interval_hours=1.0
    )
    
    print("IEC 61724 Performance Report:")
    print(f"Period: {report['period_start']} to {report['period_end']}")
    print(f"Total AC Energy: {report['total_ac_energy_kwh']:.2f} kWh")
    print(f"Average PR: {report['average_pr']*100:.2f}%")
    print(f"Average PR (temp-corrected): {report['average_pr_corrected']*100:.2f}%")
    print(f"Average Capacity Factor: {report['average_capacity_factor']*100:.2f}%")
