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
                
                // Step 6: Generate section narratives for narrative-mode sections
                await updateProgress('generating_narratives', 92);
                console.log(`[Document Processor] Generating section narratives...`);
                
                const { normalizeSection, getSectionDisplayName } = await import('../shared/section-normalizer');
                const { invokeLLM } = await import('./_core/llm');
                
                // Group facts by normalized section
                const factsBySection = new Map<string, typeof result.facts>();
                for (const fact of result.facts) {
                  const canonical = normalizeSection(fact.key);
                  if (!factsBySection.has(canonical)) {
                    factsBySection.set(canonical, []);
                  }
                  factsBySection.get(canonical)!.push(fact);
                }
                
                // Generate narratives for narrative-mode sections
                const narrativeSections = ['Project_Overview', 'Financial_Structure', 'Technical_Design'];
                const db = await getDb();
                
                for (const sectionName of narrativeSections) {
                  const sectionFacts = factsBySection.get(sectionName);
                  if (sectionFacts && sectionFacts.length > 0) {
                    const displayName = getSectionDisplayName(sectionName);
                    const factsText = sectionFacts.map((f, i) => `${i + 1}. ${f.value}`).join('\n');
                    
                    const response = await invokeLLM({
                      messages: [
                        {
                          role: 'system',
                          content: `You are a technical writing assistant. Synthesize the following project insights into a cohesive, flowing narrative paragraph suitable for executive review. Maintain all factual details but present them as connected prose rather than bullet points.`
                        },
                        {
                          role: 'user',
                          content: `Section: ${displayName}\n\nInsights:\n${factsText}\n\nSynthesize these insights into 2-3 well-structured paragraphs.`
                        }
                      ]
                    });
                    
                    const narrative = response.choices[0]?.message?.content || '';
                    
                    if (narrative) {
                      // Store narrative in main database
                      await db.execute(
                        `INSERT INTO section_narratives (project_db_name, section_name, narrative_text) 
                         VALUES (?, ?, ?) 
                         ON DUPLICATE KEY UPDATE narrative_text = VALUES(narrative_text), updated_at = NOW()`,
                        [projectDbName, sectionName, narrative]
                      );
                      console.log(`[Document Processor] Generated narrative for ${displayName}`);
                    }
                  }
                }
                
                await projectDb.end();
                console.log(`[Document Processor] Saved ${result.facts.length} facts and generated narratives`);
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
    delete: protectedProcedure
      .input(z.object({ 
        projectId: z.string(), 
        documentId: z.string()
      }))
      .mutation(async ({ input }) => {
        const fs = await import('fs/promises');
        const { getProjectDb } = await import("./project-db-provisioner");
        const db = await getProjectDb(input.projectId);
        
        // Get document file path before deleting
        const [docs] = await db.execute(
          "SELECT filePath FROM documents WHERE id = " + parseInt(input.documentId)
        ) as any;
        
        if (docs && docs.length > 0 && docs[0].filePath) {
          try {
            await fs.unlink(docs[0].filePath);
          } catch (error) {
            console.error(`Failed to delete file: ${error}`);
            // Continue even if file deletion fails
          }
        }
        
        // Delete associated facts
        await db.execute(
          "DELETE FROM extracted_facts WHERE source_document_id = " + parseInt(input.documentId)
        );
        
        // Delete associated processing jobs
        await db.execute(
          "DELETE FROM processing_jobs WHERE document_id = " + parseInt(input.documentId)
        );
        
        // Delete document record
        await db.execute(
          "DELETE FROM documents WHERE id = " + parseInt(input.documentId)
        );
        
        return { success: true, message: "Document deleted successfully" };
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
    delete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.createdByUserId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }
        
        const { deleteProjectDatabase } = await import("./project-db-provisioner");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Parse DATABASE_URL to get connection details
        const url = new URL(process.env.DATABASE_URL!);
        const config = {
          dbName: project.dbName,
          dbHost: url.hostname,
          dbPort: parseInt(url.port) || 3306,
          dbUser: url.username,
          dbPassword: url.password,
        };
        
        // Delete the project database
        await deleteProjectDatabase(config);
        
        // Delete project record from main database
        await db.execute(
          "DELETE FROM projects WHERE id = ?",
          [input.projectId]
        );
        
        // Delete associated narratives
        await db.execute(
          "DELETE FROM section_narratives WHERE project_db_name = ?",
          [project.dbName]
        );
        
        return { success: true, message: "Project deleted successfully" };
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
    getNarratives: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // First get the project's dbName
        const [projects] = await db.execute(
          "SELECT dbName FROM projects WHERE id = " + parseInt(input.projectId)
        ) as any;
        
        if (!projects || projects.length === 0) {
          return {}; // Return empty if project not found
        }
        
        const projectDbName = projects[0].dbName;
        
        // Now query narratives using the dbName
        const [rows] = await db.execute(
          "SELECT section_name, narrative_text FROM section_narratives WHERE project_db_name = '" + projectDbName + "'"
        );
        
        // Convert to map for easy lookup
        const narratives: Record<string, string> = {};
        for (const row of rows as any[]) {
          narratives[row.section_name] = row.narrative_text;
        }
        
        return narratives;
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
    synthesizeNarrativeOnDemand: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          section: z.string(),
          canonicalName: z.string(), // Canonical section name for state key
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
