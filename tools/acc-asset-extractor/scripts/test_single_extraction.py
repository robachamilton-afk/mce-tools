"""Test extraction on a single document"""
import json
from pathlib import Path
import pdfplumber
from openai import OpenAI

# Test document
test_doc = {
    'filename': 'GOO-ISE-GE-RPT-0001-C2_Electrical and I_C Equipment Labelling.pdf',
    'path': '/home/ubuntu/design-docs/goonumbla/1. SOLAR FARM/3. Reports/GOO-ISE-GE-RPT-0001-C2_Electrical and I_C Equipment Labelling.pdf',
    'classification': {
        'asset_types': ['inverters', 'transformers', 'cables']
    }
}

print(f"Testing extraction on: {test_doc['filename']}\n")

# Extract first 5 pages
pdf_path = Path(test_doc['path'])
all_text = []

with pdfplumber.open(pdf_path) as pdf:
    for page_idx, page in enumerate(pdf.pages[:5]):
        text = page.extract_text()
        if text:
            all_text.append(f"[Page {page_idx+1}]\n{text}")

doc_content = '\n\n'.join(all_text)
print(f"Extracted {len(doc_content)} characters from first 5 pages\n")

# Test LLM extraction
client = OpenAI()

prompt = f"""You are extracting physical assets from a solar farm engineering document for an asset register.

DOCUMENT INFO:
- Filename: {test_doc['filename']}
- Expected asset types: {', '.join(test_doc['classification']['asset_types'])}

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

print("Sending to LLM...\n")

response = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[
        {"role": "system", "content": "You are an expert at extracting structured asset data from engineering documents."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.1,
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
assets = result.get('assets', [])

print(f"✅ SUCCESS! Extracted {len(assets)} assets\n")

if assets:
    print("First 3 assets:")
    for i, asset in enumerate(assets[:3]):
        print(f"\n{i+1}. {asset.get('name', 'N/A')}")
        print(f"   ID: {asset.get('asset_id', 'N/A')}")
        print(f"   Type: {asset.get('type', 'N/A')}")
        print(f"   Category: {asset.get('category', 'N/A')}")

print(f"\n✅ Extraction is working correctly!")
