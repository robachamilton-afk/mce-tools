import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// Mock context for testing
const mockContext: Context = {
  user: null,
  req: {} as any,
  res: {} as any,
};

describe("Sites API", () => {
  describe("sites.list", () => {
    it("should return an array of sites", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();

      expect(Array.isArray(sites)).toBe(true);
      expect(sites.length).toBeGreaterThan(0);
    });

    it("should return sites with required fields", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();

      const firstSite = sites[0];
      expect(firstSite).toHaveProperty("id");
      expect(firstSite).toHaveProperty("duid");
      expect(firstSite).toHaveProperty("name");
      expect(firstSite).toHaveProperty("capacityDcMw");
    });

    it("should return sites ordered by name", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();

      // Check that sites are alphabetically ordered
      for (let i = 1; i < sites.length; i++) {
        const prevName = sites[i - 1].name.toLowerCase();
        const currName = sites[i].name.toLowerCase();
        expect(prevName <= currName).toBe(true);
      }
    });
  });

  describe("sites.search", () => {
    it("should find sites by name", async () => {
      const caller = appRouter.createCaller(mockContext);
      const results = await caller.sites.search({ query: "Clare" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Check that results contain the search term
      const hasMatch = results.some(site => 
        site.name.toLowerCase().includes("clare")
      );
      expect(hasMatch).toBe(true);
    });

    it("should find sites by DUID", async () => {
      const caller = appRouter.createCaller(mockContext);
      const results = await caller.sites.search({ query: "CLARESF1" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Check that results contain the DUID
      const hasMatch = results.some(site => 
        site.duid?.toLowerCase().includes("claresf1")
      );
      expect(hasMatch).toBe(true);
    });

    it("should return empty array for non-existent site", async () => {
      const caller = appRouter.createCaller(mockContext);
      const results = await caller.sites.search({ query: "NonExistentSolarFarm12345" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("should limit results to 20 sites", async () => {
      const caller = appRouter.createCaller(mockContext);
      // Use a common term that might match many sites
      const results = await caller.sites.search({ query: "Solar" });

      expect(results.length).toBeLessThanOrEqual(20);
    });

    it("should be case-insensitive", async () => {
      const caller = appRouter.createCaller(mockContext);
      const resultsLower = await caller.sites.search({ query: "clare" });
      const resultsUpper = await caller.sites.search({ query: "CLARE" });
      const resultsMixed = await caller.sites.search({ query: "Clare" });

      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsLower.length).toBe(resultsMixed.length);
    });
  });

  describe("sites.getById", () => {
    it("should return a site by ID", async () => {
      const caller = appRouter.createCaller(mockContext);
      
      // First get a site from the list
      const sites = await caller.sites.list();
      expect(sites.length).toBeGreaterThan(0);
      
      const firstSite = sites[0];
      const result = await caller.sites.getById({ id: firstSite.id });

      expect(result).toBeDefined();
      expect(result?.id).toBe(firstSite.id);
      expect(result?.duid).toBe(firstSite.duid);
      expect(result?.name).toBe(firstSite.name);
    });

    it("should return undefined for non-existent ID", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.sites.getById({ id: 999999 });

      expect(result).toBeUndefined();
    });

    it("should return site with all expected fields", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();
      const firstSite = sites[0];
      
      const result = await caller.sites.getById({ id: firstSite.id });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("duid");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("capacityDcMw");
      expect(result).toHaveProperty("capacityAcMw");
      expect(result).toHaveProperty("latitude");
      expect(result).toHaveProperty("longitude");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("dataSource");
    });
  });

  describe("Database integrity", () => {
    it("should have imported all 125 sites", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();

      // We expect 124-125 sites from the master database
      expect(sites.length).toBeGreaterThanOrEqual(124);
      expect(sites.length).toBeLessThanOrEqual(125);
    });

    it("should have unique DUIDs", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();

      const duids = sites.map(s => s.duid).filter(Boolean);
      const uniqueDuids = new Set(duids);

      expect(duids.length).toBe(uniqueDuids.size);
    });

    it("should have valid capacity values", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();

      sites.forEach(site => {
        if (site.capacityDcMw !== null) {
          const capacity = Number(site.capacityDcMw);
          expect(capacity).toBeGreaterThan(0);
          expect(capacity).toBeLessThan(1000); // No solar farm > 1000 MW
        }
      });
    });

    it("should have valid coordinates", async () => {
      const caller = appRouter.createCaller(mockContext);
      const sites = await caller.sites.list();

      sites.forEach(site => {
        if (site.latitude !== null && site.longitude !== null) {
          const lat = Number(site.latitude);
          const lon = Number(site.longitude);
          
          // Australian coordinates roughly
          expect(lat).toBeGreaterThan(-45);
          expect(lat).toBeLessThan(-10);
          expect(lon).toBeGreaterThan(110);
          expect(lon).toBeLessThan(155);
        }
      });
    });
  });
});
