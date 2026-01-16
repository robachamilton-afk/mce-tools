"""
Generate ACC Excel Import File from Complete Asset List
"""
import json
import openpyxl
from pathlib import Path
from datetime import datetime

def generate_acc_excel(assets_json_path: str, output_path: str):
    """Generate ACC-compatible Excel file from asset JSON"""
    
    # Load assets
    with open(assets_json_path, 'r') as f:
        assets = json.load(f)
    
    print(f"Loaded {len(assets)} assets from {Path(assets_json_path).name}")
    
    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Assets"
    
    # Write header
    headers = ["Name", "Category", "Status", "Location", "Barcode", "System Names", "Description"]
    ws.append(headers)
    
    # Write assets
    for asset in assets:
        name = asset.get('name', '')
        category = asset.get('category', '')
        status = asset.get('status', 'Specified')
        location = asset.get('location', '')
        barcode = ''
        system_names = ''
        description = asset.get('description', '')
        
        ws.append([name, category, status, location, barcode, system_names, description])
    
    # Save
    wb.save(output_path)
    print(f"✓ Saved ACC Excel file to: {output_path}")
    print(f"  Total rows: {len(assets) + 1} (including header)")
    
    return output_path

def main():
    # Find the latest asset JSON file
    output_dir = Path("/home/ubuntu/acc-tools/poc/output")
    json_files = list(output_dir.glob("goonumbla_complete_assets_*.json"))
    
    if not json_files:
        print("ERROR: No asset JSON files found!")
        return
    
    latest_json = sorted(json_files)[-1]
    print(f"Using latest asset file: {latest_json.name}\n")
    
    # Generate ACC Excel file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"Goonumbla_ACC_Import_{timestamp}.xlsx"
    
    generate_acc_excel(str(latest_json), str(output_file))
    
    print(f"\n{'='*80}")
    print("ACC IMPORT FILE READY")
    print(f"{'='*80}")
    print(f"\nFile: {output_file.name}")
    print(f"Path: {output_file}")
    print(f"\nYou can now upload this file to ACC to create the asset register.")

if __name__ == "__main__":
    main()
