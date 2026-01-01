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

export const capturePaymentHold = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      paymentId: z.number(),
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

      // Fetch the payment record
      const payment = await db.payment.findUnique({
        where: { id: input.paymentId },
        include: {
          booking: {
            include: {
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // Verify the payment has a Stripe payment intent
      if (!payment.stripePaymentIntentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe payment intent found for this payment",
        });
      }

      // Check if the payment is already captured
      if (payment.isCaptured) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has already been captured",
        });
      }

      // Check if the payment is in a state that can be captured
      if (payment.status !== "requires_capture") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot capture payment. Current status: ${payment.status}`,
        });
      }

      // Capture the payment intent in Stripe
      const capturedIntent = await stripe.paymentIntents.capture(
        payment.stripePaymentIntentId
      );

      // Update the payment record in the database
      const updatedPayment = await db.payment.update({
        where: { id: payment.id },
        data: {
          status: capturedIntent.status,
          isCaptured: true,
          paidAt: new Date(),
        },
      });

      return {
        success: true,
        paymentId: updatedPayment.id,
        paymentIntentId: payment.stripePaymentIntentId,
        status: capturedIntent.status,
        amount: updatedPayment.amount,
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
        message: "Failed to capture payment",
      });
    }
  });
