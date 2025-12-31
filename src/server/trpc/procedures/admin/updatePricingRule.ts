import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const updatePricingRule = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      ruleId: z.number(),
      name: z.string().min(1, "Name is required").optional(),
      ruleType: z.enum(["BASE_PRICE", "SQFT_RATE", "BEDROOM_RATE", "BATHROOM_RATE", "EXTRA_SERVICE", "TIME_ESTIMATE"]).optional(),
      serviceType: z.string().nullable().optional(),
      priceAmount: z.number().positive().nullable().optional(),
      ratePerUnit: z.number().positive().nullable().optional(),
      timeAmount: z.number().positive().nullable().optional(),
      timePerUnit: z.number().positive().nullable().optional(),
      extraName: z.string().nullable().optional(),
      extraDescription: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Verify and decode JWT token
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Fetch user from database
      const user = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if user is an admin or owner
      if (user.role !== "ADMIN" && user.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        });
      }

      // Check for manage_pricing permission
      if (user.role === "ADMIN" && !hasPermission(user, "manage_pricing")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update pricing rules",
        });
      }

      // Verify pricing rule exists
      const existingRule = await db.pricingRule.findUnique({
        where: { id: input.ruleId },
      });

      if (!existingRule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing rule not found",
        });
      }

      // Build update data
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.ruleType !== undefined) updateData.ruleType = input.ruleType;
      if (input.serviceType !== undefined) updateData.serviceType = input.serviceType;
      if (input.priceAmount !== undefined) updateData.priceAmount = input.priceAmount;
      if (input.ratePerUnit !== undefined) updateData.ratePerUnit = input.ratePerUnit;
      if (input.timeAmount !== undefined) updateData.timeAmount = input.timeAmount;
      if (input.timePerUnit !== undefined) updateData.timePerUnit = input.timePerUnit;
      if (input.extraName !== undefined) updateData.extraName = input.extraName;
      if (input.extraDescription !== undefined) updateData.extraDescription = input.extraDescription;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;

      // Update the pricing rule
      const pricingRule = await db.pricingRule.update({
        where: { id: input.ruleId },
        data: updateData,
      });

      return { pricingRule };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
