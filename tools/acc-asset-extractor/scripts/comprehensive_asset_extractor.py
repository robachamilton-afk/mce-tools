"""
Comprehensive Asset Extractor
Extracts assets from all asset-relevant documents identified by the document reviewer
Uses LLM to extract structured asset data from each document
"""
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import pdfplumber
from openai import OpenAI

class ComprehensiveAssetExtractor:
    def __init__(self, asset_relevant_docs_file: str):
        self.asset_relevant_docs_file = Path(asset_relevant_docs_file)
        with open(self.asset_relevant_docs_file) as f:
            self.asset_docs = json.load(f)
        
        self.client = OpenAI()
        self.extracted_assets = []
        self.extraction_log = []
        
    def extract_all_assets(self, start_idx: int = 0, batch_size: int = 50):
        """
        Extract assets from all asset-relevant documents
        Uses LLM to identify and extract structured asset data
        """
        total = len(self.asset_docs)
        print(f"{'='*80}", flush=True)
        print(f"COMPREHENSIVE ASSET EXTRACTION", flush=True)
        print(f"{'='*80}", flush=True)
        print(f"Total asset-relevant documents: {total}", flush=True)
        print(f"Starting from index: {start_idx}", flush=True)
        print(f"Batch size: {batch_size}", flush=True)
        print(f"{'='*80}\n", flush=True)
        
        for i in range(start_idx, total, batch_size):
            batch_end = min(i + batch_size, total)
            batch_docs = self.asset_docs[i:batch_end]
            
            print(f"\n[Batch {i//batch_size + 1}] Extracting from documents {i+1} to {batch_end} of {total}", flush=True)
            
            self._extract_batch(batch_docs, i)
            
            # Save progress after each batch
            self._save_progress()
            
            print(f"  ✓ Batch complete. Total assets extracted: {len(self.extracted_assets)}", flush=True)
        
        print(f"\n{'='*80}", flush=True)
        print(f"EXTRACTION COMPLETE", flush=True)
        print(f"{'='*80}", flush=True)
        print(f"Total documents processed: {total}", flush=True)
        print(f"Total assets extracted: {len(self.extracted_assets)}", flush=True)
        print(f"{'='*80}\n", flush=True)
        
        return self.extracted_assets
    
    def _extract_batch(self, batch_docs: List[Dict], start_idx: int):
        """Extract assets from a batch of documents"""
        for idx, doc_entry in enumerate(batch_docs):
            doc_idx = start_idx + idx + 1
            self._extract_from_document(doc_entry, doc_idx)
    
    def _extract_from_document(self, doc_entry: Dict, doc_idx: int):
        """Extract assets from a single document"""
        pdf_path = Path(doc_entry['path'])
        filename = doc_entry['filename']
        
        if not pdf_path.exists():
            print(f"  [{doc_idx}] ⚠ File not found: {filename}", flush=True)
            return
        
        try:
            # Extract document content
            doc_content = self._extract_document_content(pdf_path)
            
            # Extract assets using LLM
            assets = self._extract_assets_with_llm(doc_content, doc_entry)
            
            if assets and len(assets) > 0:
                print(f"  [{doc_idx}] ✓ Extracted {len(assets)} assets from: {filename}", flush=True)
                self.extracted_assets.extend(assets)
            else:
                print(f"  [{doc_idx}] - No assets extracted from: {filename}", flush=True)
            
            # Log the extraction
            self.extraction_log.append({
                'index': doc_idx,
                'path': str(pdf_path),
                'filename': filename,
                'assets_extracted': len(assets) if assets else 0,
                'timestamp': datetime.now().isoformat()
            })
                
        except Exception as e:
            print(f"  [{doc_idx}] ✗ Error extracting from {filename}: {e}", flush=True)
            self.extraction_log.append({
                'index': doc_idx,
                'path': str(pdf_path),
                'filename': filename,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    def _extract_document_content(self, pdf_path: Path) -> str:
        """Extract all text from document"""
        all_text = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        all_text.append(f"[Page {page_idx+1}]\n{text}")
        except Exception as e:
            return f"Error extracting text: {e}"
        
        return '\n\n'.join(all_text)
    
    def _extract_assets_with_llm(self, doc_content: str, doc_entry: Dict) -> List[Dict]:
        """Use LLM to extract structured asset data from document"""
        
        classification = doc_entry.get('classification', {})
        asset_types = classification.get('asset_types', [])
        document_type = classification.get('document_type', 'unknown')
        
        prompt = f"""You are extracting physical assets from a solar farm engineering document for an asset register.

DOCUMENT INFO:
- Filename: {doc_entry['filename']}
- Document type: {document_type}
- Expected asset types: {', '.join(asset_types)}

DOCUMENT CONTENT:
{doc_content}

TASK:
Extract ALL individual physical assets from this document that should be tracked in an asset register.

ASSET TYPES TO EXTRACT:
- Equipment: Inverters, transformers, switchgear, RMUs, PCUs, combiner boxes, trackers, meters, panels
- Cables: MV cables, DC cables, control cables, communication cables (with circuit IDs)
- Structures: Foundations, piles, mounting structures, buildings, fences, gates
- Systems: SCADA, monitoring equipment, weather stations, security systems
- Electrical: Circuit breakers, disconnects, fuses, surge arrestors, insulators

EXTRACTION RULES:
1. Extract individual asset instances, not just types
2. Include asset identifiers (equipment IDs, cable IDs, circuit numbers)
3. Extract quantities if specified
4. Include location information (block, zone, building)
5. Include specifications (model, rating, size, capacity)
6. For cables: extract circuit ID, type, voltage, size, length, route
7. For equipment: extract tag/ID, type, manufacturer, model, rating
8. For structures: extract ID, type, location, dimensions

Return a JSON object with this structure:
{{
  "assets": [
    {{
      "asset_id": "unique identifier or tag",
      "name": "descriptive name",
      "category": "equipment|cable|structure|system|electrical",
      "type": "specific type (e.g., inverter, MV cable, foundation)",
      "location": "block/zone/building",
      "quantity": 1,
      "specifications": {{
        "manufacturer": "...",
        "model": "...",
        "rating": "...",
        "voltage": "...",
        "size": "...",
        "capacity": "...",
        "length": "...",
        "from": "...",
        "to": "..."
      }},
      "confidence": 0.0-1.0
    }}
  ]
}}

If no assets can be extracted, return {{"assets": []}}
"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting structured asset data from engineering documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Handle different response formats
            if isinstance(result, dict):
                assets = result.get('assets', [])
            elif isinstance(result, list):
                assets = result
            else:
                assets = []
            
            # Add source metadata to each asset
            for asset in assets:
                asset['source_document'] = doc_entry['filename']
                asset['source_path'] = doc_entry['path']
            
            return assets
            
        except Exception as e:
            print(f"    Error in LLM extraction: {e}", flush=True)
            return []
    
    def _save_progress(self):
        """Save current progress"""
        output_dir = Path("/home/ubuntu/acc-tools/poc/output")
        output_dir.mkdir(exist_ok=True, parents=True)
        
        # Save extracted assets
        with open(output_dir / "extracted_assets.json", 'w') as f:
            json.dump(self.extracted_assets, f, indent=2)
        
        # Save extraction log
        with open(output_dir / "asset_extraction_log.json", 'w') as f:
            json.dump(self.extraction_log, f, indent=2)

def main():
    asset_docs_file = "/home/ubuntu/acc-tools/poc/output/asset_relevant_documents.json"
    
    extractor = ComprehensiveAssetExtractor(asset_docs_file)
    assets = extractor.extract_all_assets(start_idx=0, batch_size=50)
    
    print(f"\n✅ Extraction complete!", flush=True)
    print(f"   Total assets extracted: {len(assets)}", flush=True)
    print(f"   Saved to: extracted_assets.json", flush=True)

if __name__ == "__main__":
    main()
