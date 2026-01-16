"""
Complete Asset Extractor for Goonumbla Solar Farm
Extracts all major asset types from multiple document sources
"""
from pathlib import Path
from models import EquipmentAsset, ExtractionMetadata
import json
from datetime import datetime

class CompleteAssetExtractor:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.assets = []
        
    def extract_all(self):
        """Extract all assets from all sources"""
        print("="*80)
        print("COMPLETE ASSET EXTRACTION FOR GOONUMBLA SOLAR FARM")
        print("="*80)
        
        # 1. Extract cables from calculation reports
        print("\n[1/5] Extracting MV cables from calculation report...")
        mv_cables = self.extract_mv_cables()
        self.assets.extend(mv_cables)
        print(f"✓ Extracted {len(mv_cables)} MV cables")
        
        # 2. Extract DC cables from calculation report  
        print("\n[2/5] Extracting DC cables from calculation report...")
        dc_cables = self.extract_dc_cables()
        self.assets.extend(dc_cables)
        print(f"✓ Extracted {len(dc_cables)} DC cables")
        
        # 3. Extract substation cables from cable schedules
        print("\n[3/5] Extracting substation cables from cable schedules...")
        sub_cables = self.extract_substation_cables()
        self.assets.extend(sub_cables)
        print(f"✓ Extracted {len(sub_cables)} substation cables")
        
        # 4. Extract equipment from equipment labeling document
        print("\n[4/5] Generating equipment assets from labeling specification...")
        equipment = self.generate_equipment_from_spec()
        self.assets.extend(equipment)
        print(f"✓ Generated {len(equipment)} equipment assets")
        
        # 5. Extract substation equipment from equipment lists
        print("\n[5/5] Extracting substation equipment from equipment lists...")
        sub_equipment = self.extract_substation_equipment()
        self.assets.extend(sub_equipment)
        print(f"✓ Extracted {len(sub_equipment)} substation equipment assets")
        
        print(f"\n{'='*80}")
        print(f"TOTAL ASSETS EXTRACTED: {len(self.assets)}")
        print(f"{'='*80}")
        
        return self.assets
    
    def extract_mv_cables(self):
        """Extract MV cables using existing extractor"""
        from pdf_cable_extractor import PDFCableExtractor
        extractor = PDFCableExtractor(
            self.base_path / "1. SOLAR FARM/3. Reports/GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf"
        )
        result = extractor.parse()
        return result.assets
    
    def extract_dc_cables(self):
        """Extract DC cables - placeholder for now"""
        # TODO: Implement DC cable extraction from DC calculation report
        return []
    
    def extract_substation_cables(self):
        """Extract substation cables - placeholder for now"""
        # TODO: Implement substation cable extraction from cable schedules
        return []
    
    def generate_equipment_from_spec(self):
        """
        Generate equipment assets based on the equipment labeling specification
        This creates placeholder assets with correct naming and quantities
        """
        equipment = []
        
        # Power Stations (16 blocks)
        for block in range(1, 17):
            equipment.append(EquipmentAsset(
                name=f"BL-{block:02d}",
                category="Solar > Power Stations",
                description=f"Power Station (Skid Solution) for Block {block}",
                specifications={"block_number": block},
                extraction_metadata=ExtractionMetadata(
                    source_document="GOO-ISE-GE-RPT-0001-C2",
                    extraction_method="equipment_labeling_spec",
                    confidence=0.9
                )
            ))
        
        # Inverters (31 total: 2 per block except block 04 which has 1)
        for block in range(1, 17):
            inv_count = 1 if block == 4 else 2
            for inv in range(1, inv_count + 1):
                equipment.append(EquipmentAsset(
                    name=f"INV-{block:02d}.{inv}",
                    category="Electrical > Inverters",
                    description=f"Inverter {inv} in Block {block}",
                    specifications={"block_number": block, "inverter_number": inv},
                    extraction_metadata=ExtractionMetadata(
                        source_document="GOO-ISE-GE-RPT-0001-C2",
                        extraction_method="equipment_labeling_spec",
                        confidence=0.9
                    )
                ))
        
        # LV/MV Transformers (1 per block)
        for block in range(1, 17):
            equipment.append(EquipmentAsset(
                name=f"TRF{block:02d}",
                category="Electrical > Transformers > LV/MV Transformers",
                description=f"LV/MV Transformer for Block {block}",
                specifications={"block_number": block},
                extraction_metadata=ExtractionMetadata(
                    source_document="GOO-ISE-GE-RPT-0001-C2",
                    extraction_method="equipment_labeling_spec",
                    confidence=0.9
                )
            ))
        
        # LV/LV Auxiliary Transformers (1 per block)
        for block in range(1, 17):
            equipment.append(EquipmentAsset(
                name=f"AUXTRF{block:02d}",
                category="Electrical > Transformers > LV/LV Auxiliary Transformers",
                description=f"LV/LV Auxiliary Transformer for Block {block}",
                specifications={"block_number": block},
                extraction_metadata=ExtractionMetadata(
                    source_document="GOO-ISE-GE-RPT-0001-C2",
                    extraction_method="equipment_labeling_spec",
                    confidence=0.9
                )
            ))
        
        # RMUs (Ring Main Units - 1 per block)
        for block in range(1, 17):
            equipment.append(EquipmentAsset(
                name=f"RMU-{block:02d}",
                category="Electrical > Switchgear > Ring Main Units",
                description=f"Ring Main Unit for Block {block}",
                specifications={"block_number": block},
                extraction_metadata=ExtractionMetadata(
                    source_document="GOO-ISE-GE-RPT-0001-C2",
                    extraction_method="equipment_labeling_spec",
                    confidence=0.9
                )
            ))
        
        # Switchgears in RMU (3 per RMU)
        for block in range(1, 17):
            for sw in range(1, 4):
                equipment.append(EquipmentAsset(
                    name=f"RMU-{block:02d}/{sw}",
                    category="Electrical > Switchgear",
                    description=f"Switchgear {sw} in RMU-{block:02d}",
                    specifications={"block_number": block, "switchgear_position": sw},
                    extraction_metadata=ExtractionMetadata(
                        source_document="GOO-ISE-GE-RPT-0001-C2",
                        extraction_method="equipment_labeling_spec",
                        confidence=0.9
                    )
                ))
        
        # Substation
        equipment.append(EquipmentAsset(
            name="SUB-01",
            category="Electrical > Substations > 33/66kV Substation",
            description="Main 33/66kV Substation",
            extraction_metadata=ExtractionMetadata(
                source_document="GOO-ISE-GE-RPT-0001-C2",
                extraction_method="equipment_labeling_spec",
                confidence=0.9
            )
        ))
        
        # Substation Feeders (5 feeders)
        for feeder in range(1, 6):
            equipment.append(EquipmentAsset(
                name=f"SUBF-{feeder:02d}",
                category="Electrical > Feeders > 33kV Substation Feeders",
                description=f"33kV Substation Feeder {feeder}",
                specifications={"feeder_number": feeder},
                extraction_metadata=ExtractionMetadata(
                    source_document="GOO-ISE-GE-RPT-0001-C2",
                    extraction_method="equipment_labeling_spec",
                    confidence=0.9
                )
            ))
        
        # Auxiliary Substation Transformer
        equipment.append(EquipmentAsset(
            name="AUXSUBTRF",
            category="Electrical > Transformers > MV/LV Auxiliary Transformers",
            description="MV/LV Auxiliary Transformer at Substation",
            extraction_metadata=ExtractionMetadata(
                source_document="GOO-ISE-GE-RPT-0001-C2",
                extraction_method="equipment_labeling_spec",
                confidence=0.9
            )
        ))
        
        # Weather Station
        equipment.append(EquipmentAsset(
            name="WS-01",
            category="SCADA > Meteorological Stations",
            description="Autonomous Weather Station",
            extraction_metadata=ExtractionMetadata(
                source_document="GOO-ISE-GE-RPT-0001-C2",
                extraction_method="equipment_labeling_spec",
                confidence=0.9
            )
        ))
        
        return equipment
    
    def extract_substation_equipment(self):
        """Extract substation equipment - placeholder for now"""
        # TODO: Implement substation equipment extraction from equipment lists
        return []
    
    def save_results(self, output_dir: Path):
        """Save extraction results"""
        output_dir.mkdir(exist_ok=True, parents=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON
        json_file = output_dir / f"goonumbla_complete_assets_{timestamp}.json"
        with open(json_file, 'w') as f:
            json.dump([asset.__dict__ for asset in self.assets], f, indent=2, default=str)
        
        print(f"\n✓ Saved complete asset list to: {json_file}")
        
        # Generate summary
        summary_file = output_dir / f"extraction_summary_{timestamp}.md"
        with open(summary_file, 'w') as f:
            f.write("# Goonumbla Solar Farm - Complete Asset Extraction Summary\n\n")
            f.write(f"**Extraction Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Total Assets:** {len(self.assets)}\n\n")
            
            # Count by category
            categories = {}
            for asset in self.assets:
                cat = asset.category.split(">")[0].strip()
                categories[cat] = categories.get(cat, 0) + 1
            
            f.write("## Assets by Category\n\n")
            for cat, count in sorted(categories.items()):
                f.write(f"- **{cat}:** {count} assets\n")
            
            f.write("\n## Data Completeness\n\n")
            completeness = {}
            for asset in self.assets:
                comp = asset.data_completeness if hasattr(asset, 'data_completeness') else "UNKNOWN"
                completeness[comp] = completeness.get(comp, 0) + 1
            
            for comp, count in completeness.items():
                pct = (count / len(self.assets)) * 100
                f.write(f"- **{comp}:** {count} assets ({pct:.1f}%)\n")
        
        print(f"✓ Saved extraction summary to: {summary_file}")
        
        return json_file, summary_file

def main():
    base_path = "/home/ubuntu/design-docs/goonumbla"
    output_dir = Path("/home/ubuntu/acc-tools/poc/output")
    
    extractor = CompleteAssetExtractor(base_path)
    assets = extractor.extract_all()
    extractor.save_results(output_dir)

if __name__ == "__main__":
    main()
