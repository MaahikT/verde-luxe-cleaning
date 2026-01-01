import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

// Helper function to sanitize phone numbers (remove all non-numeric characters)
function sanitizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned || undefined;
}

export const createStripeCustomer = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      // For admin creating customer for a client
      clientId: z.number().optional(),
      clientEmail: z.string().email().optional(),
      clientFirstName: z.string().optional(),
      clientLastName: z.string().optional(),
      clientPhone: z.string().optional(),
      // For overriding customer details (optional)
      email: z.string().email().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Verify and decode JWT token
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Fetch authenticated user from database
      const authUser = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!authUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Determine which user we're creating a Stripe customer for
      let targetUserId: number;
      let targetUser: any;
      let generatedPassword: string | undefined;

      // Case 1: Admin creating for a specific client by ID
      if (input.clientId) {
        // Verify admin privileges
        if (authUser.role !== "ADMIN" && authUser.role !== "OWNER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. Admin privileges required to create customers for other users.",
          });
        }

        targetUser = await db.user.findUnique({
          where: { id: input.clientId },
        });

        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        targetUserId = input.clientId;
      }
      // Case 2: Admin creating for a new client by email
      else if (input.clientEmail) {
        // Verify admin privileges
        if (authUser.role !== "ADMIN" && authUser.role !== "OWNER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. Admin privileges required to create customers for other users.",
          });
        }

        // Check if user with this email already exists
        const existingUser = await db.user.findUnique({
          where: { email: input.clientEmail },
        });

        if (existingUser) {
          // Use existing user
          targetUser = existingUser;
          targetUserId = existingUser.id;
        } else {
          // Create new client with generated password
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
          generatedPassword = Array.from({ length: 12 }, () =>
            chars.charAt(Math.floor(Math.random() * chars.length))
          ).join('');

          const hashedPassword = await bcryptjs.hash(generatedPassword, 10);

          targetUser = await db.user.create({
            data: {
              email: input.clientEmail,
              password: hashedPassword,
              role: "CLIENT",
              firstName: input.clientFirstName,
              lastName: input.clientLastName,
              phone: sanitizePhone(input.clientPhone),
              temporaryPassword: generatedPassword,
              hasResetPassword: false,
            },
          });

          targetUserId = targetUser.id;
        }
      }
      // Case 3: User creating for themselves
      else {
        targetUser = authUser;
        targetUserId = authUser.id;
      }

      // If user already has a Stripe customer ID, return it
      if (targetUser.stripeCustomerId) {
        return {
          customerId: targetUser.stripeCustomerId,
          clientId: targetUserId,
          generatedPassword, // Will be undefined if user already existed
        };
      }

      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: input.email || targetUser.email,
        name: input.name || `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || undefined,
        phone: sanitizePhone(input.phone || targetUser.phone || undefined),
        metadata: {
          userId: targetUserId.toString(),
        },
      });

      // Update user with Stripe customer ID
      await db.user.update({
        where: { id: targetUserId },
        data: {
          stripeCustomerId: customer.id,
        },
      });

      return {
        customerId: customer.id,
        clientId: targetUserId,
        generatedPassword, // Will be undefined if user already existed
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Error in createStripeCustomer:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to create Stripe customer",
      });
    }
  });
