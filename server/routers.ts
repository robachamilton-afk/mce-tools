import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
});

export type AppRouter = typeof appRouter;
