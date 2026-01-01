import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import * as fs from "fs";
import * as path from "path";
import { hasPermission } from "~/server/trpc/utils/permission-utils";
import { createOpenPhoneContact } from "~/server/services/openphone";
import { generateFutureBookings } from "~/server/utils/recurrence";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

// Helper function to sanitize phone numbers (remove all non-numeric characters)
function sanitizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned || undefined;
}

export const createBookingAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      // Either provide clientId for existing client, or clientEmail for new client
      clientId: z.number().optional(),
      clientEmail: z.string().email().optional(),
      clientFirstName: z.string().optional(),
      clientLastName: z.string().optional(),
      clientPhone: z.string().optional(),
      cleanerId: z.number().nullable().optional(),
      serviceType: z.string().min(1, "Service type is required"),
      scheduledDate: z.string().datetime(),
      scheduledTime: z.string().min(1, "Time is required"),
      durationHours: z.number().positive().optional(),
      address: z.string().min(1, "Address is required"),
      specialInstructions: z.string().optional(),
      finalPrice: z.number().positive().optional(),
      status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("PENDING"),
      serviceFrequency: z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
      houseSquareFootage: z.number().int().positive().optional(),
      basementSquareFootage: z.number().int().positive().optional(),
      numberOfBedrooms: z.number().int().positive().optional(),
      numberOfBathrooms: z.number().int().positive().optional(),
      numberOfCleanersRequested: z.number().int().positive().optional(),
      cleanerPaymentAmount: z.number().positive().optional(),
      paymentMethod: z.enum(["CREDIT_CARD", "CASH"]).optional(),
      paymentDetails: z.string().optional(),
      savedPaymentMethodId: z.number().optional(), // ID of saved payment method to use
      selectedExtras: z.array(z.number()).optional(),
      overrideConflict: z.boolean().optional(), // Allow admin to override cleaner conflicts
    })
    .refine((data) => data.clientId || data.clientEmail, {
      message: "Either clientId or clientEmail must be provided",
    })
  )
  .mutation(async ({ input }) => {
    try {
      const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
      fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [AdminBookingStart] Mutation started. ClientId: ${input.clientId}\n`);
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

      // Check if user has the required permission
      if (!hasPermission(user, "manage_bookings")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage bookings",
        });
      }

      // Handle client - either use existing or create new
      let finalClientId: number;
      let generatedPassword: string | undefined;

      if (input.clientId) {
        // Use existing client
        finalClientId = input.clientId;

        // Verify client exists
        const client = await db.user.findUnique({
          where: { id: input.clientId },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
      } else if (input.clientEmail) {
        // Check if user with this email already exists
        const existingUser = await db.user.findUnique({
          where: { email: input.clientEmail },
        });

        if (existingUser) {
          // Use existing user
          finalClientId = existingUser.id;
        } else {
          // Create new client with generated password
          // Generate random password: 12 characters with uppercase, lowercase, and numbers
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
          generatedPassword = Array.from({ length: 12 }, () =>
            chars.charAt(Math.floor(Math.random() * chars.length))
          ).join('');

          // Hash the password
          const hashedPassword = await bcryptjs.hash(generatedPassword, 10);

          // Create new user
          const newClient = await db.user.create({
            data: {
              email: input.clientEmail,
              password: hashedPassword,
              role: "CLIENT",
              firstName: input.clientFirstName,
              lastName: input.clientLastName,
              phone: sanitizePhone(input.clientPhone),
              temporaryPassword: generatedPassword, // Store plaintext for admin viewing
              hasResetPassword: false,
            },
          });

          finalClientId = newClient.id;
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either clientId or clientEmail must be provided",
        });
      }

      // Verify cleaner exists if provided
      if (input.cleanerId) {
        const cleaner = await db.user.findUnique({
          where: { id: input.cleanerId },
        });

        if (!cleaner || cleaner.role !== "CLEANER") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cleaner not found",
          });
        }
      }

      // Create the booking
      const booking = await db.booking.create({
        data: {
          clientId: finalClientId,
          cleanerId: input.cleanerId || null,
          serviceType: input.serviceType,
          scheduledDate: new Date(input.scheduledDate),
          scheduledTime: input.scheduledTime,
          durationHours: input.durationHours,
          address: input.address,
          specialInstructions: input.specialInstructions,
          finalPrice: input.finalPrice,
          status: input.status,
          serviceFrequency: input.serviceFrequency,
          houseSquareFootage: input.houseSquareFootage,
          basementSquareFootage: input.basementSquareFootage,
          numberOfBedrooms: input.numberOfBedrooms,
          numberOfBathrooms: input.numberOfBathrooms,
          numberOfCleanersRequested: input.numberOfCleanersRequested,
          cleanerPaymentAmount: input.cleanerPaymentAmount,
          paymentMethod: input.paymentMethod,
          paymentDetails: input.paymentDetails,
          selectedExtras: input.selectedExtras ? input.selectedExtras : undefined, // Use undefined for optional Json field
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          cleaner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      // Auto-attach checklist if a matching template exists
      const matchingTemplate = await db.checklistTemplate.findFirst({
        where: {
          serviceType: input.serviceType,
        },
        include: {
          items: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      if (matchingTemplate && matchingTemplate.items.length > 0) {
        await db.bookingChecklist.create({
          data: {
            bookingId: booking.id,
            templateId: matchingTemplate.id,
            items: {
              create: matchingTemplate.items.map((item) => ({
                description: item.description,
                order: item.order,
                isCompleted: false,
              })),
            },
          },
        });
      }

      // Check configuration for payment hold delay
      const configuration = await db.configuration.findFirst();
      const paymentHoldDelayHours = configuration?.paymentHoldDelayHours;

      // Determine if we should place a hold now or defer it
      let shouldPlaceHoldNow = true;
      if (paymentHoldDelayHours !== null && paymentHoldDelayHours !== undefined) {
        // Calculate hours until booking
        const scheduledDateTime = new Date(input.scheduledDate);
        const now = new Date();
        const hoursUntilBooking = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Only place hold if we're within the delay window
        shouldPlaceHoldNow = hoursUntilBooking <= paymentHoldDelayHours;
      }

      // If using a saved payment method, create a payment hold (if within delay window)
      if (input.savedPaymentMethodId && input.finalPrice && input.finalPrice > 0 && shouldPlaceHoldNow) {
        // Fetch the saved payment method
        const savedPaymentMethod = await db.savedPaymentMethod.findUnique({
          where: { id: input.savedPaymentMethodId },
        });

        if (!savedPaymentMethod) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Saved payment method not found",
          });
        }

        // Verify it belongs to the client
        if (savedPaymentMethod.userId !== finalClientId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment method does not belong to this client",
          });
        }

        // Get the client's Stripe customer ID
        const clientWithStripe = await db.user.findUnique({
          where: { id: finalClientId },
          select: { stripeCustomerId: true },
        });

        if (!clientWithStripe?.stripeCustomerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Client does not have a Stripe customer ID",
          });
        }

        try {
          // Create payment intent with the saved payment method
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(input.finalPrice * 100), // Convert to cents
            currency: "usd",
            customer: clientWithStripe.stripeCustomerId,
            payment_method: savedPaymentMethod.stripePaymentMethodId,
            capture_method: "manual",
            confirm: true,
            off_session: true,
            description: `Booking #${booking.id}: ${input.serviceType}`,
            metadata: {
              bookingId: booking.id.toString(),
              clientId: finalClientId.toString(),
            },
          });

          // Create payment record
          await db.payment.create({
            data: {
              bookingId: booking.id,
              cleanerId: booking.cleanerId,
              amount: input.finalPrice,
              description: `Payment hold for booking #${booking.id}`,
              stripePaymentIntentId: paymentIntent.id,
              stripePaymentMethodId: savedPaymentMethod.stripePaymentMethodId,
              status: paymentIntent.status,
              isCaptured: false,
            },
          });

          // Update booking with payment details
          await db.booking.update({
            where: { id: booking.id },
            data: {
              paymentMethod: "CREDIT_CARD",
              paymentDetails: `Saved card ending in ${savedPaymentMethod.last4} - Hold: ${paymentIntent.id}`,
            },
          });
        } catch (error) {
          console.error("Failed to create payment hold with saved card:", error);
          // Don't throw - booking is already created
          // Admin can retry payment later
        }
      } else if (input.savedPaymentMethodId && input.finalPrice && input.finalPrice > 0 && !shouldPlaceHoldNow) {
        // Payment hold is deferred - update booking to indicate this
        await db.booking.update({
          where: { id: booking.id },
          data: {
            paymentMethod: "CREDIT_CARD",
            paymentDetails: `Payment hold deferred - will be placed ${paymentHoldDelayHours} hours before booking`,
          },
        });
      }

      // If payment was processed via Stripe (and not already handled by saved payment method), create a payment record
      if (input.paymentMethod === "CREDIT_CARD" && input.paymentDetails && !input.savedPaymentMethodId) {
        // Extract payment intent ID from payment details
        const paymentIntentIdMatch = input.paymentDetails.match(/Stripe Payment Intent: (pi_[a-zA-Z0-9]+)/);
        if (paymentIntentIdMatch && paymentIntentIdMatch[1]) {
          const paymentIntentId = paymentIntentIdMatch[1];

          try {
            // Retrieve payment intent from Stripe to get details
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            // Get payment method ID
            const paymentMethodId =
              typeof paymentIntent.payment_method === "string"
                ? paymentIntent.payment_method
                : paymentIntent.payment_method?.id;

            // Create payment record
            await db.payment.create({
              data: {
                bookingId: booking.id,
                cleanerId: booking.cleanerId,
                amount: paymentIntent.amount / 100, // Convert cents to dollars
                paidAt: new Date(),
                description: `Stripe payment for booking #${booking.id}`,
                stripePaymentIntentId: paymentIntent.id,
                stripePaymentMethodId: paymentMethodId || null,
                status: paymentIntent.status,
                isCaptured: paymentIntent.capture_method === "automatic" || paymentIntent.status === "succeeded",
              },
            });
          } catch (error) {
            console.error("Failed to create payment record:", error);
            // Don't throw error here - booking is already created
          }
        }
      }

      // OpenPhone Integration
      try {
        const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
        const logDebug = (msg: string) => {
             const ts = new Date().toISOString();
             try { fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`); } catch(e) {}
             console.log(msg);
        };

        if (booking && finalClientId) {
          logDebug(`[AdminBooking] Checking OpenPhone sync for Client ID: ${finalClientId}`);
          // Get the client details potentially updated or created
          const clientForOpenPhone = await db.user.findUnique({
            where: { id: finalClientId }
          });

          if (clientForOpenPhone) {
              logDebug(`[AdminBooking] Client found: ${clientForOpenPhone.email}, Phone: ${clientForOpenPhone.phone}, existingID: ${clientForOpenPhone.openPhoneContactId}`);

              if (clientForOpenPhone.phone && !clientForOpenPhone.openPhoneContactId) {
                 logDebug(`[AdminBooking] Initiating OpenPhone Contact Creation...`);

                 // Create contact in OpenPhone
                 const openPhoneId = await createOpenPhoneContact(
                   clientForOpenPhone.firstName || "",
                   clientForOpenPhone.lastName || "",
                   clientForOpenPhone.phone,
                   clientForOpenPhone.email,
                   undefined,
                   "Client",
                   clientForOpenPhone.id.toString()
                 );

                 logDebug(`[AdminBooking] OpenPhone Service returned ID: ${openPhoneId}`);

                 if (openPhoneId) {
                   // Update user with OpenPhone ID
                   await db.user.update({
                     where: { id: finalClientId },
                     data: { openPhoneContactId: openPhoneId }
                   });
                   logDebug(`[AdminBooking] User updated with OpenPhone ID.`);
                 }
              } else {
                  logDebug(`[AdminBooking] Skipping OpenPhone sync. Phone missing or ID already exists.`);
              }
          }
        }
      } catch (err) {
        const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
        try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [AdminBooking] Failed to sync with OpenPhone: ${err}\n`); } catch(e) {}
        console.error("[AdminBooking] Failed to sync with OpenPhone:", err);
        // Do not block booking creation
      }

      // Generate recurring bookings if frequency is set
      if (input.serviceFrequency && ["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(input.serviceFrequency)) {
        // Await generation to ensure data consistency
        await generateFutureBookings(booking, input.serviceFrequency);
      }

      return {
        booking,
        generatedPassword, // Return to admin if a new account was created
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
