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
                
                // Import reconciliation functions
                const { reconcileInsight, enrichInsight, createConflict } = await import('./insight-reconciler');
                const { normalizeSection: normalizeSectionKey } = await import('../shared/section-normalizer');
                const { v4: uuidv4 } = await import('uuid');
                
                // Process each fact through reconciliation
                let insertedCount = 0;
                let enrichedCount = 0;
                let conflictCount = 0;
                
                for (const fact of result.facts) {
                  const normalizedKey = normalizeSectionKey(fact.key);
                  
                  // Reconcile with existing insights
                  const reconciliation = await reconcileInsight(
                    projectDb,
                    projectIdNum,
                    {
                      id: uuidv4(),
                      key: normalizedKey,
                      value: fact.value,
                      confidence: String(fact.confidence),
                      source_document_id: document.id,
                      extraction_method: fact.extractionMethod
                    },
                    normalizedKey
                  );
                  
                  if (reconciliation.action === 'insert') {
                    // Insert as new insight
                    const insightId = uuidv4();
                    const sourceDocsJson = JSON.stringify([document.id]).replace(/'/g, "''");
                    const escapedValue = fact.value.replace(/'/g, "''");
                    
                    await projectDb.execute(
                      `INSERT INTO extracted_facts (id, source_document_id, source_documents, project_id, category, \`key\`, value, confidence, extraction_method, verification_status, enrichment_count, created_at) 
                       VALUES ('${insightId}', '${document.id}', '${sourceDocsJson}', ${projectIdNum}, '${fact.category}', '${normalizedKey}', '${escapedValue}', '${fact.confidence}', '${fact.extractionMethod}', 'pending', 1, NOW())`
                    );
                    insertedCount++;
                  } else if (reconciliation.action === 'update') {
                    // Enrich existing insight
                    await enrichInsight(
                      projectDb,
                      reconciliation.existingInsightId!,
                      reconciliation.mergedValue!,
                      reconciliation.newConfidence!,
                      document.id
                    );
                    enrichedCount++;
                  } else if (reconciliation.action === 'conflict') {
                    // Insert as new and create conflict
                    const insightId = uuidv4();
                    const sourceDocsJson = JSON.stringify([document.id]).replace(/'/g, "''");
                    const escapedValue = fact.value.replace(/'/g, "''");
                    
                    await projectDb.execute(
                      `INSERT INTO extracted_facts (id, source_document_id, source_documents, project_id, category, \`key\`, value, confidence, extraction_method, verification_status, enrichment_count, created_at) 
                       VALUES ('${insightId}', '${document.id}', '${sourceDocsJson}', ${projectIdNum}, '${fact.category}', '${normalizedKey}', '${escapedValue}', '${fact.confidence}', '${fact.extractionMethod}', 'pending', 1, NOW())`
                    );
                    
                    await createConflict(
                      projectDb,
                      projectIdNum,
                      reconciliation.existingInsightId!,
                      insightId,
                      'value_mismatch'
                    );
                    conflictCount++;
                  }
                }
                
                console.log(`[Document Processor] Reconciliation complete: ${insertedCount} new, ${enrichedCount} enriched, ${conflictCount} conflicts`);
                
                // Step 6: Generate section narratives for narrative-mode sections
                await updateProgress('generating_narratives', 92);
                console.log(`[Document Processor] Generating section narratives...`);
                
                const { getSectionDisplayName } = await import('../shared/section-normalizer');
                const { invokeLLM } = await import('./_core/llm');
                
                // Group facts by normalized section
                const factsBySection = new Map<string, typeof result.facts>();
                for (const fact of result.facts) {
                  const canonical = normalizeSectionKey(fact.key);
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
                    
                    const narrativeContent = response.choices[0]?.message?.content;
                    const narrative = typeof narrativeContent === 'string' ? narrativeContent : '';
                    
                    if (narrative && db) {
                      try {
                        // Store narrative in main database
                        // Escape single quotes in narrative text
                        const escapedNarrative = narrative.replace(/'/g, "''");
                        await db.execute(
                          `INSERT INTO section_narratives (project_db_name, section_name, narrative_text) 
                           VALUES ('${projectDbName}', '${sectionName}', '${escapedNarrative}') 
                           ON DUPLICATE KEY UPDATE narrative_text = '${escapedNarrative}', updated_at = NOW()`
                        );
                        console.log(`[Document Processor] Generated and saved narrative for ${displayName} (${narrative.length} chars)`);
                      } catch (error) {
                        console.error(`[Document Processor] Failed to save narrative for ${displayName}:`, error);
                      }
                    }
                  }
                }
                
                // Step 7: Extract performance parameters
                await updateProgress('extracting_performance_params', 94);
                console.log(`[Document Processor] Extracting performance parameters...`);
                
                const { PerformanceFinancialExtractor } = await import('./performance-financial-extractor');
                const extractor = new PerformanceFinancialExtractor();
                
                try {
                  const perfParams = await extractor.extractPerformanceParameters(
                    result.extractedText,
                    finalDocumentType as string
                  );
                  
                  if (perfParams && perfParams.confidence > 0) {
                    const { v4: uuidv4 } = await import('uuid');
                    const paramId = uuidv4();
                    
                    // Build INSERT statement dynamically for non-null fields
                    const fields = ['id', 'project_id', 'source_document_id', 'confidence', 'extraction_method'];
                    const values = [`'${paramId}'`, projectIdNum.toString(), `'${document.id}'`, perfParams.confidence.toString(), `'${perfParams.extraction_method}'`];
                    
                    // Add non-null performance parameter fields
                    const paramFields: (keyof typeof perfParams)[] = [
                      'dc_capacity_mw', 'ac_capacity_mw', 'module_model', 'module_power_watts', 'module_count',
                      'inverter_model', 'inverter_power_kw', 'inverter_count', 'tracking_type', 'tilt_angle_degrees',
                      'azimuth_degrees', 'latitude', 'longitude', 'site_name', 'elevation_m', 'timezone',
                      'system_losses_percent', 'degradation_rate_percent', 'availability_percent', 'soiling_loss_percent',
                      'weather_file_url', 'ghi_annual_kwh_m2', 'dni_annual_kwh_m2', 'temperature_ambient_c',
                      'p50_generation_gwh', 'p90_generation_gwh', 'capacity_factor_percent', 'specific_yield_kwh_kwp', 'notes'
                    ];
                    
                    for (const field of paramFields) {
                      const value = perfParams[field];
                      if (value !== null && value !== undefined) {
                        fields.push(field);
                        if (typeof value === 'number') {
                          values.push(value.toString());
                        } else {
                          const escapedValue = String(value).replace(/'/g, "''");
                          values.push(`'${escapedValue}'`);
                        }
                      }
                    }
                    
                    await projectDb.execute(
                      `INSERT INTO performance_parameters (${fields.join(', ')}) VALUES (${values.join(', ')})`
                    );
                    
                    console.log(`[Document Processor] Saved performance parameters (confidence: ${(perfParams.confidence * 100).toFixed(1)}%)`);
                  }
                } catch (perfError) {
                  console.error(`[Document Processor] Performance parameter extraction failed:`, perfError);
                }
                
                // Step 8: Extract financial data
                await updateProgress('extracting_financial_data', 96);
                console.log(`[Document Processor] Extracting financial data...`);
                
                try {
                  const financialData = await extractor.extractFinancialData(
                    result.extractedText,
                    finalDocumentType as string
                  );
                  
                  if (financialData && financialData.confidence > 0) {
                    const { v4: uuidv4 } = await import('uuid');
                    const finId = uuidv4();
                    
                    // Build INSERT statement dynamically for non-null fields
                    const fields = ['id', 'project_id', 'source_document_id', 'confidence', 'extraction_method'];
                    const values = [`'${finId}'`, projectIdNum.toString(), `'${document.id}'`, financialData.confidence.toString(), `'${financialData.extraction_method}'`];
                    
                    // Add non-null financial data fields
                    const finFields: (keyof typeof financialData)[] = [
                      'total_capex_usd', 'modules_usd', 'inverters_usd', 'trackers_usd', 'civil_works_usd',
                      'grid_connection_usd', 'development_costs_usd', 'other_capex_usd', 'total_opex_annual_usd',
                      'om_usd', 'insurance_usd', 'land_lease_usd', 'asset_management_usd', 'other_opex_usd',
                      'capex_per_watt_usd', 'opex_per_mwh_usd', 'original_currency', 'exchange_rate_to_usd',
                      'cost_year', 'escalation_rate_percent', 'notes'
                    ];
                    
                    for (const field of finFields) {
                      const value = financialData[field];
                      if (value !== null && value !== undefined) {
                        fields.push(field);
                        if (typeof value === 'number') {
                          values.push(value.toString());
                        } else {
                          const escapedValue = String(value).replace(/'/g, "''");
                          values.push(`'${escapedValue}'`);
                        }
                      }
                    }
                    
                    await projectDb.execute(
                      `INSERT INTO financial_data (${fields.join(', ')}) VALUES (${values.join(', ')})`
                    );
                    
                    console.log(`[Document Processor] Saved financial data (confidence: ${(financialData.confidence * 100).toFixed(1)}%)`);
                  }
                } catch (finError) {
                  console.error(`[Document Processor] Financial data extraction failed:`, finError);
                }
                
                // Step 9: Extract and download weather files
                await updateProgress('extracting_weather_files', 98);
                console.log(`[Document Processor] Extracting weather file references...`);
                
                try {
                  const { WeatherFileExtractor } = await import('./weather-file-extractor');
                  const weatherExtractor = new WeatherFileExtractor();
                  
                  const weatherData = await weatherExtractor.extractWeatherReferences(
                    result.extractedText,
                    document.id,
                    document.fileName
                  );
                  
                  if (weatherData.references.length > 0) {
                    console.log(`[Document Processor] Found ${weatherData.references.length} weather file references`);
                    
                    // Process each reference (download if URL)
                    for (const reference of weatherData.references) {
                      if (reference.type === 'url' && reference.url) {
                        console.log(`[Document Processor] Downloading weather file: ${reference.url}`);
                        
                        const downloadResult = await weatherExtractor.processWeatherFile(
                          reference,
                          projectIdNum,
                          document.id
                        );
                        
                        if (downloadResult) {
                          // Save to weather_files table
                          const { v4: uuidv4 } = await import('uuid');
                          const weatherFileId = uuidv4();
                          
                          await projectDb.execute(
                            `INSERT INTO weather_files (
                              id, project_id, file_key, file_url, file_name, file_size_bytes,
                              source_type, source_document_id, extracted_url, original_format,
                              status, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                            [
                              weatherFileId,
                              projectIdNum,
                              downloadResult.fileKey,
                              downloadResult.fileUrl,
                              downloadResult.fileName,
                              downloadResult.fileSizeBytes,
                              'extracted',
                              document.id,
                              reference.url,
                              downloadResult.originalFormat,
                              'pending' // Will be processed by validation trigger
                            ]
                          );
                          
                          console.log(`[Document Processor] Saved weather file: ${downloadResult.fileName}`);
                        }
                      } else if (reference.type === 'reference') {
                        console.log(`[Document Processor] Found weather data reference: ${reference.description}`);
                        // Could create a placeholder record for manual follow-up
                      }
                    }
                  }
                } catch (weatherError) {
                  console.error(`[Document Processor] Weather file extraction failed:`, weatherError);
                }
                
                await projectDb.end();
                console.log(`[Document Processor] Saved ${result.facts.length} facts, narratives, performance params, financial data, and weather files`);
                
                // Step 10: Auto-trigger validation if ready
                await updateProgress('checking_validation_trigger', 99);
                console.log(`[Document Processor] Checking if validation can be triggered...`);
                
                try {
                  const { ValidationTrigger } = await import('./validation-trigger');
                  const trigger = new ValidationTrigger();
                  
                  const triggerResult = await trigger.autoTriggerIfReady(projectIdNum, projectDbName);
                  
                  if (triggerResult.triggered) {
                    console.log(`[Document Processor] ✓ Auto-triggered validation: ${triggerResult.validationId}`);
                  } else {
                    console.log(`[Document Processor] Validation not triggered: ${triggerResult.reason}`);
                  }
                } catch (triggerError) {
                  console.error(`[Document Processor] Validation trigger check failed:`, triggerError);
                }
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

        return { ...document, documentId: document.id };
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
    getProgress: protectedProcedure
      .input(z.object({ projectDbName: z.string(), documentId: z.string() }))
      .query(async ({ input }) => {
        const db = mysql.createPool({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: input.projectDbName,
          waitForConnections: true,
          connectionLimit: 10,
        });
        
        const [rows] = await db.execute(
          `SELECT status, stage, progress_percent, error_message, started_at, completed_at 
           FROM processing_jobs 
           WHERE document_id = ? 
           ORDER BY started_at DESC 
           LIMIT 1`,
          [input.documentId]
        ) as any;
        
        await db.end();
        
        if (rows.length === 0) {
          return null;
        }
        
        return rows[0];
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
          `DELETE FROM projects WHERE id = ${input.projectId}`
        );
        
        // Delete associated narratives
        await db.execute(
          "DELETE FROM section_narratives WHERE project_db_name = '" + project.dbName + "'"
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
        
        // projectId is actually the project_db_name (e.g., "proj_1_1769157846333")
        // Query narratives directly using it
        const [rows] = await db.execute(
          `SELECT section_name, narrative_text FROM section_narratives WHERE project_db_name = '${input.projectId}'`
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

  conflicts: router({
    list: protectedProcedure
      .input(z.object({ projectDbName: z.string() }))
      .query(async ({ input }) => {
        const projectDb = await mysql.createConnection({
          host: process.env.DATABASE_HOST || 'localhost',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [conflicts] = await projectDb.execute(`
            SELECT 
              c.*,
              f1.value as insight_a_value,
              f1.confidence as insight_a_confidence,
              f1.source_documents as insight_a_sources,
              f2.value as insight_b_value,
              f2.confidence as insight_b_confidence,
              f2.source_documents as insight_b_sources
            FROM insight_conflicts c
            JOIN extracted_facts f1 ON c.insight_a_id = f1.id
            JOIN extracted_facts f2 ON c.insight_b_id = f2.id
            WHERE c.resolution_status = 'pending'
            ORDER BY c.created_at DESC
          `) as any;

          await projectDb.end();
          return conflicts;
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch conflicts: ${error.message}`);
        }
      }),

    resolve: protectedProcedure
      .input(z.object({
        projectDbName: z.string(),
        conflictId: z.string(),
        resolution: z.enum(['accept_a', 'accept_b', 'merge', 'ignore']),
        mergedValue: z.string().optional(), // For merge resolution
      }))
      .mutation(async ({ input }) => {
        const projectDb = await mysql.createConnection({
          host: process.env.DATABASE_HOST || 'localhost',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          // Get conflict details
          const [conflicts] = await projectDb.execute(`
            SELECT * FROM insight_conflicts WHERE id = '${input.conflictId}'
          `) as any;

          if (conflicts.length === 0) {
            throw new Error('Conflict not found');
          }

          const conflict = conflicts[0];

          // Handle different resolution types
          if (input.resolution === 'accept_a') {
            // Keep insight A, delete insight B
            await projectDb.execute(`DELETE FROM extracted_facts WHERE id = '${conflict.insight_b_id}'`);
            await projectDb.execute(`UPDATE extracted_facts SET conflict_with = NULL WHERE id = '${conflict.insight_a_id}'`);
          } else if (input.resolution === 'accept_b') {
            // Keep insight B, delete insight A
            await projectDb.execute(`DELETE FROM extracted_facts WHERE id = '${conflict.insight_a_id}'`);
            await projectDb.execute(`UPDATE extracted_facts SET conflict_with = NULL WHERE id = '${conflict.insight_b_id}'`);
          } else if (input.resolution === 'merge') {
            // Create new merged insight, delete both originals
            const { v4: uuidv4 } = await import('uuid');
            const mergedId = uuidv4();
            
            // Get both insights
            const [insightsA] = await projectDb.execute(`SELECT * FROM extracted_facts WHERE id = '${conflict.insight_a_id}'`) as any;
            const [insightsB] = await projectDb.execute(`SELECT * FROM extracted_facts WHERE id = '${conflict.insight_b_id}'`) as any;
            
            const insightA = insightsA[0];
            const insightB = insightsB[0];
            
            // Merge source documents
            const sourcesA = insightA.source_documents ? JSON.parse(insightA.source_documents) : [insightA.source_document_id];
            const sourcesB = insightB.source_documents ? JSON.parse(insightB.source_documents) : [insightB.source_document_id];
            const mergedSources = Array.from(new Set([...sourcesA, ...sourcesB]));
            
            // Calculate weighted confidence
            const confA = parseFloat(insightA.confidence);
            const confB = parseFloat(insightB.confidence);
            const mergedConf = ((confA + confB) / 2).toFixed(2);
            
            await projectDb.execute(`
              INSERT INTO extracted_facts (
                id, category, \`key\`, value, confidence, 
                source_document_id, extraction_method, verification_status,
                source_documents, enrichment_count, merged_from
              ) VALUES (
                '${mergedId}', '${insightA.category}', '${insightA.key}', 
                '${input.mergedValue?.replace(/'/g, "''")}', '${mergedConf}',
                '${insightA.source_document_id}', 'merged', 'pending',
                '${JSON.stringify(mergedSources).replace(/'/g, "''")}', 
                ${(insightA.enrichment_count || 1) + (insightB.enrichment_count || 1)},
                '${JSON.stringify([conflict.insight_a_id, conflict.insight_b_id]).replace(/'/g, "''")}'              )
            `);
            
            // Delete originals
            await projectDb.execute(`DELETE FROM extracted_facts WHERE id IN ('${conflict.insight_a_id}', '${conflict.insight_b_id}')`);
          }

          // Update conflict status
          await projectDb.execute(`
            UPDATE insight_conflicts 
            SET resolution_status = '${input.resolution}', resolved_at = NOW()
            WHERE id = '${input.conflictId}'
          `);

          await projectDb.end();
          return { success: true };
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to resolve conflict: ${error.message}`);
        }
      }),
  }),

  performance: router({
    // Get all performance validations for a project
    getByProject: protectedProcedure
      .input(z.object({ projectDbName: z.string() }))
      .query(async ({ input }) => {
        const projectDb = await mysql.createConnection({
          host: process.env.DATABASE_HOST || 'localhost',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [rows] = await projectDb.execute(
            "SELECT * FROM performance_validations ORDER BY created_at DESC"
          ) as any;
          await projectDb.end();
          return rows || [];
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch performance validations: ${error.message}`);
        }
      }),

    // Get single performance validation by ID
    getById: protectedProcedure
      .input(z.object({ projectDbName: z.string(), validationId: z.string() }))
      .query(async ({ input }) => {
        const projectDb = await mysql.createConnection({
          host: process.env.DATABASE_HOST || 'localhost',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [rows] = await projectDb.execute(
            "SELECT * FROM performance_validations WHERE id = ?",
            [input.validationId]
          ) as any;
          await projectDb.end();
          return rows[0] || null;
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch performance validation: ${error.message}`);
        }
      }),

    // Create new performance validation (will be called by Solar Analyzer integration)
    create: protectedProcedure
      .input(z.object({
        projectDbName: z.string(),
        calculationId: z.string(),
        annualGenerationGwh: z.string().optional(),
        capacityFactorPercent: z.string().optional(),
        performanceRatioPercent: z.string().optional(),
        specificYieldKwhKwp: z.string().optional(),
        contractorClaimGwh: z.string().optional(),
        variancePercent: z.string().optional(),
        varianceGwh: z.string().optional(),
        flagTriggered: z.number().optional(),
        confidenceLevel: z.string().optional(),
        dcCapacityMw: z.string().optional(),
        acCapacityMw: z.string().optional(),
        moduleModel: z.string().optional(),
        inverterModel: z.string().optional(),
        trackingType: z.string().optional(),
        totalSystemLossesPercent: z.string().optional(),
        parametersExtractedCount: z.number().optional(),
        parametersAssumedCount: z.number().optional(),
        confidenceScore: z.string().optional(),
        weatherDataSource: z.string().optional(),
        ghiAnnualKwhM2: z.string().optional(),
        poaAnnualKwhM2: z.string().optional(),
        monthlyProfile: z.string().optional(), // JSON string
        modelUsed: z.string().optional(),
        pysamVersion: z.string().optional(),
        calculationTimeSeconds: z.string().optional(),
        warnings: z.string().optional(), // JSON string
      }))
      .mutation(async ({ input }) => {
        const projectDb = await mysql.createConnection({
          host: process.env.DATABASE_HOST || 'localhost',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const validationId = `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Get project_id from project database name
          const mainDb = await getDb();
          const [projectRows] = await mainDb.execute(
            "SELECT id FROM projects WHERE dbName = ?",
            [input.projectDbName]
          ) as any;
          const projectId = projectRows[0]?.id;
          
          await projectDb.execute(
            `INSERT INTO performance_validations (
              id, project_id, calculation_id,
              annual_generation_gwh, capacity_factor_percent, performance_ratio_percent, specific_yield_kwh_kwp,
              contractor_claim_gwh, variance_percent, variance_gwh, flag_triggered, confidence_level,
              dc_capacity_mw, ac_capacity_mw, module_model, inverter_model, tracking_type,
              total_system_losses_percent, parameters_extracted_count, parameters_assumed_count, confidence_score,
              weather_data_source, ghi_annual_kwh_m2, poa_annual_kwh_m2, monthly_profile,
              model_used, pysam_version, calculation_time_seconds, warnings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              validationId,
              projectId,
              input.calculationId,
              input.annualGenerationGwh,
              input.capacityFactorPercent,
              input.performanceRatioPercent,
              input.specificYieldKwhKwp,
              input.contractorClaimGwh,
              input.variancePercent,
              input.varianceGwh,
              input.flagTriggered || 0,
              input.confidenceLevel,
              input.dcCapacityMw,
              input.acCapacityMw,
              input.moduleModel,
              input.inverterModel,
              input.trackingType,
              input.totalSystemLossesPercent,
              input.parametersExtractedCount,
              input.parametersAssumedCount,
              input.confidenceScore,
              input.weatherDataSource,
              input.ghiAnnualKwhM2,
              input.poaAnnualKwhM2,
              input.monthlyProfile,
              input.modelUsed,
              input.pysamVersion,
              input.calculationTimeSeconds,
              input.warnings,
            ]
          );

          await projectDb.end();
          return { success: true, validationId };
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to create performance validation: ${error.message}`);
        }
      }),
  }),
  
  // Performance parameters router
  performanceParams: router({
    getByProject: protectedProcedure
      .input(z.object({ projectDbName: z.string() }))
      .query(async ({ input }) => {
        const projectDb = mysql.createPool({
          host: '127.0.0.1',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [rows] = await projectDb.execute(
            `SELECT * FROM performance_parameters ORDER BY created_at DESC`
          );
          await projectDb.end();
          return rows;
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch performance parameters: ${error.message}`);
        }
      }),
    
    getById: protectedProcedure
      .input(z.object({ projectDbName: z.string(), id: z.string() }))
      .query(async ({ input }) => {
        const projectDb = mysql.createPool({
          host: '127.0.0.1',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [rows] = await projectDb.execute(
            `SELECT * FROM performance_parameters WHERE id = ?`,
            [input.id]
          );
          await projectDb.end();
          return (rows as any[])[0] || null;
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch performance parameter: ${error.message}`);
        }
      }),
  }),
  
  // Financial data router
  financial: router({
    getByProject: protectedProcedure
      .input(z.object({ projectDbName: z.string() }))
      .query(async ({ input }) => {
        const projectDb = mysql.createPool({
          host: '127.0.0.1',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [rows] = await projectDb.execute(
            `SELECT * FROM financial_data ORDER BY created_at DESC`
          );
          await projectDb.end();
          return rows;
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch financial data: ${error.message}`);
        }
      }),
    
    getById: protectedProcedure
      .input(z.object({ projectDbName: z.string(), id: z.string() }))
      .query(async ({ input }) => {
        const projectDb = mysql.createPool({
          host: '127.0.0.1',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [rows] = await projectDb.execute(
            `SELECT * FROM financial_data WHERE id = ?`,
            [input.id]
          );
          await projectDb.end();
          return (rows as any[])[0] || null;
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch financial data: ${error.message}`);
        }
      }),
  }),
  
  // Weather files router
  weatherFiles: router({
    getByProject: protectedProcedure
      .input(z.object({ projectDbName: z.string() }))
      .query(async ({ input }) => {
        const projectDb = mysql.createPool({
          host: '127.0.0.1',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          const [rows] = await projectDb.execute(
            `SELECT * FROM weather_files ORDER BY created_at DESC`
          );
          await projectDb.end();
          return rows;
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to fetch weather files: ${error.message}`);
        }
      }),
    
    upload: protectedProcedure
      .input(z.object({
        projectDbName: z.string(),
        projectId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // Base64 encoded
        sourceDocumentId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const projectDb = mysql.createPool({
          host: '127.0.0.1',
          user: 'root',
          database: input.projectDbName,
        });

        try {
          // Decode base64 content
          const fileBuffer = Buffer.from(input.fileContent, 'base64');
          const fileContent = fileBuffer.toString('utf-8');
          const fileSizeBytes = fileBuffer.length;
          
          // Upload to S3
          const { v4: uuidv4 } = await import('uuid');
          const fileId = uuidv4();
          const fileKey = `project-${input.projectId}/weather/manual/${fileId}-${input.fileName}`;
          
          const { storagePut } = await import('./storage');
          const { url: fileUrl } = await storagePut(
            fileKey,
            fileContent,
            'text/csv'
          );
          
          // Detect format from filename
          const ext = input.fileName.toLowerCase().split('.').pop();
          let originalFormat = 'unknown';
          if (ext === 'csv') originalFormat = 'csv';
          else if (ext === 'epw') originalFormat = 'epw';
          else if (ext === 'tm2' || ext === 'tm3') originalFormat = 'tmy3';
          
          // Save to database (will be processed by Solar Analyzer when validation runs)
          await projectDb.execute(
            `INSERT INTO weather_files (
              id, project_id, file_key, file_url, file_name, file_size_bytes,
              source_type, source_document_id, original_format, status,
              is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              fileId,
              input.projectId,
              fileKey,
              fileUrl,
              input.fileName,
              fileSizeBytes,
              'manual_upload',
              input.sourceDocumentId || null,
              originalFormat,
              'pending', // Will be processed when validation runs
              1 // Set as active
            ]
          );
          
          await projectDb.end();
          
          console.log(`[Weather Upload] Saved weather file: ${input.fileName}`);
          
          // Auto-trigger validation if ready
          const { ValidationTrigger } = await import('./validation-trigger');
          const trigger = new ValidationTrigger();
          const triggerResult = await trigger.autoTriggerIfReady(input.projectId, input.projectDbName);
          
          return {
            id: fileId,
            status: 'pending',
            triggered: triggerResult.triggered
          };
        } catch (error: any) {
          await projectDb.end();
          throw new Error(`Failed to upload weather file: ${error.message}`);
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
