"""
DC Cable Extractor for Solar Farm Projects
Extracts DC array cables and DC bus cables from calculation reports
Uses hybrid approach: deterministic parsing + LLM intelligence
"""
import pdfplumber
from pathlib import Path
import json
from openai import OpenAI
from typing import List, Dict, Any

class DCCableExtractor:
    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        self.client = OpenAI()  # Pre-configured with API key
        
    def extract_tables(self) -> List[Dict[str, Any]]:
        """Extract all tables from the DC calculation PDF"""
        all_tables = []
        
        with pdfplumber.open(self.pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                tables = page.extract_tables()
                for table_num, table in enumerate(tables):
                    if table and len(table) > 1:  # Has header + data
                        all_tables.append({
                            'page': page_num,
                            'table_num': table_num + 1,
                            'data': table
                        })
        
        return all_tables
    
    def extract_dc_cables(self) -> List[Dict[str, Any]]:
        """Extract DC cables using hybrid approach"""
        print(f"\n[1/3] Extracting tables from {self.pdf_path.name}...")
        tables = self.extract_tables()
        print(f"  ✓ Found {len(tables)} tables across all pages")
        
        # Filter for cable-related tables
        cable_tables = []
        for table_info in tables:
            table = table_info['data']
            header = str(table[0]).lower() if table else ""
            
            # Look for tables with cable-related headers
            if any(keyword in header for keyword in ['cable', 'array', 'string', 'inverter', 'dc', 'size', 'length']):
                cable_tables.append(table_info)
        
        print(f"  ✓ Found {len(cable_tables)} cable-related tables")
        
        if not cable_tables:
            print("  ⚠ No cable tables found")
            return []
        
        # Prepare data for LLM
        print(f"\n[2/3] Sending data to GPT-4.1-mini for intelligent extraction...")
        
        tables_json = []
        for table_info in cable_tables:
            tables_json.append({
                'page': table_info['page'],
                'table_num': table_info['table_num'],
                'data': table_info['data']
            })
        
        # Call LLM to extract structured asset data
        assets = self._extract_with_llm(tables_json)
        print(f"  ✓ Extracted {len(assets)} DC cable assets")
        
        return assets
    
    def _extract_with_llm(self, tables: List[Dict]) -> List[Dict[str, Any]]:
        """Use LLM to intelligently extract DC cable assets from tables"""
        
        prompt = f"""You are extracting DC cable assets from solar farm calculation reports.

INPUT TABLES:
{json.dumps(tables, indent=2)}

TASK:
Extract individual DC cable assets from these tables. Focus on:
1. **DC Array Cables**: Cables from combiner boxes to inverters (typically 95mm² to 300mm² AL)
2. **DC Bus Cables**: Main DC cables connecting multiple strings/arrays
3. **String Cables**: Cables within PV strings (if specified individually)

For each cable, extract:
- **name**: Unique identifier (e.g., "DC-Array-INV01.1-01", "DC-Bus-BL01-01")
- **category**: "Electrical > Cables > DC Cables"
- **type**: "DC Array Cable" or "DC Bus Cable" or "DC String Cable"
- **description**: Clear description including voltage, size, installation method
- **specifications**: Dict with:
  - voltage_V: DC voltage
  - current_A: Operating current
  - length_m: Cable length
  - conductor_size_mm2: Conductor cross-section
  - conductor_material: "Aluminum" or "Copper"
  - installation_method: "Directly Buried", "In Conduit", "In Torque Tube", etc.
  - number_of_cores: Number of conductors
  - ampacity_A: Current carrying capacity (if available)
  - voltage_drop_V: Voltage drop (if available)
  - power_losses_W: Power losses (if available)
- **location**: Block/inverter/area identifier
- **connectivity**: Dict with "from" and "to" if identifiable
- **confidence**: 0.0 to 1.0 (use 1.0 for structured data, lower if inferred)

IMPORTANT:
- Each cable should be tracked individually (not as bulk material)
- If tables show summary/aggregate data, create individual cable entries based on quantities
- Use naming conventions that match the project (look for patterns like "INV-01.1", "BL-01", etc.)
- Include all technical specifications available in the tables
- Set confidence to 1.0 for data directly from tables, 0.8-0.9 for inferred data

Return ONLY a JSON object with this structure:
{{
  "result": [
    {{
      "name": "...",
      "category": "...",
      "type": "...",
      "description": "...",
      "specifications": {{}},
      "location": "...",
      "connectivity": {{}},
      "confidence": 1.0
    }}
  ]
}}
"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "You are a solar farm asset extraction expert. Extract structured asset data from technical documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Debug: print first 500 chars of response
            print(f"[DEBUG] LLM Response (first 500 chars):\n{json.dumps(result, indent=2)[:500]}")
            
            # Handle both "result" and "assets" keys
            if "result" in result:
                return result["result"]
            elif "assets" in result:
                return result["assets"]
            else:
                print(f"[WARNING] Unexpected response structure: {list(result.keys())}")
                return []
                
        except Exception as e:
            print(f"[ERROR] LLM extraction failed: {e}")
            return []
    
    def save_results(self, assets: List[Dict[str, Any]], output_path: Path):
        """Save extracted assets to JSON"""
        output_path.parent.mkdir(exist_ok=True, parents=True)
        
        with open(output_path, 'w') as f:
            json.dump(assets, f, indent=2)
        
        print(f"\n✓ Saved {len(assets)} DC cable assets to: {output_path}")

def main():
    pdf_path = "/home/ubuntu/design-docs/goonumbla/1. SOLAR FARM/3. Reports/GOO-ISE-EL-CAL-0002-C1_Low Voltage (DC) Calculation.pdf"
    output_path = Path("/home/ubuntu/acc-tools/poc/output/dc_cables_extracted.json")
    
    extractor = DCCableExtractor(pdf_path)
    assets = extractor.extract_dc_cables()
    
    if assets:
        extractor.save_results(assets, output_path)
        print(f"\n{'='*80}")
        print(f"EXTRACTION COMPLETE: {len(assets)} DC cable assets extracted")
        print(f"{'='*80}")
    else:
        print("\n⚠ No DC cable assets extracted")

if __name__ == "__main__":
    main()
