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