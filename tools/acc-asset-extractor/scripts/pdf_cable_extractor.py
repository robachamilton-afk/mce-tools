"""
PDF Cable Schedule Extractor - Extracts cable data from PDF calculation reports.
"""
import pdfplumber
import re
from typing import List
from pathlib import Path
from models import EquipmentAsset, ExtractionResult, ExtractionMetadata, DataCompleteness

class PDFCableExtractor:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.result = ExtractionResult()

    def parse(self) -> ExtractionResult:
        print(f"Parsing PDF: {self.file_path.name}")
        
        with pdfplumber.open(self.file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    # Check if this looks like a cable schedule table
                    header = [str(cell).lower() if cell else "" for cell in table[0]]
                    if any(keyword in " ".join(header) for keyword in ["line", "from", "to", "length", "size", "cable"]):
                        self._parse_cable_table(table, page_num)
        
        print(f"  Extracted {len(self.result.assets)} cable assets")
        return self.result

    def _parse_cable_table(self, table: List[List], page_num: int):
        if len(table) < 2:
            return
        
        header = [str(cell).lower().strip() if cell else "" for cell in table[0]]
        
        # Find column indices
        line_col = next((i for i, h in enumerate(header) if "line" in h), None)
        from_col = next((i for i, h in enumerate(header) if "from" in h), None)
        to_col = next((i for i, h in enumerate(header) if "to" in h), None)
        length_col = next((i for i, h in enumerate(header) if "length" in h), None)
        size_col = next((i for i, h in enumerate(header) if "size" in h), None)
        
        for row in table[1:]:
            if not row or len(row) < 3:
                continue
            
            # Extract cable information
            line_info = str(row[line_col]) if line_col is not None and line_col < len(row) else ""
            from_loc = str(row[from_col]) if from_col is not None and from_col < len(row) else ""
            to_loc = str(row[to_col]) if to_col is not None and to_col < len(row) else ""
            length_str = str(row[length_col]) if length_col is not None and length_col < len(row) else ""
            size_str = str(row[size_col]) if size_col is not None and size_col < len(row) else ""
            
            # Skip if essential data is missing
            if not line_info or line_info == "None" or not from_loc or not to_loc:
                continue
            
            # Parse length
            length_match = re.search(r"(\d+(?:\.\d+)?)", length_str)
            length_m = float(length_match.group(1)) if length_match else None
            
            # Parse size
            size_match = re.search(r"(\d+)", size_str)
            conductor_size = f"{size_match.group(1)}mm²" if size_match else None
            
            # Determine cable type from context
            cable_type = "MV Cable" if "mv" in self.file_path.name.lower() else "DC Cable"
            category = "Electrical > Cables > MV Cables" if cable_type == "MV Cable" else "Electrical > Cables > DC Cables"
            
            # Create cable asset
            cable_name = f"{cable_type.replace(' ', '-').upper()}-{line_info.replace(' ', '-')}"
            
            asset = EquipmentAsset(
                name=cable_name,
                category=category,
                description=f"{cable_type} from {from_loc} to {to_loc}",
                specifications={
                    'cable_type': cable_type,
                    'conductor_size': conductor_size,
                    'length_m': length_m,
                    'from_location': from_loc,
                    'to_location': to_loc
                },
                extraction_metadata=ExtractionMetadata(
                    source_document=self.file_path.name,
                    source_page=page_num,
                    extraction_method="pdf_table_extractor",
                    confidence=0.9
                )
            )
            asset.data_completeness = self._validate_cable_completeness(asset)
            self.result.assets.append(asset)

    def _validate_cable_completeness(self, asset: EquipmentAsset) -> DataCompleteness:
        specs = asset.specifications
        if specs.get('conductor_size') and specs.get('length_m') and specs.get('from_location') and specs.get('to_location'):
            return DataCompleteness.FULL
        return DataCompleteness.PARTIAL

if __name__ == "__main__":
    mv_path = "/home/ubuntu/design-docs/goonumbla/1. SOLAR FARM/3. Reports/GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf"
    dc_path = "/home/ubuntu/design-docs/goonumbla/1. SOLAR FARM/3. Reports/GOO-ISE-EL-CAL-0002-C1_Low Voltage (DC) Calculation.pdf"
    
    print("=== MV CABLES ===")
    mv_extractor = PDFCableExtractor(mv_path)
    mv_result = mv_extractor.parse()
    
    print("\n=== DC CABLES ===")
    dc_extractor = PDFCableExtractor(dc_path)
    dc_result = dc_extractor.parse()
    
    print("\n=== SUMMARY ===")
    print(f"Total MV cables: {len(mv_result.assets)}")
    print(f"Total DC cables: {len(dc_result.assets)}")
    
    print("\n=== SAMPLE MV CABLES ===")
    for asset in mv_result.assets[:5]:
        print(f"- {asset.name}: {asset.specifications.get('conductor_size')} x {asset.specifications.get('length_m')}m")
        print(f"  From: {asset.specifications.get('from_location')} → To: {asset.specifications.get('to_location')}")
        print(f"  Completeness: {asset.data_completeness.value}")
