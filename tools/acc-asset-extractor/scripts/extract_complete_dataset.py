"""
Complete Dataset Extraction - Cables and Equipment Only (No BOM)
"""
from pdf_cable_extractor import PDFCableExtractor
from models import ExtractionResult
import json
from pathlib import Path

def main():
    print("="*80)
    print("GOONUMBLA SOLAR FARM - ASSET EXTRACTION")
    print("Extracting from: Calculation Reports & Equipment Lists")
    print("="*80)
    
    # Extract MV cables
    print("\n[1/2] Extracting MV Cables from Calculation Report...")
    mv_extractor = PDFCableExtractor(
        "/home/ubuntu/design-docs/goonumbla/1. SOLAR FARM/3. Reports/GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf"
    )
    mv_result = mv_extractor.parse()
    
    # Note: DC cable extraction needs different table structure handling
    # Substation equipment lists would be added here
    
    # Combine results
    complete_result = ExtractionResult()
    complete_result.assets.extend(mv_result.assets)
    
    # Summary
    print("\n" + "="*80)
    print("EXTRACTION SUMMARY")
    print("="*80)
    print(f"Total Assets: {len(complete_result.assets)}")
    
    # Category breakdown
    category_counts = {}
    for asset in complete_result.assets:
        cat = asset.category
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    print("\n### ASSETS BY CATEGORY ###")
    for cat, count in sorted(category_counts.items()):
        print(f"  {cat}: {count}")
    
    # Completeness
    completeness_counts = {}
    for asset in complete_result.assets:
        level = asset.data_completeness.value
        completeness_counts[level] = completeness_counts.get(level, 0) + 1
    
    print("\n### DATA COMPLETENESS ###")
    for level, count in sorted(completeness_counts.items()):
        pct = (count / len(complete_result.assets)) * 100 if complete_result.assets else 0
        print(f"  {level}: {count} ({pct:.1f}%)")
    
    # Save dataset
    output_dir = Path("/home/ubuntu/acc-tools/poc/output")
    output_dir.mkdir(exist_ok=True)
    
    output_data = {
        'project': 'Goonumbla Solar Farm',
        'extraction_sources': [
            'GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf'
        ],
        'total_assets': len(complete_result.assets),
        'assets': [
            {
                'id': asset.id,
                'name': asset.name,
                'category': asset.category,
                'description': asset.description,
                'specifications': getattr(asset, 'specifications', {}),
                'data_completeness': asset.data_completeness.value,
                'extraction_source': asset.extraction_metadata.source_document if asset.extraction_metadata else None
            }
            for asset in complete_result.assets
        ]
    }
    
    output_file = output_dir / "goonumbla_clean_dataset.json"
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✅ Dataset saved to: {output_file}")
    print("\n" + "="*80)
    
    return complete_result

if __name__ == "__main__":
    result = main()
