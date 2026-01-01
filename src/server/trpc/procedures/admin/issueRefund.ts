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

export const issueRefund = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      paymentId: z.number(),
      amount: z.number().optional(), // Amount in cents for partial refund, omit for full refund
      reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
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
          message: "You do not have permission to issue refunds",
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

      // Check if the payment is captured and succeeded
      if (!payment.isCaptured || payment.status !== "succeeded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot refund payment. Payment must be captured and succeeded. Current status: ${payment.status}`,
        });
      }

      // Validate refund amount if provided
      if (input.amount !== undefined) {
        const amountInCents = Math.round(payment.amount * 100);
        if (input.amount <= 0 || input.amount > amountInCents) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid refund amount. Must be between 1 and ${amountInCents} cents`,
          });
        }
      }

      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: input.amount, // If undefined, Stripe refunds the full amount
        reason: input.reason,
      });

      // Note: We're not updating the payment record status here because refunds don't change
      // the payment intent status. In a production system, you might want to:
      // 1. Create a separate Refund table to track refunds
      // 2. Add a refundedAmount field to the Payment model
      // 3. Listen to Stripe webhooks for refund status updates

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100, // Convert cents to dollars
        status: refund.status,
        paymentIntentId: payment.stripePaymentIntentId,
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
        message: "Failed to issue refund",
      });
    }
  });
