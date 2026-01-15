import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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

  sites: router({
    list: publicProcedure.query(async () => {
      return await db.getAllSites();
    }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchSites(input.query);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSiteById(input.id);
      }),

    getConfiguration: publicProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSiteConfiguration(input.siteId);
      }),

    getAssessments: publicProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSiteAssessments(input.siteId);
      }),
  }),

  assessments: router({
    list: publicProcedure.query(async () => {
      return await db.getAllAssessments();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssessmentById(input.id);
      }),
  }),

  equipment: router({
    // Get all equipment detections for a site
    getBySiteId: publicProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEquipmentDetections(input.siteId);
      }),

    // Add new equipment detection (user-added)
    add: publicProcedure
      .input(z.object({
        siteId: z.number(),
        type: z.enum(["pcu", "substation", "combiner_box", "transformer", "other"]),
        latitude: z.number(),
        longitude: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.addEquipmentDetection({
          ...input,
          status: "user_added",
          verifiedBy: ctx.user?.id,
        });
      }),

    // Update equipment location
    updateLocation: publicProcedure
      .input(z.object({
        id: z.number(),
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateEquipmentLocation(input.id, input.latitude, input.longitude);
      }),

    // Verify equipment detection (change status to user_verified)
    verify: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.verifyEquipmentDetection(input.id, ctx.user?.id);
      }),

    // Delete equipment detection
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteEquipmentDetection(input.id);
      }),
  }),

  customAnalysis: router({
    // Create new custom analysis
    create: protectedProcedure
      .input(z.object({
        siteId: z.number(),
        name: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createCustomAnalysis({
          siteId: input.siteId,
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
        });
      }),

    // Get custom analysis by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCustomAnalysisById(input.id);
      }),

    // List custom analyses for a site
    listBySite: publicProcedure
      .input(z.object({ siteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCustomAnalysesBySite(input.siteId);
      }),

    // Upload contract file
    uploadContract: protectedProcedure
      .input(z.object({
        analysisId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // base64 encoded
      }))
      .mutation(async ({ input }) => {
        return await db.uploadContractFile(input.analysisId, input.fileName, input.fileContent);
      }),

    // Extract model from contract
    extractModel: protectedProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.extractAndSaveContractModel(input.analysisId);
      }),

    // Confirm extracted model
    confirmModel: protectedProcedure
      .input(z.object({
        analysisId: z.number(),
        model: z.any(), // Complex nested structure
      }))
      .mutation(async ({ input }) => {
        return await db.confirmContractModel(input.analysisId, input.model);
      }),

    // Upload SCADA file
    uploadScada: protectedProcedure
      .input(z.object({
        analysisId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // base64 encoded
      }))
      .mutation(async ({ input }) => {
        return await db.uploadScadaFile(input.analysisId, input.fileName, input.fileContent);
      }),

    // Upload meteo file
    uploadMeteo: protectedProcedure
      .input(z.object({
        analysisId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // base64 encoded
      }))
      .mutation(async ({ input }) => {
        return await db.uploadMeteoFile(input.analysisId, input.fileName, input.fileContent);
      }),

    // Analyze CSV/PDF headers with LLM
    analyzeHeaders: publicProcedure
      .input(z.object({
        analysisId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.analyzeCSVHeaders(input.analysisId);
      }),

    // Save column mappings
    saveColumnMappings: publicProcedure
      .input(z.object({
        analysisId: z.number(),
        scadaMapping: z.record(z.string(), z.string()),
        meteoMapping: z.record(z.string(), z.string()),
      }))
      .mutation(async ({ input }) => {
        return await db.saveColumnMappings(
          input.analysisId,
          input.scadaMapping as Record<string, string>,
          input.meteoMapping as Record<string, string>
        );
      }),

    // Save contract details
    saveContract: publicProcedure
      .input(z.object({
        analysisId: z.number(),
        capacityMw: z.number(),
        tariffPerMwh: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.saveContractDetails(input.analysisId, {
          capacityMw: input.capacityMw,
          tariffPerMwh: input.tariffPerMwh,
          startDate: input.startDate,
          endDate: input.endDate,
        });
      }),

    // Run performance analysis
    runAnalysis: publicProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.runPerformanceAnalysis(input.analysisId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
