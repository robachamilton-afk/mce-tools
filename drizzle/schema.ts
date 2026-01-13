import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
 * Solar farm sites master database
 * Sourced from APVI/Clean Energy Regulator
 */
export const sites = mysqlTable("sites", {
  id: int("id").autoincrement().primaryKey(),
  duid: varchar("duid", { length: 32 }).unique(),
  name: text("name").notNull(),
  capacityDcMw: decimal("capacity_dc_mw", { precision: 10, scale: 3 }),
  capacityAcMw: decimal("capacity_ac_mw", { precision: 10, scale: 3 }),
  region: varchar("region", { length: 16 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  commissioningDate: timestamp("commissioning_date"),
  owner: text("owner"),
  status: varchar("status", { length: 32 }),
  dataSource: varchar("data_source", { length: 64 }).default("APVI"),
  userModified: int("user_modified").default(0).notNull(), // boolean flag
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;

/**
 * Site-specific performance configuration
 * Stores tracking type, angles, and detection metadata
 */
export const siteConfigurations = mysqlTable("site_configurations", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  trackingType: mysqlEnum("tracking_type", ["fixed", "single_axis", "dual_axis", "unknown"]).default("unknown").notNull(),
  axisAzimuth: decimal("axis_azimuth", { precision: 5, scale: 2 }), // degrees
  tiltAngle: decimal("tilt_angle", { precision: 5, scale: 2 }), // degrees
  maxRotationAngle: decimal("max_rotation_angle", { precision: 5, scale: 2 }), // degrees
  gcr: decimal("gcr", { precision: 4, scale: 3 }), // ground coverage ratio
  detectionMethod: mysqlEnum("detection_method", ["satellite", "performance", "manual", "hybrid"]),
  confidenceScore: int("confidence_score"), // 0-100
  lastValidated: timestamp("last_validated"),
  satelliteImageUrl: text("satellite_image_url"),
  satelliteImageDate: timestamp("satellite_image_date"),
  // Equipment details
  inverterMake: varchar("inverter_make", { length: 128 }),
  inverterModel: varchar("inverter_model", { length: 128 }),
  inverterCount: int("inverter_count"),
  pcuCount: int("pcu_count"), // Power Conversion Units detected from satellite
  moduleMake: varchar("module_make", { length: 128 }),
  moduleModel: varchar("module_model", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SiteConfiguration = typeof siteConfigurations.$inferSelect;
export type InsertSiteConfiguration = typeof siteConfigurations.$inferInsert;

/**
 * Performance assessment results
 * Stores metrics, reports, and visualizations for each assessment
 */
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  assessmentDate: timestamp("assessment_date").defaultNow().notNull(),
  dateRangeStart: timestamp("date_range_start").notNull(),
  dateRangeEnd: timestamp("date_range_end").notNull(),
  technicalPr: decimal("technical_pr", { precision: 5, scale: 2 }), // percentage
  overallPr: decimal("overall_pr", { precision: 5, scale: 2 }), // percentage
  curtailmentMwh: decimal("curtailment_mwh", { precision: 10, scale: 2 }),
  curtailmentPct: decimal("curtailment_pct", { precision: 5, scale: 2 }),
  underperformanceMwh: decimal("underperformance_mwh", { precision: 10, scale: 2 }),
  lostRevenueEstimate: decimal("lost_revenue_estimate", { precision: 12, scale: 2 }), // dollars
  reportPdfUrl: text("report_pdf_url"),
  dataCsvUrl: text("data_csv_url"),
  visualizationPngUrl: text("visualization_png_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;