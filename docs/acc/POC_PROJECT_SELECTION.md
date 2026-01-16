# POC Project Selection Analysis

**Date:** January 11, 2026  
**Purpose:** Determine which project to use for the minimal POC

---

## Option 1: Use Existing Project (Goonumbla, Clare, or Haughton)

### ✅ Advantages

**1. Already Analyzed**
- We understand the structure
- We know where the BOMs are
- We've seen the naming conventions
- No surprises

**2. Faster Start**
- Documents already downloaded
- Can start coding immediately
- No waiting for new uploads

**3. Known Complexity**
- Goonumbla: Clean, comprehensive BOM
- Clare: Simpler structure, multiple BOMs
- Haughton: Complex, realistic chaos

### ❌ Disadvantages

**1. We've Already "Seen" These**
- Risk of overfitting our solution to these specific projects
- May miss patterns that exist in other projects
- Less representative of a "fresh" project

**2. Large File Sets**
- 500-600 files per project
- May be overwhelming for initial testing
- Harder to debug issues

---

## Option 2: New Project

### ✅ Advantages

**1. True Test of Flexibility**
- Will reveal if our data model handles new patterns
- Tests our assumptions
- More realistic "cold start" scenario

**2. Can Be Smaller**
- You could provide just the essential documents
- Easier to debug and iterate
- Faster processing

**3. Fresh Perspective**
- Forces us to think generically
- Prevents overfitting
- Better validation of the design

### ❌ Disadvantages

**1. Unknown Complexity**
- Might have unexpected issues
- Could slow down POC development
- May need to refine data model

**2. Requires Upload Time**
- You need to prepare and upload
- Adds delay before we can start

---

## My Recommendation: **Goonumbla (Existing Project)**

Here's why:

### 1. Best BOM Quality

Looking at what we've already analyzed:
- **Goonumbla BOM** (`GOO-ISE-GE-RPT-0003_C1-Bill of Materials (BOM).xlsx`) is well-structured
- Has clear columns: Description, Quantity, Unit, Manufacturer, Model
- Contains the full asset hierarchy
- Already extracted and analyzed

### 2. Has Drawing Register

- Goonumbla has a comprehensive drawing list
- This lets us test the "register vs. filesystem" reconciliation
- Can validate document metadata extraction

### 3. Representative Complexity

- Not too simple (like Clare)
- Not too chaotic (like Haughton)
- Good "middle ground" for POC

### 4. Fast Start

- Already downloaded
- Already analyzed
- Can start coding today

---

## POC Scope with Goonumbla

### Phase 1: BOM Extraction (Week 1)

**Input:** `GOO-ISE-GE-RPT-0003_C1-Bill of Materials (BOM).xlsx`

**Process:**
1. Parse Excel file
2. Extract asset data (name, category, specs)
3. Map to our data model
4. Generate internal JSON representation

**Output:** JSON file with extracted assets

### Phase 2: ACC Excel Generation (Week 1-2)

**Input:** JSON file from Phase 1

**Process:**
1. Map our data model to ACC template format
2. Generate hierarchical categories (with ">")
3. Populate all required fields
4. Handle optional fields

**Output:** ACC-compatible Excel file

### Phase 3: Manual Testing (Week 2)

**Process:**
1. You upload the Excel to ACC
2. Test asset creation
3. Test document linking
4. Document any issues or gaps

**Output:** Feedback document with learnings

---

## What We'll Learn from Goonumbla POC

### 1. Data Model Validation

- Does our asset schema capture everything in the BOM?
- Are there fields we missed?
- Is the category structure correct?

### 2. ACC Template Validation

- Does the ACC Excel format work as expected?
- Are there required fields we don't have?
- How does ACC handle hierarchical categories?

### 3. Extraction Feasibility

- How accurate is deterministic BOM parsing?
- What edge cases exist?
- How much manual cleanup is needed?

### 4. Process Gaps

- What's missing from our pipeline design?
- Where do we need user checkpoints?
- What's the actual manual effort?

---

## Alternative: If You Want to Use a New Project

If you'd prefer to test with a new project, here's what would be most helpful:

**Ideal New Project Characteristics:**
1. **Small scope** (100-200 files, not 500+)
2. **Has a BOM** (Excel or PDF)
3. **Has a drawing register** (optional but useful)
4. **Solar or BESS** (we understand these best)
5. **Single design stage** (IFC or 80% - don't need multiple stages yet)

**What You'd Provide:**
- The BOM file
- The drawing register (if available)
- A sample of 10-20 key drawings
- Any project-specific documentation standards

This would give us enough to test extraction and ACC generation without overwhelming the POC.

---

## My Final Recommendation

**Use Goonumbla for the POC**, because:

1. ✅ We can start immediately
2. ✅ BOM is high quality and already analyzed
3. ✅ Has drawing register for reconciliation testing
4. ✅ Representative complexity
5. ✅ Fast feedback loop

**Then, after the POC succeeds**, we can:
- Test with a new project to validate flexibility
- Refine the extraction logic based on learnings
- Expand to handle more document types

This is the "crawl, walk, run" approach:
- **Crawl:** Goonumbla POC (prove the concept)
- **Walk:** New project (prove flexibility)
- **Run:** Full automation (prove scalability)

**What do you think?**
