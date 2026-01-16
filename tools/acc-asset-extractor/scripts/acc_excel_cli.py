#!/usr/bin/env python3
"""
ACC Excel Generator CLI
Command-line interface for generating ACC-compatible Excel files
Usage: python3 acc_excel_cli.py <input_json> <output_excel> <project_name>
"""
import sys
import json
from pathlib import Path
from acc_excel_generator import ACCExcelGenerator

def main():
    if len(sys.argv) < 4:
        print("Usage: python3 acc_excel_cli.py <input_json> <output_excel> <project_name>", file=sys.stderr)
        sys.exit(1)
    
    input_json = sys.argv[1]
    output_excel = sys.argv[2]
    project_name = sys.argv[3]
    
    try:
        # Validate input file exists
        if not Path(input_json).exists():
            print(f"Error: Input file not found: {input_json}", file=sys.stderr)
            sys.exit(1)
        
        # Generate Excel
        generator = ACCExcelGenerator(input_json)
        excel_path = generator.generate_excel(Path(output_excel))
        
        print(f"SUCCESS: Generated {excel_path}")
        sys.exit(0)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
