import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export const retryChargeOrHold = baseProcedure
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

      // Fetch the failed payment record
      const failedPayment = await db.payment.findUnique({
        where: { id: input.paymentId },
        include: {
          booking: {
            include: {
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  stripeCustomerId: true,
                },
              },
            },
          },
        },
      });

      if (!failedPayment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (!failedPayment.booking) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has no associated booking",
        });
      }

      // Check if the payment is in a failed state
      const failedStatuses = ["canceled", "failed", "requires_payment_method"];
      if (!failedStatuses.includes(failedPayment.status || "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot retry payment. Current status: ${failedPayment.status}`,
        });
      }

      // Get the client's Stripe customer ID, or create one if it doesn't exist
      let stripeCustomerId = failedPayment.booking.client.stripeCustomerId;

      if (!stripeCustomerId) {
        // Client doesn't have a Stripe customer ID yet - create one automatically
        try {
          const customer = await stripe.customers.create({
            email: failedPayment.booking.client.email,
            name: `${failedPayment.booking.client.firstName || ""} ${failedPayment.booking.client.lastName || ""}`.trim() || undefined,
            phone: failedPayment.booking.client.phone || undefined,
            metadata: {
              userId: failedPayment.booking.client.id.toString(),
            },
          });

          // Update user with the new Stripe customer ID
          await db.user.update({
            where: { id: failedPayment.booking.client.id },
            data: {
              stripeCustomerId: customer.id,
            },
          });

          stripeCustomerId = customer.id;
        } catch (customerCreationError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Stripe customer for payment retry",
          });
        }
      }

      // Retrieve the customer's default payment method
      const customer = await stripe.customers.retrieve(stripeCustomerId);

      if (customer.deleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer has been deleted in Stripe",
        });
      }

      const defaultPaymentMethodId =
        typeof customer.invoice_settings.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method?.id;

      if (!defaultPaymentMethodId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer has no default payment method on file",
        });
      }

      // Create a new payment intent with the original amount
      const amountInCents = Math.round(failedPayment.amount * 100);

      const newPaymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: defaultPaymentMethodId,
        confirm: true, // Immediately attempt to confirm the payment
        capture_method: "automatic", // Capture immediately on success
        description: `Retry payment for booking #${failedPayment.booking.id}`,
        metadata: {
          bookingId: failedPayment.booking.id.toString(),
          clientId: failedPayment.booking.client.id.toString(),
          retryOfPaymentId: failedPayment.id.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never", // Don't allow redirects for automatic retry
        },
      });

      // Create a new payment record in the database
      const newPayment = await db.payment.create({
        data: {
          bookingId: failedPayment.booking.id,
          cleanerId: failedPayment.booking.cleanerId,
          amount: failedPayment.amount,
          paidAt: newPaymentIntent.status === "succeeded" ? new Date() : null,
          description: `Retry of failed payment #${failedPayment.id}`,
          stripePaymentIntentId: newPaymentIntent.id,
          stripePaymentMethodId: defaultPaymentMethodId,
          status: newPaymentIntent.status,
          isCaptured: newPaymentIntent.status === "succeeded",
        },
      });

      return {
        success: newPaymentIntent.status === "succeeded",
        paymentId: newPayment.id,
        paymentIntentId: newPaymentIntent.id,
        status: newPaymentIntent.status,
        amount: newPayment.amount,
        message: newPaymentIntent.status === "succeeded"
          ? "Payment retry successful"
          : `Payment retry status: ${newPaymentIntent.status}`,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      if (error instanceof Stripe.errors.StripeError) {
        // Create a failed payment record for tracking
        try {
          const failedPayment = await db.payment.findUnique({
            where: { id: input.paymentId },
          });

          if (failedPayment) {
            await db.payment.create({
              data: {
                bookingId: failedPayment.bookingId,
                cleanerId: failedPayment.cleanerId,
                amount: failedPayment.amount,
                paidAt: null,
                description: `Failed retry of payment #${failedPayment.id}: ${error.message}`,
                stripePaymentIntentId: null,
                stripePaymentMethodId: null,
                status: "failed",
                isCaptured: false,
              },
            });
          }
        } catch (dbError) {
          console.error("Failed to create failed payment record:", dbError);
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stripe error: ${error.message}`,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retry payment",
      });
    }
  });
