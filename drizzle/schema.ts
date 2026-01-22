import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Multi-tenant tables for project documents, facts, and red flags
 */
export const documents = mysqlTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: int("project_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSizeBytes: int("file_size_bytes").notNull(),
  fileHash: varchar("file_hash", { length: 64 }),
  documentType: varchar("document_type", { length: 50 }),
  uploadDate: timestamp("upload_date").notNull(),
  status: varchar("status", { length: 20 }).default("uploaded"),
  extractedText: text("extracted_text"),
  pageCount: int("page_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extractedFacts = mysqlTable("extracted_facts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: int("project_id").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  dataType: varchar("data_type", { length: 50 }),
  confidence: varchar("confidence", { length: 10 }),
  sourceDocumentId: varchar("source_document_id", { length: 36 }),
  sourceLocation: text("source_location"),
  extractionMethod: varchar("extraction_method", { length: 50 }),
  extractionModel: varchar("extraction_model", { length: 100 }),
  verified: int("verified").default(0),
  verificationStatus: varchar("verification_status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const redFlags = mysqlTable("red_flags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: int("project_id").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }),
  triggerFactId: varchar("trigger_fact_id", { length: 36 }),
  downstreamConsequences: text("downstream_consequences"),
  mitigated: int("mitigated").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const processingJobs = mysqlTable("processing_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: int("project_id").notNull(),
  documentId: varchar("document_id", { length: 36 }),
  jobType: varchar("job_type", { length: 50 }),
  status: varchar("status", { length: 20 }),
  progress: int("progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type ExtractedFact = typeof extractedFacts.$inferSelect;
export type InsertExtractedFact = typeof extractedFacts.$inferInsert;
export type RedFlag = typeof redFlags.$inferSelect;
export type InsertRedFlag = typeof redFlags.$inferInsert;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = typeof processingJobs.$inferInsert;

/**
 * Projects table - stores project metadata and per-project database configuration
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dbName: varchar("dbName", { length: 255 }).notNull().unique(), // Dynamic project DB name
  dbHost: varchar("dbHost", { length: 255 }).default("localhost"),
  dbPort: int("dbPort").default(3306),
  dbUser: varchar("dbUser", { length: 255 }),
  dbPassword: varchar("dbPassword", { length: 255 }),
  status: mysqlEnum("status", ["Active", "Archived", "Deleted"]).default("Active"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Knowledge base configuration - stores connection details for the central knowledge database
 */
export const knowledgeBaseConfig = mysqlTable("knowledgeBaseConfig", {
  id: int("id").autoincrement().primaryKey(),
  dbName: varchar("dbName", { length: 255 }).notNull().unique(),
  dbHost: varchar("dbHost", { length: 255 }).default("localhost"),
  dbPort: int("dbPort").default(3306),
  dbUser: varchar("dbUser", { length: 255 }),
  dbPassword: varchar("dbPassword", { length: 255 }),
  status: mysqlEnum("status", ["Active", "Inactive"]).default("Active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeBaseConfig = typeof knowledgeBaseConfig.$inferSelect;
export type InsertKnowledgeBaseConfig = typeof knowledgeBaseConfig.$inferInsert;

/**
 * Ollama configuration - stores LLM model settings for document processing
 */
export const ollamaConfig = mysqlTable("ollamaConfig", {
  id: int("id").autoincrement().primaryKey(),
  baseUrl: varchar("baseUrl", { length: 255 }).default("http://localhost:11434"),
  model: varchar("model", { length: 255 }).default("llama2"),
  temperature: varchar("temperature", { length: 10 }).default("0.3"),
  topP: varchar("topP", { length: 10 }).default("0.9"),
  timeoutSeconds: int("timeoutSeconds").default(60),
  enabled: int("enabled").default(1), // 1 = true, 0 = false
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OllamaConfig = typeof ollamaConfig.$inferSelect;
export type InsertOllamaConfig = typeof ollamaConfig.$inferInsert;