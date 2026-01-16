"""
ACC Excel Generator
Converts extracted assets to ACC-compatible Excel import format
"""
import pandas as pd
from pathlib import Path
import json
from datetime import datetime
from typing import List, Dict, Any

class ACCExcelGenerator:
    def __init__(self, assets_json_path: str):
        self.assets_json_path = Path(assets_json_path)
        with open(self.assets_json_path) as f:
            self.assets = json.load(f)
    
    def generate_excel(self, output_path: Path):
        """Generate ACC-compatible Excel file"""
        print(f"\n{'='*80}")
        print(f"GENERATING ACC EXCEL IMPORT FILE")
        print(f"{'='*80}")
        print(f"\nInput: {len(self.assets)} assets")
        
        # Convert assets to ACC format
        acc_rows = []
        for asset in self.assets:
            acc_row = self._convert_to_acc_format(asset)
            if acc_row:
                acc_rows.append(acc_row)
        
        print(f"Converted: {len(acc_rows)} rows")
        
        # Create DataFrame
        df = pd.DataFrame(acc_rows)
        
        # Ensure correct column order
        columns = ['Name', 'Category\t ', 'Description', 'Location ', 'Status', 'Barcode', 'System Names']
        
        # Add missing columns if needed
        for col in columns:
            if col not in df.columns:
                df[col] = ''
        
        # Reorder columns
        df = df[columns]
        
        # Save to Excel
        output_path.parent.mkdir(exist_ok=True, parents=True)
        df.to_excel(output_path, index=False, sheet_name='Assets')
        
        print(f"\n✓ Saved ACC import file to: {output_path}")
        print(f"{'='*80}")
        
        return output_path
    
    def _convert_to_acc_format(self, asset: Dict[str, Any]) -> Dict[str, str]:
        """Convert a single asset to ACC format"""
        
        # Extract fields
        name = asset.get('name', '')
        category = asset.get('category', 'Unknown')
        description = asset.get('description', '')
        location = asset.get('location', '')
        
        # Determine status based on confidence
        confidence = asset.get('confidence', 0)
        if confidence >= 0.9:
            status = 'Specified'
        elif confidence >= 0.7:
            status = 'Specified'  # Still use Specified, but could be flagged for review
        else:
            status = 'Specified'  # Default to Specified
        
        # Generate barcode (optional - could use asset ID or leave blank)
        barcode = ''
        
        # System names (optional - could extract from parent_asset or leave blank)
        system_names = ''
        if 'parent_asset' in asset:
            system_names = asset['parent_asset']
        
        return {
            'Name': name,
            'Category\t ': category,  # Note the tab character in column name
            'Description': description,
            'Location ': location,  # Note the space in column name
            'Status': status,
            'Barcode': barcode,
            'System Names': system_names
        }
    
    def generate_summary(self, output_path: Path):
        """Generate summary report"""
        summary_path = output_path.parent / f"{output_path.stem}_summary.md"
        
        with open(summary_path, 'w') as f:
            f.write("# ACC Import File Summary\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Source:** {self.assets_json_path.name}\n\n")
            f.write(f"**Total Assets:** {len(self.assets)}\n\n")
            
            # Count by category
            categories = {}
            for asset in self.assets:
                cat = asset.get('category', 'Unknown').split('>')[0].strip()
                categories[cat] = categories.get(cat, 0) + 1
            
            f.write("## Assets by Category\n\n")
            for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
                f.write(f"- **{cat}:** {count} assets\n")
            
            # Count by location
            locations = {}
            for asset in self.assets:
                loc = asset.get('location', 'Unknown')
                locations[loc] = locations.get(loc, 0) + 1
            
            f.write("\n## Assets by Location\n\n")
            for loc, count in sorted(locations.items(), key=lambda x: -x[1])[:10]:
                f.write(f"- **{loc}:** {count} assets\n")
            
            f.write("\n## Import Instructions\n\n")
            f.write("1. Open Autodesk Construction Cloud (ACC)\n")
            f.write("2. Navigate to Assets module\n")
            f.write("3. Click Import > Import from Excel\n")
            f.write("4. Upload the generated Excel file\n")
            f.write("5. Review and confirm the import\n")
            f.write("6. Verify assets appear in the asset register\n")
        
        print(f"✓ Saved summary to: {summary_path}")
        
        return summary_path

def main():
    # Use the latest unified extraction
    assets_json = "/home/ubuntu/acc-tools/poc/output/goonumbla_unified_assets_20260111_233423.json"
    output_path = Path("/home/ubuntu/acc-tools/poc/output/Goonumbla_ACC_Import_Final.xlsx")
    
    generator = ACCExcelGenerator(assets_json)
    excel_path = generator.generate_excel(output_path)
    summary_path = generator.generate_summary(excel_path)
    
    print(f"\n✅ ACC import file ready!")
    print(f"   Excel: {excel_path}")
    print(f"   Summary: {summary_path}")

if __name__ == "__main__":
    main()
