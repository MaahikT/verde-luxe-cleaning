import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const setDefaultPaymentMethod = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      paymentMethodId: z.number(), // Our database ID
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

      // Fetch the saved payment method
      const savedPaymentMethod = await db.savedPaymentMethod.findUnique({
        where: { id: input.paymentMethodId },
      });

      if (!savedPaymentMethod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found",
        });
      }

      // Check authorization - must be admin/owner or the client themselves
      if (
        user.role !== "ADMIN" &&
        user.role !== "OWNER" &&
        user.id !== savedPaymentMethod.userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied.",
        });
      }

      // Atomically update: unset all other cards as default, then set this one as default
      await db.$transaction([
        // First, unset all other cards for this user
        db.savedPaymentMethod.updateMany({
          where: {
            userId: savedPaymentMethod.userId,
            id: { not: input.paymentMethodId },
          },
          data: {
            isDefault: false,
          },
        }),
        // Then, set the selected card as default
        db.savedPaymentMethod.update({
          where: { id: input.paymentMethodId },
          data: {
            isDefault: true,
          },
        }),
      ]);

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to set default payment method",
      });
    }
  });
