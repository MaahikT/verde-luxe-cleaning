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

export const savePaymentMethod = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      clientId: z.number(),
      paymentMethodId: z.string(), // Stripe PaymentMethod ID from the frontend
      setAsDefault: z.boolean().default(false),
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

      // Check authorization - must be admin/owner or the client themselves
      if (
        user.role !== "ADMIN" &&
        user.role !== "OWNER" &&
        user.id !== input.clientId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. You can only save payment methods for yourself.",
        });
      }

      // Fetch the client
      const client = await db.user.findUnique({
        where: { id: input.clientId },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Ensure client has a Stripe customer ID
      let stripeCustomerId = client.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: client.email,
          name: `${client.firstName || ""} ${client.lastName || ""}`.trim() || undefined,
          phone: client.phone || undefined,
          metadata: {
            userId: client.id.toString(),
          },
        });
        stripeCustomerId = customer.id;

        // Update user with Stripe customer ID
        await db.user.update({
          where: { id: client.id },
          data: { stripeCustomerId: customer.id },
        });
      }

      // Attach the payment method to the customer (if not already attached)
      try {
        await stripe.paymentMethods.attach(input.paymentMethodId, {
          customer: stripeCustomerId,
        });
      } catch (attachError) {
        // If the payment method is already attached, that's fine - continue
        if (
          attachError instanceof Stripe.errors.StripeError &&
          attachError.code === "resource_already_exists"
        ) {
          // Payment method is already attached, which is fine
          console.log(`Payment method ${input.paymentMethodId} is already attached to customer ${stripeCustomerId}`);
        } else {
          // Re-throw other errors
          throw attachError;
        }
      }

      // Retrieve payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(
        input.paymentMethodId
      );

      if (!paymentMethod.card) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment method is not a card",
        });
      }

      // Check if this payment method is already saved for this user
      const existingSavedMethod = await db.savedPaymentMethod.findUnique({
        where: {
          stripePaymentMethodId: paymentMethod.id,
        },
      });

      let savedPaymentMethod;

      if (existingSavedMethod) {
        // Payment method already exists - update it
        console.log(`Payment method ${input.paymentMethodId} already exists for user ${input.clientId}, updating...`);

        // If setting as default, unset other defaults first
        if (input.setAsDefault) {
          await db.savedPaymentMethod.updateMany({
            where: {
              userId: input.clientId,
              isDefault: true,
              id: { not: existingSavedMethod.id }, // Don't update the current one yet
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Update the existing record
        savedPaymentMethod = await db.savedPaymentMethod.update({
          where: {
            id: existingSavedMethod.id,
          },
          data: {
            last4: paymentMethod.card.last4,
            brand: paymentMethod.card.brand,
            expiryMonth: paymentMethod.card.exp_month,
            expiryYear: paymentMethod.card.exp_year,
            isDefault: input.setAsDefault,
            updatedAt: new Date(),
          },
        });
      } else {
        // Payment method doesn't exist - create it
        console.log(`Creating new saved payment method ${input.paymentMethodId} for user ${input.clientId}`);

        // If setting as default, unset other defaults first
        if (input.setAsDefault) {
          await db.savedPaymentMethod.updateMany({
            where: {
              userId: input.clientId,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Create new record
        savedPaymentMethod = await db.savedPaymentMethod.create({
          data: {
            userId: input.clientId,
            stripePaymentMethodId: paymentMethod.id,
            last4: paymentMethod.card.last4,
            brand: paymentMethod.card.brand,
            expiryMonth: paymentMethod.card.exp_month,
            expiryYear: paymentMethod.card.exp_year,
            isDefault: input.setAsDefault,
          },
        });
      }

      return {
        success: true,
        savedPaymentMethod: {
          id: savedPaymentMethod.id,
          last4: savedPaymentMethod.last4,
          brand: savedPaymentMethod.brand,
          expiryMonth: savedPaymentMethod.expiryMonth,
          expiryYear: savedPaymentMethod.expiryYear,
          isDefault: savedPaymentMethod.isDefault,
        },
      };
    } catch (error) {
      console.error("Error in savePaymentMethod:", error);

      if (error instanceof TRPCError) {
        throw error;
      }
      if (error instanceof Stripe.errors.StripeError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stripe error: ${error.message}`,
        });
      }

      // Log the full error for debugging
      console.error("Unexpected error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error
          ? `Failed to save payment method: ${error.message}`
          : "Failed to save payment method",
      });
    }
  });
