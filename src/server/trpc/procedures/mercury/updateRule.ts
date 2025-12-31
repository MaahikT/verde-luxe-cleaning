import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateRule = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      ruleId: z.number(),
      name: z.string().min(1).optional(),
      conditionType: z
        .enum([
          "VENDOR_CONTAINS",
          "DESCRIPTION_CONTAINS",
          "AMOUNT_EQUALS",
          "AMOUNT_GREATER_THAN",
          "AMOUNT_LESS_THAN",
          "COUNTERPARTY_EQUALS",
        ])
        .optional(),
      conditionValue: z.string().min(1).optional(),
      categoryId: z.number().optional(),
      priority: z.number().optional(),
      isActive: z.boolean().optional(),
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
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.conditionType !== undefined)
        updateData.conditionType = input.conditionType;
      if (input.conditionValue !== undefined)
        updateData.conditionValue = input.conditionValue;
      if (input.categoryId !== undefined)
        updateData.categoryId = input.categoryId;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const rule = await db.categorizationRule.update({
        where: { id: input.ruleId },
        data: updateData,
        include: {
          category: true,
        },
      });

      return {
        rule,
      };
    } catch (error) {
      console.error("Error updating rule:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update rule",
      });
    }
  });
