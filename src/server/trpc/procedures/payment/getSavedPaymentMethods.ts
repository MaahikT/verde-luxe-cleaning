import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getSavedPaymentMethods = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      clientId: z.number(),
    })
  )
  .query(async ({ input }) => {
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

      // Check authorization - must be admin/owner or the client themselves
      if (
        user.role !== "ADMIN" &&
        user.role !== "OWNER" &&
        user.id !== input.clientId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied.",
        });
      }

      // Fetch saved payment methods
      const savedPaymentMethods = await db.savedPaymentMethod.findMany({
        where: {
          userId: input.clientId,
        },
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "desc" },
        ],
      });

      return {
        paymentMethods: savedPaymentMethods.map((pm) => ({
          id: pm.id,
          stripePaymentMethodId: pm.stripePaymentMethodId,
          last4: pm.last4,
          brand: pm.brand,
          expiryMonth: pm.expiryMonth,
          expiryYear: pm.expiryYear,
          isDefault: pm.isDefault,
          createdAt: pm.createdAt.toISOString(),
        })),
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
