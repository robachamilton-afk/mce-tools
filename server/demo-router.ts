import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export const demoRouter = router({
  simulateWorkflow: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const projectId = input.projectId;

      // Generate IDs for documents
      const docId1 = "doc-001-clare-im";
      const docId2 = "doc-002-grid-study";
      const docId3 = "doc-003-geotech";
      const docId4 = "doc-004-planning";

      // Delete existing demo data for this project first
      await db.execute(sql.raw(`DELETE FROM processing_jobs WHERE project_id = ${projectId}`));
      await db.execute(sql.raw(`DELETE FROM red_flags WHERE project_id = ${projectId}`));
      await db.execute(sql.raw(`DELETE FROM extracted_facts WHERE project_id = ${projectId}`));
      await db.execute(sql.raw(`DELETE FROM documents WHERE project_id = ${projectId}`));

      const now = new Date();
      // Convert to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
      const formatDateTime = (date: Date) => {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      };
      const nowStr = formatDateTime(now);

      // Helper to escape SQL strings
      const escapeSQL = (str: string | null) => {
        if (str === null) return 'NULL';
        return `'${str.replace(/'/g, "''")}'`;
      };

      // Insert dummy documents using raw SQL (bypass parameter binding)
      await db.execute(sql.raw(`
        INSERT INTO documents (id, project_id, file_name, file_path, file_size_bytes, file_hash, document_type, upload_date, status, extracted_text, page_count) 
        VALUES (${escapeSQL(docId1)}, ${projectId}, ${escapeSQL("Clare_Solar_Farm_IM_v2.1.pdf")}, ${escapeSQL(`/uploads/project_${projectId}/${docId1}.pdf`)}, 2458624, ${escapeSQL("a1b2c3d4e5f6")}, ${escapeSQL("Information Memorandum")}, ${escapeSQL(nowStr)}, ${escapeSQL("processed")}, ${escapeSQL("Extracted text from IM document...")}, 45)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO documents (id, project_id, file_name, file_path, file_size_bytes, file_hash, document_type, upload_date, status, extracted_text, page_count) 
        VALUES (${escapeSQL(docId2)}, ${projectId}, ${escapeSQL("Grid_Connection_Study_Final.pdf")}, ${escapeSQL(`/uploads/project_${projectId}/${docId2}.pdf`)}, 1856432, ${escapeSQL("f6e5d4c3b2a1")}, ${escapeSQL("Grid Study")}, ${escapeSQL(nowStr)}, ${escapeSQL("processed")}, ${escapeSQL("Extracted text from grid study...")}, 32)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO documents (id, project_id, file_name, file_path, file_size_bytes, file_hash, document_type, upload_date, status, extracted_text, page_count) 
        VALUES (${escapeSQL(docId3)}, ${projectId}, ${escapeSQL("Geotechnical_Investigation_Report.pdf")}, ${escapeSQL(`/uploads/project_${projectId}/${docId3}.pdf`)}, 3245678, ${escapeSQL("b2c3d4e5f6a1")}, ${escapeSQL("Geotech Report")}, ${escapeSQL(nowStr)}, ${escapeSQL("processed")}, ${escapeSQL("Extracted text from geotech report...")}, 28)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO documents (id, project_id, file_name, file_path, file_size_bytes, file_hash, document_type, upload_date, status, extracted_text, page_count) 
        VALUES (${escapeSQL(docId4)}, ${projectId}, ${escapeSQL("Planning_Approval_Application.pdf")}, ${escapeSQL(`/uploads/project_${projectId}/${docId4}.pdf`)}, 1234567, ${escapeSQL("c3d4e5f6a1b2")}, ${escapeSQL("Planning Document")}, ${escapeSQL(nowStr)}, ${escapeSQL("processed")}, ${escapeSQL("Extracted text from planning document...")}, 18)
      `));

      // Insert dummy facts using raw SQL
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-001")}, ${projectId}, ${escapeSQL("Project_Details")}, ${escapeSQL("Project Name")}, ${escapeSQL("Clare Solar Farm")}, ${escapeSQL("string")}, ${escapeSQL("0.98")}, ${escapeSQL(docId1)}, ${escapeSQL("Page 1, Section 1.1")}, ${escapeSQL("deterministic")}, NULL, 1, ${escapeSQL("approved")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-002")}, ${projectId}, ${escapeSQL("Technical_Specifications")}, ${escapeSQL("Total Capacity (MW)")}, ${escapeSQL("150")}, ${escapeSQL("number")}, ${escapeSQL("0.95")}, ${escapeSQL(docId1)}, ${escapeSQL("Page 3, Table 2")}, ${escapeSQL("deterministic")}, NULL, 1, ${escapeSQL("approved")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-003")}, ${projectId}, ${escapeSQL("Technical_Specifications")}, ${escapeSQL("Technology Type")}, ${escapeSQL("Bifacial PV Modules")}, ${escapeSQL("string")}, ${escapeSQL("0.92")}, ${escapeSQL(docId1)}, ${escapeSQL("Page 5")}, ${escapeSQL("llm")}, ${escapeSQL("llama3")}, 0, ${escapeSQL("pending")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-004")}, ${projectId}, ${escapeSQL("Grid_Connection")}, ${escapeSQL("Connection Point")}, ${escapeSQL("Clare 132kV Substation")}, ${escapeSQL("string")}, ${escapeSQL("0.96")}, ${escapeSQL(docId2)}, ${escapeSQL("Page 2")}, ${escapeSQL("deterministic")}, NULL, 1, ${escapeSQL("approved")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-005")}, ${projectId}, ${escapeSQL("Grid_Connection")}, ${escapeSQL("Grid Capacity Constraint")}, ${escapeSQL("Limited to 100MW during peak")}, ${escapeSQL("string")}, ${escapeSQL("0.88")}, ${escapeSQL(docId2)}, ${escapeSQL("Page 8, Section 3.2")}, ${escapeSQL("llm")}, ${escapeSQL("llama3")}, 0, ${escapeSQL("pending")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-006")}, ${projectId}, ${escapeSQL("Timeline")}, ${escapeSQL("Expected COD")}, ${escapeSQL("2026-Q3")}, ${escapeSQL("date")}, ${escapeSQL("0.90")}, ${escapeSQL(docId1)}, ${escapeSQL("Page 12")}, ${escapeSQL("deterministic")}, NULL, 0, ${escapeSQL("pending")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-007")}, ${projectId}, ${escapeSQL("Financial")}, ${escapeSQL("Estimated CAPEX")}, ${escapeSQL("$225M AUD")}, ${escapeSQL("currency")}, ${escapeSQL("0.85")}, ${escapeSQL(docId1)}, ${escapeSQL("Page 15")}, ${escapeSQL("llm")}, ${escapeSQL("llama3")}, 0, ${escapeSQL("pending")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-008")}, ${projectId}, ${escapeSQL("Site_Conditions")}, ${escapeSQL("Soil Type")}, ${escapeSQL("Clay with moderate bearing capacity")}, ${escapeSQL("string")}, ${escapeSQL("0.80")}, ${escapeSQL(docId3)}, ${escapeSQL("Page 5")}, ${escapeSQL("llm")}, ${escapeSQL("llama3")}, 0, ${escapeSQL("pending")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-009")}, ${projectId}, ${escapeSQL("Planning")}, ${escapeSQL("Planning Approval Status")}, ${escapeSQL("Pending - submitted Dec 2025")}, ${escapeSQL("string")}, ${escapeSQL("0.94")}, ${escapeSQL(docId4)}, ${escapeSQL("Page 1")}, ${escapeSQL("deterministic")}, NULL, 1, ${escapeSQL("approved")})
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO extracted_facts (id, project_id, category, \`key\`, value, data_type, confidence, source_document_id, source_location, extraction_method, extraction_model, verified, verification_status) 
        VALUES (${escapeSQL("fact-010")}, ${projectId}, ${escapeSQL("Risk")}, ${escapeSQL("Grid Curtailment Risk")}, ${escapeSQL("High - 30% curtailment expected")}, ${escapeSQL("string")}, ${escapeSQL("0.75")}, ${escapeSQL(docId2)}, ${escapeSQL("Page 12")}, ${escapeSQL("llm")}, ${escapeSQL("llama3")}, 0, ${escapeSQL("pending")})
      `));

      // Insert dummy red flags using raw SQL
      await db.execute(sql.raw(`
        INSERT INTO red_flags (id, project_id, category, title, description, severity, trigger_fact_id, downstream_consequences, mitigated) 
        VALUES (${escapeSQL("flag-001")}, ${projectId}, ${escapeSQL("Grid")}, ${escapeSQL("Grid Capacity Constraint Identified")}, ${escapeSQL("Connection point limited to 100MW during peak demand, project capacity is 150MW")}, ${escapeSQL("high")}, ${escapeSQL("fact-005")}, ${escapeSQL("Potential revenue loss due to curtailment, may require grid augmentation")}, 0)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO red_flags (id, project_id, category, title, description, severity, trigger_fact_id, downstream_consequences, mitigated) 
        VALUES (${escapeSQL("flag-002")}, ${projectId}, ${escapeSQL("Planning")}, ${escapeSQL("Planning Approval Not Yet Granted")}, ${escapeSQL("Planning application submitted but approval pending, COD at risk")}, ${escapeSQL("medium")}, ${escapeSQL("fact-009")}, ${escapeSQL("Project timeline delay, potential cost overruns")}, 0)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO red_flags (id, project_id, category, title, description, severity, trigger_fact_id, downstream_consequences, mitigated) 
        VALUES (${escapeSQL("flag-003")}, ${projectId}, ${escapeSQL("Grid")}, ${escapeSQL("High Curtailment Risk")}, ${escapeSQL("30% curtailment expected based on grid study, impacts project economics")}, ${escapeSQL("high")}, ${escapeSQL("fact-010")}, ${escapeSQL("Reduced revenue, longer payback period")}, 0)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO red_flags (id, project_id, category, title, description, severity, trigger_fact_id, downstream_consequences, mitigated) 
        VALUES (${escapeSQL("flag-004")}, ${projectId}, ${escapeSQL("Performance")}, ${escapeSQL("Soil Conditions May Impact Foundation Design")}, ${escapeSQL("Clay soil with moderate bearing capacity may require specialized foundations")}, ${escapeSQL("low")}, ${escapeSQL("fact-008")}, ${escapeSQL("Increased CAPEX for foundations")}, 0)
      `));

      // Insert dummy processing jobs using raw SQL
      const twoHoursAgo = formatDateTime(new Date(now.getTime() - 2 * 60 * 60 * 1000));
      const oneHour55Ago = formatDateTime(new Date(now.getTime() - 115 * 60 * 1000));
      const oneHour45Ago = formatDateTime(new Date(now.getTime() - 105 * 60 * 1000));
      const oneHour30Ago = formatDateTime(new Date(now.getTime() - 90 * 60 * 1000));
      const oneHour25Ago = formatDateTime(new Date(now.getTime() - 85 * 60 * 1000));

      await db.execute(sql.raw(`
        INSERT INTO processing_jobs (id, project_id, document_id, job_type, status, progress, started_at, completed_at, error_message) 
        VALUES (${escapeSQL("job-001")}, ${projectId}, ${escapeSQL(docId1)}, ${escapeSQL("text_extraction")}, ${escapeSQL("completed")}, 100, ${escapeSQL(twoHoursAgo)}, ${escapeSQL(oneHour55Ago)}, NULL)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO processing_jobs (id, project_id, document_id, job_type, status, progress, started_at, completed_at, error_message) 
        VALUES (${escapeSQL("job-002")}, ${projectId}, ${escapeSQL(docId1)}, ${escapeSQL("fact_extraction")}, ${escapeSQL("completed")}, 100, ${escapeSQL(oneHour55Ago)}, ${escapeSQL(oneHour45Ago)}, NULL)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO processing_jobs (id, project_id, document_id, job_type, status, progress, started_at, completed_at, error_message) 
        VALUES (${escapeSQL("job-003")}, ${projectId}, ${escapeSQL(docId2)}, ${escapeSQL("text_extraction")}, ${escapeSQL("completed")}, 100, ${escapeSQL(oneHour30Ago)}, ${escapeSQL(oneHour25Ago)}, NULL)
      `));
      
      await db.execute(sql.raw(`
        INSERT INTO processing_jobs (id, project_id, document_id, job_type, status, progress, started_at, completed_at, error_message) 
        VALUES (${escapeSQL("job-004")}, ${projectId}, ${escapeSQL(docId2)}, ${escapeSQL("fact_extraction")}, ${escapeSQL("processing")}, 65, ${escapeSQL(oneHour25Ago)}, NULL, NULL)
      `));

      return {
        success: true,
        message: "Demo data loaded successfully",
        stats: {
          documents: 4,
          facts: 10,
          redFlags: 4,
          processingJobs: 4,
        },
      };
    }),
});
