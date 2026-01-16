"""
Comprehensive Document Reviewer
Systematically reviews ALL documents to identify asset-relevant content
Uses multimodal understanding - no pre-filtering
"""
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import pdfplumber
from openai import OpenAI

class ComprehensiveDocumentReviewer:
    def __init__(self, pdf_list_file: str):
        self.pdf_list_file = Path(pdf_list_file)
        with open(self.pdf_list_file) as f:
            self.all_pdfs = [line.strip() for line in f if line.strip()]
        
        self.client = OpenAI()
        self.asset_relevant_docs = []
        self.review_log = []
        
    def review_all_documents(self, start_idx: int = 0, batch_size: int = 50):
        """
        Review all documents in batches
        Uses LLM to classify each document for asset relevance
        """
        total = len(self.all_pdfs)
        print(f"{'='*80}", flush=True)
        print(f"COMPREHENSIVE DOCUMENT REVIEW", flush=True)
        print(f"{'='*80}", flush=True)
        print(f"Total documents: {total}", flush=True)
        print(f"Starting from index: {start_idx}", flush=True)
        print(f"Batch size: {batch_size}", flush=True)
        print(f"{'='*80}\n", flush=True)
        
        for i in range(start_idx, total, batch_size):
            batch_end = min(i + batch_size, total)
            batch_pdfs = self.all_pdfs[i:batch_end]
            
            print(f"\n[Batch {i//batch_size + 1}] Processing documents {i+1} to {batch_end} of {total}", flush=True)
            
            self._review_batch(batch_pdfs, i)
            
            # Save progress after each batch
            self._save_progress()
            
            print(f"  ✓ Batch complete. Asset-relevant docs so far: {len(self.asset_relevant_docs)}", flush=True)
        
        print(f"\n{'='*80}", flush=True)
        print(f"REVIEW COMPLETE", flush=True)
        print(f"{'='*80}", flush=True)
        print(f"Total documents reviewed: {total}", flush=True)
        print(f"Asset-relevant documents: {len(self.asset_relevant_docs)}", flush=True)
        print(f"{'='*80}\n", flush=True)
        
        return self.asset_relevant_docs
    
    def _review_batch(self, batch_pdfs: List[str], start_idx: int):
        """Review a batch of documents"""
        for idx, pdf_path in enumerate(batch_pdfs):
            doc_idx = start_idx + idx + 1
            self._review_single_document(pdf_path, doc_idx)
    
    def _review_single_document(self, pdf_path: str, doc_idx: int):
        """Review a single document for asset relevance"""
        pdf_path = Path(pdf_path)
        
        if not pdf_path.exists():
            print(f"  [{doc_idx}] ⚠ File not found: {pdf_path.name}", flush=True)
            return
        
        try:
            # Extract document info
            doc_info = self._extract_document_info(pdf_path)
            
            # Classify document using LLM
            classification = self._classify_document(doc_info)
            
            # Log the review
            review_entry = {
                'index': doc_idx,
                'path': str(pdf_path),
                'filename': pdf_path.name,
                'classification': classification,
                'timestamp': datetime.now().isoformat()
            }
            self.review_log.append(review_entry)
            
            # If asset-relevant, add to list
            if classification.get('is_asset_relevant', False):
                self.asset_relevant_docs.append(review_entry)
                print(f"  [{doc_idx}] ✓ ASSET-RELEVANT: {pdf_path.name}", flush=True)
                print(f"       Reason: {classification.get('reason', 'N/A')}", flush=True)
                print(f"       Asset types: {classification.get('asset_types', 'N/A')}", flush=True)
            else:
                print(f"  [{doc_idx}] - Not relevant: {pdf_path.name}", flush=True)
                
        except Exception as e:
            print(f"  [{doc_idx}] ✗ Error processing {pdf_path.name}: {e}", flush=True)
            self.review_log.append({
                'index': doc_idx,
                'path': str(pdf_path),
                'filename': pdf_path.name,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    def _extract_document_info(self, pdf_path: Path) -> Dict[str, Any]:
        """Extract ALL text from ALL pages - comprehensive extraction"""
        info = {
            'filename': pdf_path.name,
            'path': str(pdf_path),
            'page_count': 0,
            'full_text': '',
            'has_tables': False,
            'table_count': 0
        }
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                info['page_count'] = len(pdf.pages)
                
                # Extract text from ALL pages
                all_text = []
                total_tables = 0
                
                for page_idx, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        all_text.append(f"[Page {page_idx+1}]\n{text}")
                    
                    # Check for tables
                    tables = page.extract_tables()
                    if tables:
                        info['has_tables'] = True
                        total_tables += len(tables)
                
                info['table_count'] = total_tables
                
                # Combine ALL text (no truncation)
                info['full_text'] = '\n\n'.join(all_text)
                
        except Exception as e:
            info['error'] = str(e)
        
        return info
    
    def _classify_document(self, doc_info: Dict[str, Any]) -> Dict[str, Any]:
        """Use LLM to classify if document contains asset-relevant information"""
        
        prompt = f"""You are reviewing a solar farm engineering document to determine if it contains asset information that should be tracked in an asset register.

DOCUMENT INFO:
- Filename: {doc_info['filename']}
- Pages: {doc_info['page_count']}
- Has tables: {doc_info['has_tables']}
- Full document text (all pages):
{doc_info['full_text']}

TASK:
Determine if this document contains information about physical assets that should be tracked individually in an asset register.

ASSET TYPES TO LOOK FOR:
- Equipment: Inverters, transformers, switchgear, RMUs, PCUs, combiner boxes, trackers
- Cables: MV cables, DC cables, control cables, communication cables
- Structures: Foundations, piles, mounting structures, buildings
- Systems: SCADA, monitoring, weather stations
- Electrical: Circuit breakers, disconnects, meters, panels

DOCUMENT TYPES THAT ARE ASSET-RELEVANT:
- Equipment schedules or lists
- Cable schedules
- Single line diagrams (with equipment labels/specs)
- General arrangement drawings (showing equipment layout)
- Equipment specifications
- Vendor drawings with equipment details
- Foundation drawings (indicating equipment locations)
- Calculation reports with equipment/cable tables
- Equipment labeling specifications

DOCUMENT TYPES THAT ARE NOT ASSET-RELEVANT:
- Site location maps (no equipment)
- Topographic surveys
- Soil reports
- General specifications without equipment lists
- Process descriptions without equipment details
- Cover pages, title blocks only

Return a JSON object with:
{{
  "is_asset_relevant": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation of why this is/isn't asset-relevant",
  "asset_types": ["list", "of", "asset", "types", "found"],
  "document_type": "equipment_schedule|cable_schedule|drawing|specification|calculation|other"
}}
"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at reviewing engineering documents for asset management purposes."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            return {
                'is_asset_relevant': False,
                'confidence': 0.0,
                'reason': f'Classification error: {e}',
                'asset_types': [],
                'document_type': 'error'
            }
    
    def _save_progress(self):
        """Save current progress"""
        output_dir = Path("/home/ubuntu/acc-tools/poc/output")
        output_dir.mkdir(exist_ok=True, parents=True)
        
        # Save asset-relevant docs
        with open(output_dir / "asset_relevant_documents.json", 'w') as f:
            json.dump(self.asset_relevant_docs, f, indent=2)
        
        # Save full review log
        with open(output_dir / "document_review_log.json", 'w') as f:
            json.dump(self.review_log, f, indent=2)

def main():
    pdf_list = "/home/ubuntu/acc-tools/poc/output/goonumbla_all_pdfs.txt"
    
    reviewer = ComprehensiveDocumentReviewer(pdf_list)
    asset_docs = reviewer.review_all_documents(start_idx=0, batch_size=50)
    
    print(f"\n✅ Review complete!", flush=True)
    print(f"   Asset-relevant documents: {len(asset_docs)}", flush=True)
    print(f"   Saved to: asset_relevant_documents.json", flush=True)

if __name__ == "__main__":
    main()
