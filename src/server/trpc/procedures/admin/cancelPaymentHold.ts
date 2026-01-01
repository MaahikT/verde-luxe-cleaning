import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export const cancelPaymentHold = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      bookingId: z.number(),
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

      // Check for manage_bookings permission
      if (user.role === "ADMIN" && !hasPermission(user, "manage_bookings")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage payments",
        });
      }

      // Verify booking exists
      const booking = await db.booking.findUnique({
        where: { id: input.bookingId },
        include: {
          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      // Check if there's a payment with a Stripe payment intent
      const payment = booking.payments[0];

      if (!payment || !payment.stripePaymentIntentId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No payment hold found for this booking",
        });
      }

      // Check if the payment is in a state that can be canceled
      // Only cancel if it's not already captured or canceled
      if (payment.status === "succeeded" || payment.status === "canceled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel payment hold. Payment status: ${payment.status}`,
        });
      }

      // Cancel the payment intent in Stripe
      const canceledIntent = await stripe.paymentIntents.cancel(
        payment.stripePaymentIntentId
      );

      // Update the payment record in the database
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: canceledIntent.status,
        },
      });

      return {
        success: true,
        paymentIntentId: payment.stripePaymentIntentId,
        status: canceledIntent.status,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      if (error instanceof Stripe.errors.StripeError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stripe error: ${error.message}`,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel payment hold",
      });
    }
  });
