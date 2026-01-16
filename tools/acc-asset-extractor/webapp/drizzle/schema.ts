import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
 * Extraction jobs track the processing of document sets
 */
export const extractionJobs = mysqlTable("extraction_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  rclonePath: text("rclone_path").notNull(),
  status: mysqlEnum("status", ["pending", "reviewing", "extracting", "completed", "failed"]).default("pending").notNull(),
  totalDocuments: int("total_documents").default(0),
  reviewedDocuments: int("reviewed_documents").default(0),
  extractedDocuments: int("extracted_documents").default(0),
  totalAssets: int("total_assets").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ExtractionJob = typeof extractionJobs.$inferSelect;
export type InsertExtractionJob = typeof extractionJobs.$inferInsert;

/**
 * Assets extracted from documents
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  assetId: varchar("asset_id", { length: 255 }).notNull(), // Original asset ID from document
  name: text("name").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // equipment, cable, structure, etc.
  type: varchar("type", { length: 100 }), // specific type
  location: varchar("location", { length: 255 }), // block/zone/building
  quantity: int("quantity").default(1),
  specifications: text("specifications"), // JSON string
  confidence: int("confidence").notNull(), // 0-100
  sourceDocument: text("source_document").notNull(),
  sourceDocumentPath: text("source_document_path"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Document review log
 */
export const documentReviews = mysqlTable("document_reviews", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  isAssetRelevant: int("is_asset_relevant").notNull(), // 0 or 1 for boolean
  assetTypes: text("asset_types"), // JSON array
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
});

export type DocumentReview = typeof documentReviews.$inferSelect;
export type InsertDocumentReview = typeof documentReviews.$inferInsert;