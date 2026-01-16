"""
Example: Contract-Based Performance Assessment

This script demonstrates how to parse a performance contract PDF and
assess compliance using the extracted performance model.

Author: Manus AI
Date: January 12, 2026
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

from contract_model.pdf_parser import ContractPDFParser
import json


def demonstrate_contract_parsing():
    """
    Demonstrate the contract parsing workflow.
    
    Note: This requires an actual contract PDF and OpenAI API key to run.
    """
    
    print("=" * 80)
    print("Contract-Based Performance Assessment Example")
    print("=" * 80)
    print()
    
    # Initialize the parser
    print("Step 1: Initialize Contract Parser")
    print("-" * 80)
    
    try:
        parser = ContractPDFParser()
        print("✓ Parser initialized successfully")
        print("✓ OpenAI API key detected")
    except Exception as e:
        print(f"✗ Error initializing parser: {e}")
        print("\nNote: This example requires:")
        print("  1. OpenAI API key set in environment (OPENAI_API_KEY)")
        print("  2. An actual contract PDF file")
        return
    
    print()
    
    # Example of what the parser would extract
    print("Step 2: Example of Extracted Performance Model")
    print("-" * 80)
    
    example_model = {
        "equations": {
            "expected_energy_kwh": "(G_poa * Area * 1000) * (1 - (T_mod - 25) * Temp_Coeff) * PR_baseline",
            "performance_ratio": "(Actual_Energy_kWh / Expected_Energy_kWh) * 100"
        },
        "parameters": {
            "Area": {
                "value": 500000,
                "unit": "m^2"
            },
            "Temp_Coeff": {
                "value": 0.004,
                "unit": "/°C"
            },
            "PR_baseline": {
                "value": 0.85,
                "unit": "dimensionless"
            }
        },
        "data_sources": {
            "G_poa": "On-site Class A pyranometer mounted at array tilt",
            "T_mod": "Back-of-module temperature sensor (PT100)",
            "Actual_Energy_kWh": "Revenue-grade AC meter at point of interconnection"
        },
        "compliance_criteria": {
            "performance_ratio": {
                "operator": ">=",
                "value": 85,
                "period": "monthly",
                "description": "Monthly PR shall not fall below 85%"
            },
            "availability": {
                "operator": ">=",
                "value": 98,
                "period": "annual",
                "description": "Annual availability shall exceed 98%"
            }
        }
    }
    
    print("Example Performance Model (JSON):")
    print(json.dumps(example_model, indent=2))
    print()
    
    # Demonstrate how to use the extracted model
    print("Step 3: Using the Extracted Model for Compliance Assessment")
    print("-" * 80)
    
    print("\nThe extracted model would be used as follows:")
    print()
    print("1. Fetch site data for the assessment period:")
    print("   - G_poa: From on-site pyranometer")
    print("   - T_mod: From module temperature sensor")
    print("   - Actual_Energy_kWh: From revenue meter")
    print()
    print("2. Apply the contractual equations:")
    print("   - Calculate Expected_Energy_kWh using the extracted equation")
    print("   - Calculate Performance_Ratio")
    print()
    print("3. Check compliance criteria:")
    print("   - Compare calculated PR against threshold (>= 85%)")
    print("   - Generate compliance report (PASS/FAIL)")
    print()
    
    # Example compliance check
    print("Step 4: Example Compliance Check")
    print("-" * 80)
    
    # Simulate some monthly results
    monthly_results = [
        {"month": "Jan 2026", "pr": 86.2, "status": "PASS"},
        {"month": "Feb 2026", "pr": 84.8, "status": "FAIL"},
        {"month": "Mar 2026", "pr": 87.1, "status": "PASS"},
        {"month": "Apr 2026", "pr": 85.5, "status": "PASS"},
    ]
    
    print("\nMonthly Compliance Results:")
    print("-" * 40)
    for result in monthly_results:
        status_symbol = "✓" if result["status"] == "PASS" else "✗"
        print(f"{status_symbol} {result['month']}: PR = {result['pr']:.1f}% ({result['status']})")
    
    print()
    print("Overall Assessment:")
    failed_months = sum(1 for r in monthly_results if r["status"] == "FAIL")
    if failed_months == 0:
        print("✓ All months in compliance")
    else:
        print(f"✗ {failed_months} month(s) failed to meet contractual requirements")
    
    print()
    print("=" * 80)
    print("Example Complete")
    print("=" * 80)
    print()
    print("To use with a real contract:")
    print("  1. Set OPENAI_API_KEY environment variable")
    print("  2. Call: parser.parse_contract(pdf_path='contract.pdf', duid='DUID')")
    print("  3. The LLM will extract equations and criteria automatically")


if __name__ == "__main__":
    demonstrate_contract_parsing()
