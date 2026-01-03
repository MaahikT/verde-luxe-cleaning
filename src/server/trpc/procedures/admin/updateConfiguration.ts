import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";
import { processPaymentHoldsLogic } from "~/server/utils/paymentHolds";

export const updateConfiguration = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      paymentHoldDelayHours: z.number().int().positive().nullable(),
      cancellationWindowHours: z.number().int().min(0).optional(),
      cancellationFeeAmount: z.number().min(0).optional(),
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
          message: "You do not have permission to update configuration",
        });
      }

      // Find existing configuration
      const existingConfig = await db.configuration.findFirst();

      let configuration;
      if (existingConfig) {
        // Update existing configuration
        configuration = await db.configuration.update({
          where: { id: existingConfig.id },
          data: {
            paymentHoldDelayHours: input.paymentHoldDelayHours,
            cancellationWindowHours: input.cancellationWindowHours,
            cancellationFeeAmount: input.cancellationFeeAmount,
          },
        });
      } else {
        // Create new configuration
        configuration = await db.configuration.create({
          data: {
            paymentHoldDelayHours: input.paymentHoldDelayHours,
            cancellationWindowHours: input.cancellationWindowHours ?? 48,
            cancellationFeeAmount: input.cancellationFeeAmount ?? 50.0,
          },
        });
      }

      // If payment hold delay changed, re-evaluate existing bookings
      if (input.paymentHoldDelayHours !== undefined && input.paymentHoldDelayHours !== existingConfig?.paymentHoldDelayHours) {
           console.log("[UpdateConfig] Payment hold delay changed. Re-evaluating existing bookings...");
           // Fire and forget - don't block response
           processPaymentHoldsLogic(input.paymentHoldDelayHours ?? undefined).catch(err => console.error("[UpdateConfig] Failed to process hold re-evaluation:", err));
      }

      return {
        configuration,
      };
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
