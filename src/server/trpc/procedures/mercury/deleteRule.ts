import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deleteRule = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      ruleId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    // Verify authentication
    try {
      const decoded = jwt.verify(input.authToken, env.JWT_SECRET) as {
        userId: number;
      };
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
      });
      if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Admin access required",
        });
      }
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid authentication token",
      });
    }

    try {
      await db.categorizationRule.delete({
        where: { id: input.ruleId },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error deleting rule:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete rule",
      });
    }
  });
