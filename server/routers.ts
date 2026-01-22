import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { createProject, getProjectsByUser, getProjectById, getDb } from "./db";
import { ollamaConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { uploadDocument } from "./document-service";
import { processDocument } from "./document-processor-v2";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  ollama: router({
    getConfig: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [rows] = await db.execute("SELECT * FROM ollama_config LIMIT 1") as any;
      return rows[0] || null;
    }),
    updateConfig: protectedProcedure
      .input(z.object({
        baseUrl: z.string(),
        model: z.string(),
        temperature: z.string(),
        topP: z.string(),
        timeoutSeconds: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [existing] = await db.execute("SELECT id FROM ollamaConfig LIMIT 1") as any;
        
        if (existing.length > 0) {
          await db.update(ollamaConfig)
            .set({
              baseUrl: input.baseUrl,
              model: input.model,
              temperature: input.temperature,
              topP: input.topP,
              timeoutSeconds: input.timeoutSeconds,
              updatedAt: new Date(),
            })
            .where(eq(ollamaConfig.id, existing[0].id));
        } else {
          await db.insert(ollamaConfig).values({
            baseUrl: input.baseUrl,
            model: input.model,
            temperature: input.temperature,
            topP: input.topP,
            timeoutSeconds: input.timeoutSeconds,
          });
        }
        
        return { success: true };
      }),
    testConnection: publicProcedure
      .input(z.object({ serverUrl: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const response = await fetch(`${input.serverUrl}/api/tags`);
          if (!response.ok) throw new Error("Connection failed");
          return { success: true };
        } catch (error) {
          throw new Error("Unable to connect to Ollama server");
        }
      }),
  }),

  documents: router({    upload: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
          documentType: z.enum(["IM", "DD_PACK", "CONTRACT", "GRID_STUDY", "CONCEPT_DESIGN", "OTHER"]),
          fileData: z.string(), // base64 encoded
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, "base64");
        
        // Upload document
        const document = await uploadDocument(
          input.projectId,
          input.fileName,
          fileBuffer,
          input.fileType,
          input.fileSize,
          input.documentType,
          ctx.user.id
        );

        // Start processing asynchronously
        const projectIdNum = parseInt(input.projectId.replace(/^proj_/, ""));
        processDocument(projectIdNum, document.id, document.filePath, input.documentType).catch(err => {
          console.error(`Failed to process document ${document.id}:`, err);
        });

        return document;
      }),
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        const [rows] = await db.execute(
          "SELECT * FROM documents WHERE deleted_at IS NULL ORDER BY uploaded_at DESC"
        );
        return rows as unknown as any[];
      }),
    getProcessingStatus: protectedProcedure
      .input(z.object({ projectId: z.string(), documentId: z.string() }))
      .query(async ({ input }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        const [rows] = await db.execute(
          "SELECT processing_status, processing_error FROM documents WHERE id = ?"
        );
        return (rows as unknown as any[])[0] || null;
      }),
  }),

  demo: router({
    simulateWorkflow: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const {
          generateDummyDocuments,
          generateDummyFacts,
          generateDummyRedFlags,
          generateDummyProcessingJobs,
        } = await import("./dummy-data-generator");
        
        const db = await getProjectDb(input.projectId);
        
        // Generate dummy data
        const documents = generateDummyDocuments();
        const facts = generateDummyFacts(documents);
        const redFlags = generateDummyRedFlags(facts);
        const jobs = generateDummyProcessingJobs(documents);
        
        // Helper to escape strings for SQL
        const escapeString = (str: string) => str.replace(/'/g, "''");
        
        // Insert documents
        for (const doc of documents) {
          await db.execute(
            `INSERT INTO documents (id, fileName, filePath, fileSizeBytes, fileHash, documentType, uploadDate, status, extractedText, pageCount) 
             VALUES ('${doc.id}', '${escapeString(doc.fileName)}', '${escapeString(doc.filePath)}', ${doc.fileSizeBytes}, '${doc.fileHash}', '${doc.documentType}', '${doc.uploadDate.toISOString().slice(0, 19).replace('T', ' ')}', '${doc.status}', '${escapeString(doc.extractedText)}', ${doc.pageCount})`
          );
        }
        
        // Insert facts
        for (const fact of facts) {
          await db.execute(
            `INSERT INTO facts (id, category, \`key\`, value, dataType, confidence, sourceDocumentId, sourceLocation, extractionMethod, extractionModel, verified) 
             VALUES ('${fact.id}', '${fact.category}', '${escapeString(fact.key)}', '${escapeString(fact.value)}', '${fact.dataType}', ${fact.confidence}, '${fact.sourceDocumentId}', '${escapeString(fact.sourceLocation)}', '${fact.extractionMethod}', ${fact.extractionModel ? `'${fact.extractionModel}'` : 'NULL'}, ${fact.verified})`
          );
        }
        
        // Insert red flags
        for (const flag of redFlags) {
          const categoryMap: Record<string, string> = {
            'Grid_Integration': 'Grid',
            'Planning_Approvals': 'Planning',
            'Technical_Design': 'Performance',
          };
          const mappedCategory = categoryMap[flag.category] || 'Other';
          
          await db.execute(
            `INSERT INTO redFlags (id, category, title, description, severity, triggerFactId, downstreamConsequences, mitigated) 
             VALUES ('${flag.id}', '${mappedCategory}', '${escapeString(flag.title)}', '${escapeString(flag.description)}', '${flag.severity}', NULL, '${escapeString(flag.impact)}', FALSE)`
          );
        }
        
        // Insert processing jobs
        for (const job of jobs) {
          await db.execute(
            `INSERT INTO processing_jobs (id, document_id, status, stage, progress_percent, error_message, started_at, completed_at, estimated_completion) 
             VALUES ('${job.id}', '${job.document_id}', '${job.status}', '${job.stage}', ${job.progress_percent}, ${job.error_message ? `'${escapeString(job.error_message)}'` : 'NULL'}, '${job.started_at.toISOString().slice(0, 19).replace('T', ' ')}', ${job.completed_at ? `'${job.completed_at.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'}, ${job.estimated_completion ? `'${job.estimated_completion.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'})`
          );
        }
        
        return { 
          success: true, 
          counts: {
            documents: documents.length,
            facts: facts.length,
            redFlags: redFlags.length,
            jobs: jobs.length,
          }
        };
      }),
  }),

  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getProjectsByUser(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await getProjectById(input.projectId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Project name is required"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const dbName = `proj_${ctx.user.id}_${Date.now()}`;
        return await createProject(
          input.name,
          input.description || null,
          dbName,
          ctx.user.id
        );
      }),
  }),

  processing: router({
    listJobs: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        
        const [rows] = await db.execute(
          `SELECT pj.*, d.file_name as document_name 
           FROM processing_jobs pj 
           LEFT JOIN documents d ON pj.document_id = d.id 
           ORDER BY pj.started_at DESC`
        );
        return rows as unknown as any[];
      }),
    retryJob: protectedProcedure
      .input(z.object({ projectId: z.string(), jobId: z.number() }))
      .mutation(async ({ input }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        
        await db.execute(
          "UPDATE processing_jobs SET status = 'queued', error_message = NULL WHERE id = ?"
        );
        
        return { success: true };
      }),
  }),

  facts: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        const [rows] = await db.execute(
          "SELECT * FROM extracted_facts WHERE deleted_at IS NULL ORDER BY confidence_score DESC, created_at DESC"
        );
        return rows as unknown as any[];
      }),
    update: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          factId: z.number(),
          status: z.enum(["pending", "approved", "rejected"]),
          value: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        
        const updates: string[] = ["verification_status = ?"];
        const params: any[] = [input.status];
        
        if (input.value !== undefined) {
          updates.push("value = ?");
          params.push(input.value);
        }
        
        params.push(input.factId);
        
        await db.execute(
          `UPDATE extracted_facts SET ${updates.join(", ")} WHERE id = ?`
        );
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
