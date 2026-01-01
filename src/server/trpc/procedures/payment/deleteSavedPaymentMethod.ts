import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export const deleteSavedPaymentMethod = baseProcedure
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

      // Detach the payment method from Stripe
      try {
        await stripe.paymentMethods.detach(
          savedPaymentMethod.stripePaymentMethodId
        );
      } catch (stripeError) {
        // If the payment method is already detached or doesn't exist in Stripe,
        // we still want to remove it from our database
        console.error("Error detaching payment method from Stripe:", stripeError);
      }

      // Delete from database
      await db.savedPaymentMethod.delete({
        where: { id: input.paymentMethodId },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete payment method",
      });
    }
  });
