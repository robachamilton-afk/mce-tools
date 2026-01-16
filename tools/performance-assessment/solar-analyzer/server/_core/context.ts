import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // In development mode, create a mock user for testing
    if (process.env.NODE_ENV === "development") {
      console.log("[Auth] Development mode: Creating mock user");
      // Create or get mock user from database
      const mockOpenId = "dev-user-001";
      let mockUser = await db.getUserByOpenId(mockOpenId);
      
      if (!mockUser) {
        await db.upsertUser({
          openId: mockOpenId,
          name: "Development User",
          email: "dev@localhost",
          loginMethod: "development",
          lastSignedIn: new Date(),
        });
        mockUser = await db.getUserByOpenId(mockOpenId);
      }
      user = mockUser || null;
    } else {
      // Authentication is optional for public procedures in production.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
