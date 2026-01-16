"""
Debug script to test asset extraction on a single document
"""
import json
from pathlib import Path
import pdfplumber
from openai import OpenAI

# Load the first asset-relevant document
with open("/home/ubuntu/acc-tools/poc/output/asset_relevant_documents.json") as f:
    asset_docs = json.load(f)

# Test on the Equipment Labelling document (should have lots of assets)
doc_entry = asset_docs[0]
print(f"Testing extraction on: {doc_entry['filename']}")
print(f"Path: {doc_entry['path']}")
print(f"Expected asset types: {doc_entry['classification']['asset_types']}")
print("\n" + "="*80 + "\n")

# Extract document content
pdf_path = Path(doc_entry['path'])
all_text = []

with pdfplumber.open(pdf_path) as pdf:
    for page_idx, page in enumerate(pdf.pages[:5]):  # First 5 pages only for testing
        text = page.extract_text()
        if text:
            all_text.append(f"[Page {page_idx+1}]\n{text}")

doc_content = '\n\n'.join(all_text)
print(f"Extracted text length: {len(doc_content)} characters")
print(f"First 500 chars:\n{doc_content[:500]}")
print("\n" + "="*80 + "\n")

# Test LLM extraction
client = OpenAI()

classification = doc_entry.get('classification', {})
asset_types = classification.get('asset_types', [])

prompt = f"""You are extracting physical assets from a solar farm engineering document for an asset register.

DOCUMENT INFO:
- Filename: {doc_entry['filename']}
- Expected asset types: {', '.join(asset_types)}

DOCUMENT CONTENT (first 5 pages):
{doc_content}

TASK:
Extract ALL individual physical assets from this document that should be tracked in an asset register.

Return a JSON object with this structure:
{{
  "assets": [
    {{
      "asset_id": "unique identifier or tag",
      "name": "descriptive name",
      "category": "equipment|cable|structure|system|electrical",
      "type": "specific type",
      "location": "block/zone/building",
      "quantity": 1,
      "specifications": {{}},
      "confidence": 0.9
    }}
  ]
}}

If no assets can be extracted, return {{"assets": []}}.
"""

print("Sending to LLM...")
print("\n" + "="*80 + "\n")

response = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[
        {"role": "system", "content": "You are an expert at extracting structured asset data from engineering documents."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.1,
    response_format={"type": "json_object"}
)

result_text = response.choices[0].message.content
print(f"LLM Response:\n{result_text}")
print("\n" + "="*80 + "\n")

# Parse response
result = json.loads(result_text)
print(f"Parsed result type: {type(result)}")
print(f"Result keys: {result.keys() if isinstance(result, dict) else 'N/A'}")

if isinstance(result, dict):
    assets = result.get('assets', [])
    print(f"Assets found: {len(assets)}")
    if assets:
        print(f"\nFirst asset:")
        print(json.dumps(assets[0], indent=2))
else:
    print("Result is not a dict!")
    print(result)
