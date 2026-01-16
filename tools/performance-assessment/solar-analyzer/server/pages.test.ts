import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Site Detail Page Backend", () => {
  it("should retrieve site by ID", async () => {
    const site = await db.getSiteById(1);
    
    expect(site).toBeDefined();
    expect(site?.id).toBe(1);
    expect(site?.name).toBeDefined();
    expect(site?.duid).toBeDefined();
  });

  it("should return undefined for non-existent site ID", async () => {
    const site = await db.getSiteById(99999);
    expect(site).toBeUndefined();
  });

  it("should have all required fields for site detail display", async () => {
    const site = await db.getSiteById(1);
    
    expect(site).toBeDefined();
    if (site) {
      expect(site).toHaveProperty("id");
      expect(site).toHaveProperty("name");
      expect(site).toHaveProperty("duid");
      expect(site).toHaveProperty("capacityDcMw");
      expect(site).toHaveProperty("latitude");
      expect(site).toHaveProperty("longitude");
      expect(site).toHaveProperty("status");
    }
  });
});

describe("Dashboard Backend", () => {
  it("should retrieve all sites for dashboard stats", async () => {
    const sites = await db.getAllSites();
    
    expect(sites).toBeDefined();
    expect(Array.isArray(sites)).toBe(true);
    expect(sites.length).toBeGreaterThan(0);
  });

  it("should calculate total capacity correctly", async () => {
    const sites = await db.getAllSites();
    const totalCapacity = sites.reduce((sum, site) => 
      sum + (Number(site.capacityDcMw) || 0), 0
    );
    
    expect(totalCapacity).toBeGreaterThan(0);
    expect(totalCapacity).toBeLessThan(100000); // Sanity check
  });

  it("should identify operational sites", async () => {
    const sites = await db.getAllSites();
    const operationalSites = sites.filter(site => 
      site.status?.toLowerCase() === 'operational'
    );
    
    expect(operationalSites.length).toBeGreaterThan(0);
    expect(operationalSites.length).toBeLessThanOrEqual(sites.length);
  });

  it("should sort sites by capacity for top sites list", async () => {
    const sites = await db.getAllSites();
    const sortedSites = [...sites].sort((a, b) => 
      (Number(b.capacityDcMw) || 0) - (Number(a.capacityDcMw) || 0)
    );
    
    expect(sortedSites[0]).toBeDefined();
    expect(Number(sortedSites[0].capacityDcMw)).toBeGreaterThanOrEqual(
      Number(sortedSites[1].capacityDcMw) || 0
    );
  });

  it("should have valid data for top 10 sites", async () => {
    const sites = await db.getAllSites();
    const topSites = sites
      .sort((a, b) => (Number(b.capacityDcMw) || 0) - (Number(a.capacityDcMw) || 0))
      .slice(0, 10);
    
    expect(topSites.length).toBe(10);
    
    topSites.forEach(site => {
      expect(site.name).toBeDefined();
      expect(site.duid).toBeDefined();
      expect(site.capacityDcMw).toBeDefined();
      expect(Number(site.capacityDcMw)).toBeGreaterThan(0);
    });
  });

  it("should have coordinates for top sites (for map display)", async () => {
    const sites = await db.getAllSites();
    const topSites = sites
      .sort((a, b) => (Number(b.capacityDcMw) || 0) - (Number(a.capacityDcMw) || 0))
      .slice(0, 10);
    
    const sitesWithCoords = topSites.filter(site => 
      site.latitude && site.longitude
    );
    
    expect(sitesWithCoords.length).toBeGreaterThan(0);
  });
});

describe("Navigation and Routing", () => {
  it("should have valid site IDs for routing", async () => {
    const sites = await db.getAllSites();
    
    sites.forEach(site => {
      expect(site.id).toBeDefined();
      expect(typeof site.id).toBe("number");
      expect(site.id).toBeGreaterThan(0);
    });
  });

  it("should support search to site detail navigation", async () => {
    const searchResults = await db.searchSites("Clare");
    
    expect(searchResults.length).toBeGreaterThan(0);
    
    const firstResult = searchResults[0];
    const siteDetail = await db.getSiteById(firstResult.id);
    
    expect(siteDetail).toBeDefined();
    expect(siteDetail?.id).toBe(firstResult.id);
  });
});

describe("Data Integrity for UI Display", () => {
  it("should have no null names for display", async () => {
    const sites = await db.getAllSites();
    const sitesWithoutNames = sites.filter(site => !site.name);
    
    expect(sitesWithoutNames.length).toBe(0);
  });

  it("should have DUIDs for most sites", async () => {
    const sites = await db.getAllSites();
    const sitesWithDuids = sites.filter(site => site.duid);
    
    // Most sites should have DUIDs (87% have DUIDs in current dataset)
    expect(sitesWithDuids.length).toBeGreaterThan(sites.length * 0.8);
    expect(sitesWithDuids.length).toBeGreaterThan(100);
  });

  it("should have valid capacity values for charts", async () => {
    const sites = await db.getAllSites();
    
    sites.forEach(site => {
      if (site.capacityDcMw) {
        const capacity = Number(site.capacityDcMw);
        expect(capacity).toBeGreaterThanOrEqual(0);
        expect(capacity).toBeLessThan(1000); // Max reasonable MW
        expect(isNaN(capacity)).toBe(false);
      }
    });
  });
});
