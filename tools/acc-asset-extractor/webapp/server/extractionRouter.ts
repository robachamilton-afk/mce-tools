import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { startExtraction, cancelExtraction } from "./extraction";
import { generateDemoAssets, getDemoJobStats } from "./demoData";
import { generateACCExcel, cleanupOldExports } from "./excelExport";
import fs from "fs/promises";

export const extractionRouter = router({
  // List all extraction jobs for current user
  listJobs: protectedProcedure.query(async ({ ctx }) => {
    return db.getExtractionJobsByUserId(ctx.user.id);
  }),

  // Get specific job details
  getJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const job = await db.getExtractionJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return job;
    }),

  // Create and start new extraction job
  createJob: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        rclonePath: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Create job record
      const result = await db.createExtractionJob({
        userId: ctx.user.id,
        projectName: input.projectName,
        rclonePath: input.rclonePath,
        status: "pending",
      });

      const jobId = Number(result[0].insertId);

      // Start extraction process in background
      startExtraction(
        jobId,
        input.rclonePath,
        input.projectName,
        async (progress) => {
          // Update job status in database
          await db.updateExtractionJob(jobId, {
            status: progress.status,
            totalDocuments: progress.totalDocuments,
            reviewedDocuments: progress.reviewedDocuments,
            extractedDocuments: progress.extractedDocuments,
            totalAssets: progress.totalAssets,
            ...(progress.status === "completed" && { completedAt: new Date() }),
          });
        }
      ).catch((error) => {
        console.error(`Failed to start extraction for job ${jobId}:`, error);
        db.updateExtractionJob(jobId, { status: "failed" });
      });

      return { jobId };
    }),

  // Cancel running job
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await db.getExtractionJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      cancelExtraction(input.jobId);
      await db.updateExtractionJob(input.jobId, { status: "failed" });

      return { success: true };
    }),

  // Get assets for a job
  getAssets: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        category: z.string().optional(),
        minConfidence: z.number().min(0).max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const job = await db.getExtractionJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      let assets = await db.getAssetsByJobId(input.jobId);

      // Apply filters
      if (input.category) {
        assets = assets.filter((a) => a.category === input.category);
      }
      if (input.minConfidence !== undefined) {
        const minConf = input.minConfidence;
        assets = assets.filter((a) => a.confidence >= minConf);
      }

      return assets;
    }),

  // Update asset
  updateAsset: protectedProcedure
    .input(
      z.object({
        assetId: z.number(),
        updates: z.object({
          name: z.string().optional(),
          category: z.string().optional(),
          type: z.string().optional(),
          location: z.string().optional(),
          quantity: z.number().optional(),
          specifications: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership through job
      const asset = await db.getAssetsByJobId(0); // This needs proper implementation
      await db.updateAsset(input.assetId, input.updates);
      return { success: true };
    }),

  // Delete asset
  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteAsset(input.assetId);
      return { success: true };
    }),

  // Create demo job with sample data
  createDemoJob: protectedProcedure
    .input(
      z.object({
        projectName: z.string().default("Goonumbla Solar Farm (Demo)"),
      })
    )
    .mutation(async ({ input, ctx }) => {      
      // Create completed demo job
      const stats = getDemoJobStats();
      const result = await db.createExtractionJob({
        userId: ctx.user.id,
        projectName: input.projectName,
        rclonePath: "demo://goonumbla",
        status: "completed",
        totalDocuments: stats.totalDocuments,
        reviewedDocuments: stats.reviewedDocuments,
        extractedDocuments: stats.extractedDocuments,
        totalAssets: stats.totalAssets,
        startedAt: new Date(Date.now() - 7200000), // 2 hours ago
        completedAt: new Date(),
      });

      const jobId = Number(result[0].insertId);

      // Generate and insert demo assets
      const demoAssets = generateDemoAssets(jobId);
      await db.insertAssets(demoAssets);

      return { jobId, assetsCreated: demoAssets.length };
    }),

  // Export to ACC Excel
  exportToExcel: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await db.getExtractionJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Get all assets for this job
      const assets = await db.getAssetsByJobId(input.jobId);

      if (assets.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No assets found for this job" });
      }

      // Generate Excel file
      const { filePath, fileName } = await generateACCExcel(assets, job.projectName);

      // Read file as base64
      const fileBuffer = await fs.readFile(filePath);
      const base64 = fileBuffer.toString("base64");

      // Clean up old exports
      cleanupOldExports().catch(console.error);

      return {
        fileName,
        data: base64,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      };
    }),

  // Get asset statistics
  getStatistics: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const job = await db.getExtractionJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const assets = await db.getAssetsByJobId(input.jobId);

      // Calculate statistics
      const byCategory = assets.reduce((acc, asset) => {
        acc[asset.category] = (acc[asset.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byConfidence = {
        high: assets.filter((a) => a.confidence >= 90).length,
        medium: assets.filter((a) => a.confidence >= 70 && a.confidence < 90).length,
        low: assets.filter((a) => a.confidence < 70).length,
      };

      return {
        total: assets.length,
        byCategory,
        byConfidence,
        avgConfidence: assets.reduce((sum, a) => sum + a.confidence, 0) / assets.length || 0,
      };
    }),
});
