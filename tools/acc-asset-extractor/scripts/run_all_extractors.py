"""
Master Extraction Script - Runs all extractors and combines results into a complete dataset.
"""
from intelligent_bom_parser import IntelligentBOMParser
from pdf_cable_extractor import PDFCableExtractor
from models import ExtractionResult
import json
from pathlib import Path

def combine_results(*results: ExtractionResult) -> ExtractionResult:
    """Combine multiple extraction results into one"""
    combined = ExtractionResult()
    for result in results:
        combined.assets.extend(result.assets)
        combined.bulk_materials.extend(result.bulk_materials)
    return combined

def main():
    print("="*80)
    print("GOONUMBLA SOLAR FARM - COMPLETE ASSET EXTRACTION")
    print("="*80)
    
    # 1. Extract from BOM
    print("\n[1/2] Extracting from Bill of Materials...")
    bom_parser = IntelligentBOMParser(
        "/home/ubuntu/design-docs/goonumbla/1. SOLAR FARM/3. Reports/GOO-ISE-GE-RPT-0003_C1-Bill of Materials (BOM).xlsx"
    )
    bom_result = bom_parser.parse()
    
    # 2. Extract MV cables from calculation report
    print("\n[2/2] Extracting MV cables from calculation reports...")
    mv_cable_extractor = PDFCableExtractor(
        "/home/ubuntu/design-docs/goonumbla/1. SOLAR FARM/3. Reports/GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf"
    )
    mv_cable_result = mv_cable_extractor.parse()
    
    # Combine all results
    print("\n" + "="*80)
    print("COMBINING RESULTS")
    print("="*80)
    complete_result = combine_results(bom_result, mv_cable_result)
    
    # Generate summary statistics
    print("\n### EXTRACTION SUMMARY ###")
    print(f"Total Assets: {len(complete_result.assets)}")
    print(f"Total Bulk Materials: {len(complete_result.bulk_materials)}")
    
    # Breakdown by category
    category_counts = {}
    for asset in complete_result.assets:
        cat = asset.category.split(" > ")[0] if " > " in asset.category else asset.category
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    print("\n### ASSETS BY CATEGORY ###")
    for cat, count in sorted(category_counts.items()):
        print(f"  {cat}: {count}")
    
    # Completeness breakdown
    completeness_counts = {}
    for asset in complete_result.assets:
        level = asset.data_completeness.value
        completeness_counts[level] = completeness_counts.get(level, 0) + 1
    
    print("\n### DATA COMPLETENESS ###")
    for level, count in sorted(completeness_counts.items()):
        pct = (count / len(complete_result.assets)) * 100 if complete_result.assets else 0
        print(f"  {level}: {count} ({pct:.1f}%)")
    
    # Save complete dataset to JSON
    output_dir = Path("/home/ubuntu/acc-tools/poc/output")
    output_dir.mkdir(exist_ok=True)
    
    output_data = {
        'project': 'Goonumbla Solar Farm',
        'total_assets': len(complete_result.assets),
        'total_bulk_materials': len(complete_result.bulk_materials),
        'assets': [
            {
                'id': asset.id,
                'name': asset.name,
                'category': asset.category,
                'description': asset.description,
                'manufacturer': getattr(asset, 'manufacturer', None),
                'model': getattr(asset, 'model', None),
                'specifications': getattr(asset, 'specifications', {}),
                'data_completeness': asset.data_completeness.value,
                'extraction_source': asset.extraction_metadata.source_document if asset.extraction_metadata else None
            }
            for asset in complete_result.assets
        ],
        'bulk_materials': [
            {
                'material_type': bulk.material_type,
                'quantity': bulk.quantity,
                'unit': bulk.unit,
                'description': bulk.description,
                'specifications': bulk.specifications
            }
            for bulk in complete_result.bulk_materials
        ]
    }
    
    output_file = output_dir / "goonumbla_complete_dataset.json"
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✅ Complete dataset saved to: {output_file}")
    print("\n" + "="*80)
    print("EXTRACTION COMPLETE")
    print("="*80)
    
    return complete_result

if __name__ == "__main__":
    result = main()
