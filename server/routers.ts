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
import { demoRouter } from "./demo-router";
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

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
            documentType: z.enum(["IM", "DD_PACK", "CONTRACT", "GRID_STUDY", "CONCEPT_DESIGN", "OTHER", "AUTO"]),
            fileData: z.string(), // base64 encoded
          })
        )
        .mutation(async ({ input, ctx }) => {
          // Decode base64 file data
          const fileBuffer = Buffer.from(input.fileData, "base64");
          
          // Determine document type using AI if AUTO is selected
          let finalDocumentType = input.documentType;
          if (input.documentType === "AUTO") {
            const { detectDocumentType } = await import("./document-type-detector");
            // Save temp file for AI analysis
            const fs = await import("fs/promises");
            const path = await import("path");
            const tempPath = path.join("/tmp", `temp_${Date.now()}_${input.fileName}`);
            await fs.writeFile(tempPath, fileBuffer);
            try {
              finalDocumentType = await detectDocumentType(tempPath, input.fileName);
              console.log(`AI detected document type: ${finalDocumentType}`);
            } finally {
              await fs.unlink(tempPath).catch(() => {});
            }
          }
        
        // Upload document
        const document = await uploadDocument(
          input.projectId,
          input.fileName,
          fileBuffer,
          input.fileType,
          input.fileSize,
          finalDocumentType as any,
          ctx.user.id
        );

        // Start processing asynchronously and save facts
        const projectIdNum = parseInt(input.projectId);
        
        // Create processing job record
        const db = await getDb();
        const [projectRows]: any = await db.execute(
          sql`SELECT dbName FROM projects WHERE id = ${projectIdNum}`
        );
        const projectDbName = projectRows[0]?.dbName;
        
        if (projectDbName) {
          const projectDb = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            database: projectDbName,
          });
          
          // Insert initial processing job
          await projectDb.execute(
            `INSERT INTO processing_jobs (document_id, status, stage, progress_percent, started_at) 
             VALUES (?, 'processing', 'queued', 0, NOW())`,
            [document.id]
          );
          
          await projectDb.end();
        }
        
        // Progress callback to update job status
        const updateProgress = async (stage: string, progress: number) => {
          if (projectDbName) {
            const projectDb = mysql.createPool({
              host: '127.0.0.1',
              user: 'root',
              database: projectDbName,
            });
            
            const status = progress >= 100 ? 'completed' : 'processing';
            const completedAt = progress >= 100 ? ', completed_at = NOW()' : '';
            
            await projectDb.execute(
              `UPDATE processing_jobs SET stage = ?, progress_percent = ?, status = ? ${completedAt} WHERE document_id = ?`,
              [stage, progress, status, document.id]
            );
            
            await projectDb.end();
          }
        };
        
        processDocument(projectIdNum, document.id, document.filePath, finalDocumentType as any, 'llama3.2:latest', undefined, updateProgress)
          .then(async (result) => {
            // Save extracted facts to database
            if (result.facts.length > 0) {
              const db = await getDb();
              const [projectRows]: any = await db.execute(
                sql`SELECT dbName FROM projects WHERE id = ${projectIdNum}`
              );
              const projectDbName = projectRows[0]?.dbName;
              
              if (projectDbName) {
                const projectDb = mysql.createPool({
                  host: '127.0.0.1',
                  user: 'root',
                  database: projectDbName,
                });
                
                for (const fact of result.facts) {
                  await projectDb.execute(
                    `INSERT INTO extracted_facts (id, source_document_id, project_id, category, \`key\`, value, confidence, extraction_method, verification_status, created_at) 
                     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
                    [document.id, projectIdNum, fact.category, fact.key, fact.value, fact.confidence, fact.extractionMethod]
                  );
                }
                
                await projectDb.end();
                console.log(`[Document Processor] Saved ${result.facts.length} facts to database`);
              }
            }
          })
          .catch(async (err) => {
            console.error(`Failed to process document ${document.id}:`, err);
            
            // Update job status to failed
            if (projectDbName) {
              const projectDb = mysql.createPool({
                host: '127.0.0.1',
                user: 'root',
                database: projectDbName,
              });
              
              await projectDb.execute(
                `UPDATE processing_jobs SET status = 'failed', error_message = ?, completed_at = NOW() WHERE document_id = ?`,
                [err.message || 'Unknown error', document.id]
              );
              
              await projectDb.end();
            }
          });
        
        console.log(`Document uploaded: ${document.id}, processing started`);

        return document;
      }),
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        const mysql = await import('mysql2/promise');
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get project dbName
        const [projects] = await db.execute(`SELECT dbName FROM projects WHERE id = ${parseInt(input.projectId)}`) as any;
        if (!projects || projects.length === 0) {
          throw new Error(`Project ${input.projectId} not found`);
        }
        const projectDbName = projects[0].dbName;
        
        // Query documents from project database
        const dbUrl = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3306/ingestion_engine_main";
        const connection = await mysql.createConnection(dbUrl.replace(/\/[^/]*$/, `/${projectDbName}`));
        
        try {
          const [rows] = await connection.execute(
            "SELECT id, fileName, filePath, fileSizeBytes, fileHash, documentType, uploadDate, status, processingError, pageCount, createdAt, updatedAt FROM documents ORDER BY uploadDate DESC"
          );
          return rows as unknown as any[];
        } finally {
          await connection.end();
        }
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
    updateDocumentType: protectedProcedure
      .input(z.object({ 
        projectId: z.string(), 
        documentId: z.string(),
        documentType: z.enum(['IM', 'DD_PACK', 'CONTRACT', 'GRID_STUDY', 'PLANNING', 'CONCEPT_DESIGN', 'OTHER'])
      }))
      .mutation(async ({ input }) => {
        const mysql = await import('mysql2/promise');
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get project dbName
        const [projects] = await db.execute(`SELECT dbName FROM projects WHERE id = ${parseInt(input.projectId)}`) as any;
        if (!projects || projects.length === 0) {
          throw new Error(`Project ${input.projectId} not found`);
        }
        const projectDbName = projects[0].dbName;
        
        // Update document type in project database
        const dbUrl = process.env.DATABASE_URL || "mysql://root@127.0.0.1:3306/ingestion_engine_main";
        const connection = await mysql.createConnection(dbUrl.replace(/\/[^/]*$/, `/${projectDbName}`));
        
        try {
          await connection.execute(
            "UPDATE documents SET documentType = ?, updatedAt = NOW() WHERE id = ?",
            [input.documentType, input.documentId]
          );
          return { success: true };
        } finally {
          await connection.end();
        }
      }),
  }),

  demo: demoRouter,

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
    resetDatabase: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.createdByUserId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }
        
        const { provisionProjectDatabase, deleteProjectDatabase } = await import("./project-db-provisioner");
        
        // Parse DATABASE_URL to get connection details
        const url = new URL(process.env.DATABASE_URL!);
        const config = {
          dbName: project.dbName,
          dbHost: url.hostname,
          dbPort: parseInt(url.port) || 3306,
          dbUser: url.username,
          dbPassword: url.password,
        };
        
        // Delete and recreate the project database with updated schema
        await deleteProjectDatabase(config);
        await provisionProjectDatabase(config);
        
        return { success: true, message: "Project database reset successfully" };
      }),
  }),

  processing: router({
    listJobs: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        
        const [rows] = await db.execute(
          `SELECT pj.*, d.fileName as document_name 
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
          "SELECT * FROM extracted_facts WHERE deleted_at IS NULL ORDER BY confidence DESC, created_at DESC"
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
    synthesizeNarrative: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          section: z.string(),
          facts: z.array(z.object({
            key: z.string(),
            value: z.string(),
            confidence: z.string(),
          })),
        })
      )
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        
        // Build facts list for LLM
        const factsList = input.facts
          .map((f, idx) => `${idx + 1}. ${f.value}`)
          .join("\n");
        
        const prompt = `You are a technical writer creating a project summary document for a Technical Advisory team.

Given the following extracted facts from the "${input.section}" section, synthesize them into a cohesive, flowing narrative paragraph (or multiple paragraphs if needed).

Requirements:
- Write in professional, technical prose suitable for executive review
- Combine related facts into flowing sentences
- Maintain all specific numbers, dates, and technical details
- Remove redundancy while preserving all unique information
- Use clear, concise language
- Do NOT use bullet points or lists - write flowing paragraphs only
- Do NOT add information not present in the facts

Facts:
${factsList}

Synthesized narrative:`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a technical writer specializing in project documentation for Technical Advisory teams." },
              { role: "user", content: prompt }
            ],
          });
          
          const content = response.choices[0]?.message?.content || "";
          const narrative = typeof content === 'string' ? content.trim() : "";
          
          return { narrative };
        } catch (error: any) {
          console.error("Failed to synthesize narrative:", error);
          // Fallback: return facts as bullet points
          return { narrative: factsList };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
