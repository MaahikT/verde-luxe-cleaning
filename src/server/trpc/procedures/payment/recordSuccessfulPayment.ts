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

export const recordSuccessfulPayment = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      paymentIntentId: z.string(),
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

      // Verify booking exists
      const booking = await db.booking.findUnique({
        where: { id: input.bookingId },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      // Verify user is authorized for this booking
      if (
        booking.clientId !== user.id &&
        user.role !== "ADMIN" &&
        user.role !== "OWNER"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to record payment for this booking",
        });
      }

      // Retrieve payment intent from Stripe to verify status
      const paymentIntent = await stripe.paymentIntents.retrieve(
        input.paymentIntentId
      );

      // Verify payment was successful
      if (
        paymentIntent.status !== "succeeded" &&
        paymentIntent.status !== "requires_capture"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment not successful. Status: ${paymentIntent.status}`,
        });
      }

      // Get payment method ID
      const paymentMethodId =
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : paymentIntent.payment_method?.id;

      // Create payment record
      const payment = await db.payment.create({
        data: {
          bookingId: input.bookingId,
          cleanerId: booking.cleanerId,
          amount: paymentIntent.amount / 100, // Convert cents to dollars
          paidAt: new Date(),
          description: `Stripe payment for booking #${input.bookingId}`,
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentMethodId: paymentMethodId || null,
          status: paymentIntent.status,
          isCaptured: paymentIntent.capture_method === "automatic" || paymentIntent.status === "succeeded",
        },
      });

      // Update booking with payment details
      await db.booking.update({
        where: { id: input.bookingId },
        data: {
          paymentMethod: "CREDIT_CARD",
          paymentDetails: `Stripe Payment Intent: ${paymentIntent.id}`,
          finalPrice: paymentIntent.amount / 100,
        },
      });

      return {
        success: true,
        payment,
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
        message: "Failed to record payment",
      });
    }
  });
