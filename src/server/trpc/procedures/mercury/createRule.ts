import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createRule = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string().min(1),
      conditionType: z.enum([
        "VENDOR_CONTAINS",
        "DESCRIPTION_CONTAINS",
        "AMOUNT_EQUALS",
        "AMOUNT_GREATER_THAN",
        "AMOUNT_LESS_THAN",
        "COUNTERPARTY_EQUALS",
      ]),
      conditionValue: z.string().min(1),
      categoryId: z.number(),
      priority: z.number().default(0),
      isActive: z.boolean().default(true),
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
      const rule = await db.categorizationRule.create({
        data: {
          name: input.name,
          conditionType: input.conditionType,
          conditionValue: input.conditionValue,
          categoryId: input.categoryId,
          priority: input.priority,
          isActive: input.isActive,
        },
        include: {
          category: true,
        },
      });

      return {
        rule,
      };
    } catch (error) {
      console.error("Error creating rule:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to create rule",
      });
    }
  });
