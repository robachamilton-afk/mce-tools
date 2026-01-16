"""
Document Review Script - Identify key asset source documents in Goonumbla
"""
from pathlib import Path
import re

def categorize_document(filename: str) -> str:
    """Categorize document by likely asset content"""
    fn_lower = filename.lower()
    
    if any(x in fn_lower for x in ['equipment', 'list', 'schedule']):
        return "EQUIPMENT_LIST"
    elif any(x in fn_lower for x in ['cable', 'cabling']):
        return "CABLE_SCHEDULE"
    elif 'calculation' in fn_lower or 'calc' in fn_lower:
        return "CALCULATION"
    elif 'vendor' in fn_lower:
        return "VENDOR_DRAWING"
    elif 'specification' in fn_lower or 'spec' in fn_lower:
        return "SPECIFICATION"
    elif 'bom' in fn_lower or 'bill of materials' in fn_lower:
        return "BOM"
    elif 'report' in fn_lower or 'rpt' in fn_lower:
        return "REPORT"
    elif 'drawing' in fn_lower or 'drw' in fn_lower:
        return "DRAWING"
    else:
        return "OTHER"

def main():
    base_path = Path("/home/ubuntu/design-docs/goonumbla")
    
    # Find all PDFs and Excel files
    all_docs = list(base_path.rglob("*.pdf")) + list(base_path.rglob("*.xlsx")) + list(base_path.rglob("*.xls"))
    
    # Categorize
    categories = {}
    for doc in all_docs:
        cat = categorize_document(doc.name)
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(doc)
    
    # Print summary
    print("="*80)
    print("GOONUMBLA DOCUMENT REVIEW")
    print("="*80)
    print(f"\nTotal documents: {len(all_docs)}")
    
    # Priority categories for asset extraction
    priority_cats = ["EQUIPMENT_LIST", "CABLE_SCHEDULE", "CALCULATION", "SPECIFICATION", "VENDOR_DRAWING"]
    
    for cat in priority_cats:
        if cat in categories:
            print(f"\n### {cat} ({len(categories[cat])} files) ###")
            for doc in sorted(categories[cat])[:10]:  # Show first 10
                rel_path = doc.relative_to(base_path)
                print(f"  - {rel_path}")
            if len(categories[cat]) > 10:
                print(f"  ... and {len(categories[cat]) - 10} more")
    
    # Save full list
    output_file = Path("/home/ubuntu/acc-tools/poc/output/document_inventory.txt")
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w') as f:
        for cat in sorted(categories.keys()):
            f.write(f"\n{'='*80}\n")
            f.write(f"{cat} ({len(categories[cat])} files)\n")
            f.write(f"{'='*80}\n")
            for doc in sorted(categories[cat]):
                f.write(f"{doc.relative_to(base_path)}\n")
    
    print(f"\n✅ Full inventory saved to: {output_file}")

if __name__ == "__main__":
    main()
