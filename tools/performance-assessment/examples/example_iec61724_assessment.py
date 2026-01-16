"""
Example: IEC 61724 Performance Assessment

This script demonstrates how to use the IEC 61724 calculator to assess
solar farm performance using AEMO SCADA data and Solcast weather data.

Author: Manus AI
Date: January 12, 2026
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

from iec61724_model.iec61724_calculator import IEC61724Calculator
from iec61724_model.parameter_inference import ParameterInferenceEngine
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def generate_sample_data(days=7):
    """Generate sample solar farm data for demonstration."""
    
    # Create hourly timestamps for the specified number of days
    start_date = datetime(2026, 1, 1)
    timestamps = pd.date_range(start_date, periods=days*24, freq='h')
    
    data = []
    for ts in timestamps:
        hour = ts.hour
        
        # Simulate solar irradiance (W/m²) - peaks at midday
        if 6 <= hour <= 18:
            # Parabolic curve peaking at 1000 W/m² at noon
            irradiance = 1000 * (1 - ((hour - 12) / 6) ** 2)
            # Add some random variation
            irradiance *= (0.9 + np.random.random() * 0.2)
        else:
            irradiance = 0
        
        # Simulate module temperature (°C) - correlates with irradiance
        if 6 <= hour <= 18:
            base_temp = 20 + (hour - 6) * 3  # Rises through the day
            module_temp = base_temp + (irradiance / 1000) * 25  # Higher with more sun
        else:
            module_temp = 15 + np.random.random() * 5
        
        # Simulate AC energy output (kWh per hour)
        # Using a simple model: E = G * Area * PR
        # Assume 100 MW farm, ~500,000 m² array area
        if irradiance > 0:
            # Performance ratio decreases with temperature
            temp_loss = 1 + (-0.004 * (module_temp - 25))
            pr_base = 0.85 * temp_loss
            ac_energy = (irradiance / 1000) * 500000 * pr_base * 0.0002  # kWh
        else:
            ac_energy = 0
        
        data.append({
            'timestamp': ts,
            'poa_irradiance': max(0, irradiance),
            'ac_energy_kwh': max(0, ac_energy),
            'module_temperature': module_temp
        })
    
    return pd.DataFrame(data).set_index('timestamp')


def main():
    """Main example workflow."""
    
    print("=" * 80)
    print("IEC 61724 Performance Assessment Example")
    print("=" * 80)
    print()
    
    # Step 1: Define solar farm parameters
    print("Step 1: Defining Solar Farm Parameters")
    print("-" * 80)
    
    duid = "EXAMPLE1"
    ac_capacity_kw = 100000  # 100 MW
    latitude = -35.3
    longitude = 149.1
    commissioning_date = datetime(2020, 6, 15)
    
    # Use parameter inference for farms where we don't have detailed specs
    engine = ParameterInferenceEngine()
    inferred_params = engine.infer_all_parameters(
        duid=duid,
        ac_capacity_kw=ac_capacity_kw,
        latitude=latitude,
        longitude=longitude,
        commissioning_date=commissioning_date
    )
    
    print(f"Solar Farm: {duid}")
    print(f"AC Capacity: {ac_capacity_kw/1000:.1f} MW")
    print(f"DC Capacity (inferred): {inferred_params['dc_capacity_kw']/1000:.1f} MW")
    print(f"Location: {latitude}, {longitude}")
    print(f"Module Technology: {inferred_params['module_specs']['technology']}")
    print(f"Temp Coefficient: {inferred_params['module_specs']['temp_coeff_power']}%/°C")
    print(f"Tracker Type: {inferred_params['array_specs']['tracker_type']}")
    print(f"Confidence: {inferred_params['confidence']}")
    print()
    
    # Step 2: Generate sample data (in production, this would come from AEMO + Solcast)
    print("Step 2: Loading Performance Data")
    print("-" * 80)
    
    df = generate_sample_data(days=7)
    print(f"Data Period: {df.index.min()} to {df.index.max()}")
    print(f"Total Data Points: {len(df)}")
    print(f"Data Completeness: {(1 - df.isna().sum().sum() / df.size) * 100:.1f}%")
    print()
    
    # Display sample data
    print("Sample Data (first 12 hours):")
    print(df.head(12).to_string())
    print()
    
    # Step 3: Calculate IEC 61724 performance metrics
    print("Step 3: Calculating IEC 61724 Performance Metrics")
    print("-" * 80)
    
    calculator = IEC61724Calculator()
    report = calculator.generate_performance_report(
        df=df,
        array_capacity_kw=inferred_params['dc_capacity_kw'],
        temp_coeff_power=inferred_params['module_specs']['temp_coeff_power'],
        interval_hours=1.0
    )
    
    print(f"Period: {report['period_start']} to {report['period_end']}")
    print(f"Total AC Energy: {report['total_ac_energy_kwh']:,.2f} kWh")
    print(f"Total Reference Yield: {report['total_reference_yield_hours']:.2f} hours")
    print(f"Total Final Yield: {report['total_final_yield_hours']:.2f} hours")
    print()
    print(f"Average Performance Ratio: {report['average_pr']*100:.2f}%")
    print(f"Median Performance Ratio: {report['median_pr']*100:.2f}%")
    print(f"Average PR (temp-corrected): {report['average_pr_corrected']*100:.2f}%")
    print(f"Median PR (temp-corrected): {report['median_pr_corrected']*100:.2f}%")
    print()
    print(f"Average Capacity Factor: {report['average_capacity_factor']*100:.2f}%")
    print(f"Data Completeness: {report['data_completeness']*100:.2f}%")
    print()
    
    # Step 4: Interpret results
    print("Step 4: Performance Interpretation")
    print("-" * 80)
    
    pr = report['average_pr']
    if pr >= 0.85:
        status = "EXCELLENT"
        message = "Performance exceeds industry standards."
    elif pr >= 0.80:
        status = "GOOD"
        message = "Performance meets industry standards."
    elif pr >= 0.75:
        status = "ACCEPTABLE"
        message = "Performance is acceptable but below optimal."
    else:
        status = "POOR"
        message = "Performance is below acceptable standards. Investigation recommended."
    
    print(f"Performance Status: {status}")
    print(f"Assessment: {message}")
    print()
    
    # Step 5: Calculate daily performance
    print("Step 5: Daily Performance Breakdown")
    print("-" * 80)
    
    # Group by date and calculate daily PR
    df['date'] = df.index.date
    daily_energy = df.groupby('date')['ac_energy_kwh'].sum()
    daily_irradiation = df.groupby('date')['poa_irradiance'].sum() / 1000  # Convert to kWh/m²
    
    daily_ref_yield = daily_irradiation / 1.0
    daily_final_yield = daily_energy / inferred_params['dc_capacity_kw']
    daily_pr = daily_final_yield / daily_ref_yield
    
    daily_summary = pd.DataFrame({
        'Energy (MWh)': daily_energy / 1000,
        'Ref Yield (h)': daily_ref_yield,
        'Final Yield (h)': daily_final_yield,
        'PR (%)': daily_pr * 100
    })
    
    print(daily_summary.to_string())
    print()
    
    print("=" * 80)
    print("Assessment Complete")
    print("=" * 80)


if __name__ == "__main__":
    main()
