import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export const createPaymentIntent = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      amount: z.number().positive().int(), // Amount in cents
      currency: z.string().default("usd"),
      bookingId: z.number().optional(),
      customerId: z.string().optional(), // Stripe customer ID
      paymentMethodId: z.string().optional(), // Existing Stripe PaymentMethod ID to use
      captureMethod: z.enum(["automatic", "manual"]).default("manual"),
      description: z.string().optional(),
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

      // Verify booking exists if provided
      if (input.bookingId) {
        const booking = await db.booking.findUnique({
          where: { id: input.bookingId },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
          });
        }

        // Verify user is authorized for this booking (client, cleaner, or admin)
        if (
          booking.clientId !== user.id &&
          user.role !== "ADMIN" &&
          user.role !== "OWNER"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to create payment for this booking",
          });
        }
      }

      // Create payment intent
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: input.amount,
        currency: input.currency,
        customer: input.customerId,
        capture_method: input.captureMethod,
        description: input.description || `Payment for booking #${input.bookingId || "N/A"}`,
        metadata: {
          userId: user.id.toString(),
          bookingId: input.bookingId?.toString() || "",
        },
      };

      // If a payment method is provided, use it directly
      if (input.paymentMethodId) {
        paymentIntentData.payment_method = input.paymentMethodId;
        paymentIntentData.confirm = true; // Automatically confirm when using saved payment method
        paymentIntentData.off_session = true; // Allow off-session usage
      } else {
        // Otherwise, let Stripe handle payment method collection
        paymentIntentData.automatic_payment_methods = {
          enabled: true,
        };
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
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
        message: "Failed to create payment intent",
      });
    }
  });
