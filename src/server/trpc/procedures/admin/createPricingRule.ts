import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const createPricingRule = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string().min(1, "Name is required"),
      ruleType: z.enum(["BASE_PRICE", "SQFT_RATE", "BEDROOM_RATE", "BATHROOM_RATE", "EXTRA_SERVICE", "TIME_ESTIMATE"]),
      serviceType: z.string().nullable().optional(),
      priceAmount: z.number().positive().nullable().optional(),
      ratePerUnit: z.number().positive().nullable().optional(),
      timeAmount: z.number().positive().nullable().optional(),
      timePerUnit: z.number().positive().nullable().optional(),
      extraName: z.string().nullable().optional(),
      extraDescription: z.string().nullable().optional(),
      isActive: z.boolean().default(true),
      displayOrder: z.number().int().default(0),
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
          message: "You do not have permission to create pricing rules",
        });
      }

      // Create the pricing rule
      const pricingRule = await db.pricingRule.create({
        data: {
          name: input.name,
          ruleType: input.ruleType,
          serviceType: input.serviceType || null,
          priceAmount: input.priceAmount || null,
          ratePerUnit: input.ratePerUnit || null,
          timeAmount: input.timeAmount || null,
          timePerUnit: input.timePerUnit || null,
          extraName: input.extraName || null,
          extraDescription: input.extraDescription || null,
          isActive: input.isActive,
          displayOrder: input.displayOrder,
        },
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
