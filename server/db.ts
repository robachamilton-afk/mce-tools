import { eq, like, or, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sites, siteConfigurations, assessments, InsertSiteConfiguration, InsertAssessment } from "../drizzle/schema";
import { ENV } from './_core/env';

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
