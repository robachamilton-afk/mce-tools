import { eq, like, or, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sites, siteConfigurations, assessments, customAnalyses, InsertSiteConfiguration, InsertAssessment } from "../drizzle/schema";
import { ENV } from './_core/env';
import { getMimeType } from './mimeTypes';

/**
 * Safely parse date string to Date object
 * Returns null if date is invalid
 */
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Site management queries
export async function getAllSites() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(sites).orderBy(sites.name);
}

export async function searchSites(query: string) {
  const db = await getDb();
  if (!db) return [];
  
  const searchPattern = `%${query}%`;
  return await db
    .select()
    .from(sites)
    .where(
      or(
        like(sites.name, searchPattern),
        like(sites.duid, searchPattern)
      )
    )
    .limit(20);
}

export async function getSiteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Site Configuration helpers
export async function getSiteConfiguration(siteId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(siteConfigurations)
    .where(eq(siteConfigurations.siteId, siteId))
    .orderBy(desc(siteConfigurations.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSiteConfiguration(config: InsertSiteConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(siteConfigurations).values(config);
  return result;
}

// Assessment helpers
export async function getSiteAssessments(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(assessments)
    .where(eq(assessments.siteId, siteId))
    .orderBy(desc(assessments.assessmentDate));
}

export async function getAssessmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAssessment(assessment: InsertAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(assessments).values(assessment);
  return result;
}

export async function getAllAssessments() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: assessments.id,
      siteId: assessments.siteId,
      siteName: sites.name,
      siteDuid: sites.duid,
      assessmentDate: assessments.assessmentDate,
      dateRangeStart: assessments.dateRangeStart,
      dateRangeEnd: assessments.dateRangeEnd,
      technicalPr: assessments.technicalPr,
      overallPr: assessments.overallPr,
      curtailmentPct: assessments.curtailmentPct,
    })
    .from(assessments)
    .leftJoin(sites, eq(assessments.siteId, sites.id))
    .orderBy(desc(assessments.assessmentDate));
}

// Equipment detection helpers
export async function getEquipmentDetections(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { equipmentDetections } = await import("../drizzle/schema");
  return await db
    .select()
    .from(equipmentDetections)
    .where(eq(equipmentDetections.siteId, siteId))
    .orderBy(desc(equipmentDetections.detectedAt));
}

export async function addEquipmentDetection(data: {
  siteId: number;
  type: "pcu" | "substation" | "combiner_box" | "transformer" | "other";
  latitude: number;
  longitude: number;
  status: "auto_detected" | "user_added";
  confidence?: number;
  notes?: string;
  verifiedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { equipmentDetections } = await import("../drizzle/schema");
  const values: any = {
    ...data,
    latitude: data.latitude.toString(),
    longitude: data.longitude.toString(),
  };
  if (data.status === "user_added") {
    values.verifiedAt = new Date();
  }
  const result = await db.insert(equipmentDetections).values(values);
  return result;
}

export async function updateEquipmentLocation(id: number, latitude: number, longitude: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { equipmentDetections } = await import("../drizzle/schema");
  const result = await db
    .update(equipmentDetections)
    .set({ latitude: latitude.toString(), longitude: longitude.toString(), updatedAt: new Date() })
    .where(eq(equipmentDetections.id, id));
  return result;
}

export async function verifyEquipmentDetection(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { equipmentDetections } = await import("../drizzle/schema");
  const result = await db
    .update(equipmentDetections)
    .set({
      status: "user_verified",
      verifiedAt: new Date(),
      verifiedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(equipmentDetections.id, id));
  return result;
}

export async function deleteEquipmentDetection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { equipmentDetections } = await import("../drizzle/schema");
  const result = await db
    .delete(equipmentDetections)
    .where(eq(equipmentDetections.id, id));
  return result;
}

// ============================================================================
// Custom Analysis Functions
// ============================================================================

export async function createCustomAnalysis(data: {
  siteId: number;
  userId: number;
  name: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  const [result] = await db.insert(customAnalyses).values({
    siteId: data.siteId,
    userId: data.userId,
    name: data.name,
    description: data.description || null,
    status: "uploading",
  });
  
  return { id: result.insertId };
}

export async function getCustomAnalysisById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { customAnalyses } = await import("../drizzle/schema");
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, id))
    .limit(1);
  
  return analysis || null;
}

export async function getCustomAnalysesBySite(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { customAnalyses } = await import("../drizzle/schema");
  return await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.siteId, siteId))
    .orderBy(desc(customAnalyses.createdAt));
}

export async function uploadScadaFile(analysisId: number, fileName: string, fileContent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { storagePut } = await import("./storage");
  const { customAnalyses } = await import("../drizzle/schema");
  
  // Decode base64 and upload to S3
  const buffer = Buffer.from(fileContent, 'base64');
  const fileKey = `custom-analysis/${analysisId}/scada-${Date.now()}-${fileName}`;
  const { url } = await storagePut(fileKey, buffer, getMimeType(fileName));
  
  // Update analysis record
  await db
    .update(customAnalyses)
    .set({
      scadaFileUrl: url,
      scadaFileName: fileName,
    })
    .where(eq(customAnalyses.id, analysisId));
  
  return { url, fileName };
}

export async function uploadMeteoFile(analysisId: number, fileName: string, fileContent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { storagePut } = await import("./storage");
  const { customAnalyses } = await import("../drizzle/schema");
  
  // Decode base64 and upload to S3
  const buffer = Buffer.from(fileContent, 'base64');
  const fileKey = `custom-analysis/${analysisId}/meteo-${Date.now()}-${fileName}`;
  const { url } = await storagePut(fileKey, buffer, getMimeType(fileName));
  
  // Update analysis record
  await db
    .update(customAnalyses)
    .set({
      meteoFileUrl: url,
      meteoFileName: fileName,
    })
    .where(eq(customAnalyses.id, analysisId));
  
  return { url, fileName };
}

export async function analyzeCSVHeaders(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  const { invokeLLM } = await import("./_core/llm");
  
  // Get analysis record
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, analysisId))
    .limit(1);
  
  if (!analysis) throw new Error("Analysis not found");
  
  // For CSV files, fetch first few rows to analyze headers
  // For PDF files, use LLM vision to extract table structure
  const scadaIsPdf = analysis.scadaFileName?.endsWith('.pdf');
  const meteoIsPdf = analysis.meteoFileName?.endsWith('.pdf');
  
  let scadaHeaders: string[] = [];
  let meteoHeaders: string[] = [];
  
  // Analyze SCADA file
  if (analysis.scadaFileUrl) {
    if (scadaIsPdf) {
      // Use LLM vision to extract table from PDF
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a data extraction expert. Extract column headers from tabular data in PDFs."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all column headers from this SCADA data PDF. Return only a JSON array of column names."
              },
              {
                type: "file_url",
                file_url: {
                  url: analysis.scadaFileUrl,
                  mime_type: "application/pdf"
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "column_headers",
            strict: true,
            schema: {
              type: "object",
              properties: {
                headers: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["headers"],
              additionalProperties: false
            }
          }
        }
      });
      
      const content = response.choices[0].message.content;
      const result = JSON.parse(typeof content === 'string' ? content : '{"headers":[]}');
      scadaHeaders = result.headers;
    } else {
      // Fetch CSV and parse headers
      const csvResponse = await fetch(analysis.scadaFileUrl);
      const csvText = await csvResponse.text();
      const firstLine = csvText.split('\n')[0];
      scadaHeaders = firstLine.split(',').map(h => h.trim());
    }
  }
  
  // Analyze meteo file
  if (analysis.meteoFileUrl) {
    if (meteoIsPdf) {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a data extraction expert. Extract column headers from tabular data in PDFs."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all column headers from this meteorological data PDF. Return only a JSON array of column names."
              },
              {
                type: "file_url",
                file_url: {
                  url: analysis.meteoFileUrl,
                  mime_type: "application/pdf"
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "column_headers",
            strict: true,
            schema: {
              type: "object",
              properties: {
                headers: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["headers"],
              additionalProperties: false
            }
          }
        }
      });
      
      const content = response.choices[0].message.content;
      const result = JSON.parse(typeof content === 'string' ? content : '{"headers":[]}');
      meteoHeaders = result.headers;
    } else {
      const csvResponse = await fetch(analysis.meteoFileUrl);
      const csvText = await csvResponse.text();
      const firstLine = csvText.split('\n')[0];
      meteoHeaders = firstLine.split(',').map(h => h.trim());
    }
  }
  
  // Use LLM to suggest column mappings
  const mappingResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a solar performance data expert. Map column headers to standard field names."
      },
      {
        role: "user",
        content: `Given these column headers, suggest mappings to standard fields:

SCADA columns: ${JSON.stringify(scadaHeaders)}
Required SCADA fields: timestamp, generation_mwh, availability_pct

Meteo columns: ${JSON.stringify(meteoHeaders)}
Required meteo fields: timestamp, irradiance_wm2, temperature_c

Return JSON with suggested mappings.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "column_mappings",
        strict: true,
        schema: {
          type: "object",
          properties: {
            scada: {
              type: "object",
              properties: {
                timestamp: { type: "string" },
                generation_mwh: { type: "string" },
                availability_pct: { type: "string" }
              },
              required: ["timestamp", "generation_mwh"],
              additionalProperties: false
            },
            meteo: {
              type: "object",
              properties: {
                timestamp: { type: "string" },
                irradiance_wm2: { type: "string" },
                temperature_c: { type: "string" }
              },
              required: ["timestamp", "irradiance_wm2"],
              additionalProperties: false
            }
          },
          required: ["scada", "meteo"],
          additionalProperties: false
        }
      }
    }
  });
  
  const mappingContent = mappingResponse.choices[0].message.content;
  const mappings = JSON.parse(typeof mappingContent === 'string' ? mappingContent : '{}');
  
  return {
    scadaHeaders,
    meteoHeaders,
    suggestedMappings: mappings
  };
}

export async function saveColumnMappings(
  analysisId: number,
  scadaMapping: Record<string, string>,
  meteoMapping: Record<string, string>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  
  await db
    .update(customAnalyses)
    .set({
      scadaColumnMapping: scadaMapping,
      meteoColumnMapping: meteoMapping,
      status: "mapping",
    })
    .where(eq(customAnalyses.id, analysisId));
  
  return { success: true };
}

export async function saveContractDetails(
  analysisId: number,
  contract: {
    capacityMw: number;
    tariffPerMwh: number;
    startDate: string;
    endDate: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  
  await db
    .update(customAnalyses)
    .set({
      contractCapacityMw: contract.capacityMw.toString(),
      tariffPerMwh: contract.tariffPerMwh.toString(),
      contractStartDate: parseDate(contract.startDate),
      contractEndDate: parseDate(contract.endDate),
      status: "processing",
    })
    .where(eq(customAnalyses.id, analysisId));
  
  return { success: true };
}

export async function runPerformanceAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses, assessments } = await import("../drizzle/schema");
  
  // Get analysis record
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, analysisId))
    .limit(1);
  
  if (!analysis) throw new Error("Analysis not found");
  
  // Update status to processing
  await db
    .update(customAnalyses)
    .set({
      status: "processing",
      processingStartedAt: new Date(),
    })
    .where(eq(customAnalyses.id, analysisId));
  
  try {
    // TODO: Implement actual performance model
    // For now, create a placeholder assessment
    const [assessment] = await db.insert(assessments).values({
      siteId: analysis.siteId,
      dateRangeStart: analysis.contractStartDate || new Date(),
      dateRangeEnd: analysis.contractEndDate || new Date(),
      technicalPr: "85.5",
      overallPr: "82.3",
      curtailmentMwh: "150.5",
      curtailmentPct: "2.5",
      underperformanceMwh: "200.0",
      lostRevenueEstimate: "15000.00",
    });
    
    // Update analysis with assessment link
    await db
      .update(customAnalyses)
      .set({
        status: "completed",
        processingCompletedAt: new Date(),
        assessmentId: assessment.insertId,
      })
      .where(eq(customAnalyses.id, analysisId));
    
    return { success: true, assessmentId: assessment.insertId };
  } catch (error: any) {
    // Update status to failed
    await db
      .update(customAnalyses)
      .set({
        status: "failed",
        errorMessage: error.message,
      })
      .where(eq(customAnalyses.id, analysisId));
    
    throw error;
  }
}

export async function uploadContractFile(analysisId: number, fileName: string, fileContent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { storagePut } = await import("./storage");
  const { customAnalyses } = await import("../drizzle/schema");
  
  // Decode base64 and upload to S3
  const buffer = Buffer.from(fileContent, 'base64');
  const fileKey = `custom-analysis/${analysisId}/contract-${Date.now()}-${fileName}`;
  const { url } = await storagePut(fileKey, buffer, 'application/pdf');
  
  // Update analysis record
  await db
    .update(customAnalyses)
    .set({
      contractFileUrl: url,
      contractFileName: fileName,
      status: "extracting_model",
    })
    .where(eq(customAnalyses.id, analysisId));
  
  return { url, fileName };
}

export async function extractAndSaveContractModel(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  // Use V3 hybrid pipeline (Tesseract + Pix2Text + Qwen)
  const { extractContractFromPdf, convertToLegacyFormat } = await import("./contractParserV3");
  
  // Get analysis record
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, analysisId))
    .limit(1);
  
  if (!analysis) throw new Error("Analysis not found");
  if (!analysis.contractFileUrl) throw new Error("No contract file uploaded");
  
  try {
    // Download PDF to temp file
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(analysis.contractFileUrl);
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);
    
    const buffer = await response.buffer();
    const tempPdfPath = `/tmp/contract-${analysisId}.pdf`;
    await (await import('fs/promises')).writeFile(tempPdfPath, buffer);
    
    // Extract model using V2 OCR-first pipeline
    const modelV2 = await extractContractFromPdf(tempPdfPath);
    
    // Convert to legacy format for backwards compatibility
    const model = convertToLegacyFormat(modelV2);
    
    // Add validation info based on exceptions
    const needsClarification = modelV2.exceptions.length > 0;
    (model as any)._validation = {
      needsClarification,
      clarificationCount: modelV2.exceptions.length
    };
    
    // Save extracted model
    await db
      .update(customAnalyses)
      .set({
        extractedModel: model,
        status: "confirming_model",
        // Extract key parameters
        contractCapacityMw: model.parameters.contractCapacityMw?.toString(),
        tariffPerMwh: model.tariffs.baseRate?.toString(),
        contractStartDate: parseDate(model.parameters.contractStartDate),
        contractEndDate: parseDate(model.parameters.contractEndDate),
      })
      .where(eq(customAnalyses.id, analysisId));
    
    return { success: true, model };
  } catch (error: any) {
    // Update status to failed
    await db
      .update(customAnalyses)
      .set({
        status: "failed",
        errorMessage: `Model extraction failed: ${error.message}`,
      })
      .where(eq(customAnalyses.id, analysisId));
    
    throw error;
  }
}

export async function confirmContractModel(analysisId: number, confirmedModel: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  
  // Update with confirmed model
  await db
    .update(customAnalyses)
    .set({
      extractedModel: confirmedModel,
      modelConfirmed: true,
      modelConfirmedAt: new Date(),
      status: "uploading", // Ready for data file uploads
    })
    .where(eq(customAnalyses.id, analysisId));
  
  return { success: true };
}

// Column mapping functions
export async function analyzeAndStoreColumnMappings(analysisId: number, scadaFileUrl: string, meteoFileUrl: string) {
  const { analyzeColumnMappings } = await import("./columnMapper");
  const { parseExcelFile } = await import("./excelParser");
  
  // Fetch and parse headers from uploaded files
  const scadaResponse = await fetch(scadaFileUrl);
  const scadaBuffer = Buffer.from(await scadaResponse.arrayBuffer());
  
  const meteoResponse = await fetch(meteoFileUrl);
  const meteoBuffer = Buffer.from(await meteoResponse.arrayBuffer());
  
  // Determine file type and extract headers
  const scadaHeaders = scadaFileUrl.endsWith('.csv') 
    ? scadaBuffer.toString().split('\n')[0].split(',').map(h => h.trim())
    : (await parseExcelFile(scadaBuffer))[0];
    
  const meteoHeaders = meteoFileUrl.endsWith('.csv')
    ? meteoBuffer.toString().split('\n')[0].split(',').map(h => h.trim())
    : (await parseExcelFile(meteoBuffer))[0];

  // Get model variables from analysis
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, analysisId))
    .limit(1);

  if (!analysis) {
    throw new Error("Analysis not found");
  }

  // Extract variables from equations
  const modelVariables: Array<{ name: string; description: string; unit: string }> = [];
  
  if (analysis.extractedModel) {
    const model = JSON.parse(typeof analysis.extractedModel === 'string' ? analysis.extractedModel : JSON.stringify(analysis.extractedModel));
    
    // Collect variables from equations
    if (model.equations) {
      for (const eq of model.equations) {
        if (eq.variables) {
          for (const v of eq.variables) {
            if (!modelVariables.find(mv => mv.name === v.name)) {
              modelVariables.push({
                name: v.name,
                description: v.description,
                unit: v.unit
              });
            }
          }
        }
      }
    }
  }

  // Analyze and suggest mappings
  const mappings = await analyzeColumnMappings(scadaHeaders, meteoHeaders, modelVariables);

  // Store mappings
  await db.update(customAnalyses)
    .set({
      scadaColumnMapping: mappings.scada_mappings,
      meteoColumnMapping: mappings.meteo_mappings,
      status: 'mapping',
      updatedAt: new Date()
    })
    .where(eq(customAnalyses.id, analysisId));

  return mappings;
}

export async function updateColumnMappings(analysisId: number, scadaMappings: any, meteoMappings: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  await db.update(customAnalyses)
    .set({
      scadaColumnMapping: scadaMappings,
      meteoColumnMapping: meteoMappings,
      updatedAt: new Date()
    })
    .where(eq(customAnalyses.id, analysisId));

  return { success: true };
}


// Model execution functions
export async function executeCustomAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses, assessments } = await import("../drizzle/schema");
  const { executeAnalysis } = await import("./modelExecutor");
  
  // Get analysis record
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, analysisId))
    .limit(1);
  
  if (!analysis) {
    throw new Error("Analysis not found");
  }
  
  if (!analysis.scadaFileUrl || !analysis.meteoFileUrl) {
    throw new Error("Data files not uploaded");
  }
  
  if (!analysis.extractedModel) {
    throw new Error("Contract model not extracted");
  }
  
  if (!analysis.scadaColumnMapping || !analysis.meteoColumnMapping) {
    throw new Error("Column mappings not configured");
  }
  
  // Update status to processing
  await db.update(customAnalyses)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(customAnalyses.id, analysisId));
  
  try {
    // Parse model and mappings
    const extractedModel = typeof analysis.extractedModel === 'string' 
      ? JSON.parse(analysis.extractedModel) 
      : analysis.extractedModel;
      
    const scadaMappings = typeof analysis.scadaColumnMapping === 'string'
      ? JSON.parse(analysis.scadaColumnMapping)
      : analysis.scadaColumnMapping;
      
    const meteoMappings = typeof analysis.meteoColumnMapping === 'string'
      ? JSON.parse(analysis.meteoColumnMapping)
      : analysis.meteoColumnMapping;
    
    // Execute model
    const results = await executeAnalysis(
      analysisId,
      analysis.scadaFileUrl,
      analysis.meteoFileUrl,
      extractedModel,
      scadaMappings,
      meteoMappings
    );
    
    // Create assessment record
    const [assessmentResult] = await db.insert(assessments).values({
      siteId: analysis.siteId,
      assessmentDate: new Date(),
      dateRangeStart: new Date(), // TODO: Extract from data
      dateRangeEnd: new Date(), // TODO: Extract from data
      technicalPr: results.performance_ratio.toString(),
      overallPr: results.performance_ratio.toString(),
      curtailmentMwh: "0", // TODO: Extract from data
      curtailmentPct: "0",
      underperformanceMwh: "0",
      lostRevenueEstimate: results.penalties.toString(),
    });
    
    // Update analysis status
    await db.update(customAnalyses)
      .set({
        status: 'completed',
        assessmentId: Number(assessmentResult.insertId),
        updatedAt: new Date()
      })
      .where(eq(customAnalyses.id, analysisId));
    
    return {
      success: true,
      assessmentId: assessmentResult.insertId,
      results,
    };
  } catch (error) {
    // Update status to failed
    await db.update(customAnalyses)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(customAnalyses.id, analysisId));
    
    throw error;
  }
}

// Equation detection and review functions
export async function detectContractEquations(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  const { detectEquationsOnly } = await import("./contractParserV3");
  
  // Get analysis record
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, analysisId))
    .limit(1);
  
  if (!analysis) throw new Error("Analysis not found");
  if (!analysis.contractFileUrl) throw new Error("No contract file uploaded");
  
  try {
    // Download PDF to temp file
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(analysis.contractFileUrl);
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);
    
    const buffer = await response.buffer();
    const tempPdfPath = `/tmp/contract-${analysisId}.pdf`;
    await (await import('fs/promises')).writeFile(tempPdfPath, buffer);
    
    // Detect equations (without full Qwen interpretation)
    const detectedEquations = await detectEquationsOnly(tempPdfPath);
    
    return {
      success: true,
      pdfUrl: analysis.contractFileUrl,
      equations: detectedEquations,
    };
  } catch (error: any) {
    throw new Error(`Equation detection failed: ${error.message}`);
  }
}

export async function extractEquationFromRegion(
  analysisId: number,
  pageNumber: number,
  bbox: { x: number; y: number; width: number; height: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  const { extractLatexFromRegion } = await import("./contractParserV3");
  
  // Get analysis record
  const [analysis] = await db
    .select()
    .from(customAnalyses)
    .where(eq(customAnalyses.id, analysisId))
    .limit(1);
  
  if (!analysis) throw new Error("Analysis not found");
  if (!analysis.contractFileUrl) throw new Error("No contract file uploaded");
  
  try {
    // Download PDF to temp file
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(analysis.contractFileUrl);
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);
    
    const buffer = await response.buffer();
    const tempPdfPath = `/tmp/contract-${analysisId}.pdf`;
    await (await import('fs/promises')).writeFile(tempPdfPath, buffer);
    
    // Extract LaTeX from the specified region
    const latex = await extractLatexFromRegion(tempPdfPath, pageNumber, bbox);
    
    return { latex };
  } catch (error: any) {
    throw new Error(`LaTeX extraction failed: ${error.message}`);
  }
}

export async function buildModelFromVerifiedEquations(
  analysisId: number,
  verifiedEquations: Array<{
    id: string;
    pageNumber: number;
    latex: string;
    context: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customAnalyses } = await import("../drizzle/schema");
  const { buildModelFromEquations, convertToLegacyFormat } = await import("./contractParserV3");
  
  try {
    // Build model using Qwen with verified equations only
    const modelV2 = await buildModelFromEquations(verifiedEquations);
    
    // Convert to legacy format for backwards compatibility
    const model = convertToLegacyFormat(modelV2);
    
    // Add validation info
    const needsClarification = modelV2.exceptions.length > 0;
    (model as any)._validation = {
      needsClarification,
      clarificationCount: modelV2.exceptions.length
    };
    
    // Save extracted model
    await db
      .update(customAnalyses)
      .set({
        extractedModel: model,
        status: "confirming_model",
        // Extract key parameters
        contractCapacityMw: model.parameters.contractCapacityMw?.toString(),
        tariffPerMwh: model.tariffs.baseRate?.toString(),
        contractStartDate: parseDate(model.parameters.contractStartDate),
        contractEndDate: parseDate(model.parameters.contractEndDate),
      })
      .where(eq(customAnalyses.id, analysisId));
    
    return { success: true, model };
  } catch (error: any) {
    // Update status to failed
    await db
      .update(customAnalyses)
      .set({
        status: "failed",
        errorMessage: `Model building failed: ${error.message}`,
      })
      .where(eq(customAnalyses.id, analysisId));
    
    throw error;
  }
}
