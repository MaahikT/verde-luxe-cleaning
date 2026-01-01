import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";
import { generateFutureBookings } from "~/server/utils/recurrence";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export const updateBookingAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      bookingId: z.number(),
      cleanerId: z.number().nullable().optional(),
      serviceType: z.string().optional(),
      scheduledDate: z.string().datetime().optional(),
      scheduledTime: z.string().optional(),
      durationHours: z.number().positive().optional(),
      address: z.string().optional(),
      specialInstructions: z.string().nullable().optional(),
      finalPrice: z.number().positive().nullable().optional(),
      status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
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
      replacePaymentMethod: z.boolean().optional(), // Whether to replace existing payment method
      selectedExtras: z.array(z.number()).optional(),
      overrideConflict: z.boolean().optional(), // Allow admin to override cleaner conflicts
      updateMode: z.enum(['SINGLE', 'FUTURE']).optional().default('SINGLE'),
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

      // Check if user has the required permission
      if (!hasPermission(user, "manage_bookings")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage bookings",
        });
      }

      // Verify booking exists
      const existingBooking = await db.booking.findUnique({
        where: { id: input.bookingId },
      });

      if (!existingBooking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      // Verify cleaner exists if provided
      if (input.cleanerId !== undefined && input.cleanerId !== null) {
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

      // Build update data
      const updateData: any = {};

      if (input.cleanerId !== undefined) {
        updateData.cleanerId = input.cleanerId;
      }
      if (input.serviceType !== undefined) {
        updateData.serviceType = input.serviceType;
      }
      if (input.scheduledDate !== undefined) {
        updateData.scheduledDate = new Date(input.scheduledDate);
      }
      if (input.scheduledTime !== undefined) {
        updateData.scheduledTime = input.scheduledTime;
      }
      if (input.durationHours !== undefined) {
        updateData.durationHours = input.durationHours;
      }
      if (input.address !== undefined) {
        updateData.address = input.address;
      }
      if (input.specialInstructions !== undefined) {
        updateData.specialInstructions = input.specialInstructions;
      }
      if (input.finalPrice !== undefined) {
        updateData.finalPrice = input.finalPrice;
      }
      if (input.status !== undefined) {
        updateData.status = input.status;
      }
      if (input.serviceFrequency !== undefined) {
        updateData.serviceFrequency = input.serviceFrequency;
      }
      if (input.houseSquareFootage !== undefined) {
        updateData.houseSquareFootage = input.houseSquareFootage;
      }
      if (input.basementSquareFootage !== undefined) {
        updateData.basementSquareFootage = input.basementSquareFootage;
      }
      if (input.numberOfBedrooms !== undefined) {
        updateData.numberOfBedrooms = input.numberOfBedrooms;
      }
      if (input.numberOfBathrooms !== undefined) {
        updateData.numberOfBathrooms = input.numberOfBathrooms;
      }
      if (input.numberOfCleanersRequested !== undefined) {
        updateData.numberOfCleanersRequested = input.numberOfCleanersRequested;
      }
      if (input.cleanerPaymentAmount !== undefined) {
        updateData.cleanerPaymentAmount = input.cleanerPaymentAmount;
      }
      if (input.paymentMethod !== undefined) {
        updateData.paymentMethod = input.paymentMethod;
      }
      if (input.paymentDetails !== undefined) {
        updateData.paymentDetails = input.paymentDetails;
      }
      if (input.selectedExtras !== undefined) {
        updateData.selectedExtras = JSON.stringify(input.selectedExtras);
      }

      // Update the booking
      const booking = await db.booking.update({
        where: { id: input.bookingId },
        data: updateData,
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

      // Handle recurring updates
      if (input.updateMode === 'FUTURE') {
        const originalScheduledDate = new Date(existingBooking.scheduledDate);
        // Ensure new scheduledDate is valid if provided, otherwise fallback to existing
        const newScheduledDate = input.scheduledDate ? new Date(input.scheduledDate) : originalScheduledDate;

        const dateDiff = newScheduledDate.getTime() - originalScheduledDate.getTime();

        // Only valid if date changed. Time change handled separately if needed, but here assuming date shift primarily.
        // If time changed, we update that too.

        if ((dateDiff !== 0 || input.scheduledTime !== undefined) && (!input.serviceFrequency || input.serviceFrequency === existingBooking.serviceFrequency)) {
             const futureBookings = await db.booking.findMany({
                where: {
                    clientId: existingBooking.clientId,
                    serviceType: existingBooking.serviceType,
                    serviceFrequency: existingBooking.serviceFrequency,
                    scheduledDate: {
                        gt: existingBooking.scheduledDate,
                    },
                    status: {
                        not: 'CANCELLED'
                    },
                    id: {
                        not: input.bookingId
                    }
                }
             });

             for (const futureBooking of futureBookings) {
                 const updateFutureData: any = {};

                 // Calculate interval to preserve relative spacing (e.g. gaps) but align Day of Week
                 const oldFutureDate = new Date(futureBooking.scheduledDate);
                 const originalAnchorDate = new Date(existingBooking.scheduledDate);

                 // Default to simple shift if not a standard frequency or calculation fails
                 let newFutureDate = new Date(oldFutureDate.getTime() + dateDiff);

                 const frequency = input.serviceFrequency || existingBooking.serviceFrequency;

                 if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
                     const daysDiff = (oldFutureDate.getTime() - originalAnchorDate.getTime()) / (1000 * 60 * 60 * 24);
                     const intervalDays = frequency === 'WEEKLY' ? 7 : 14;
                     const intervalsAway = Math.round(daysDiff / intervalDays);

                     if (intervalsAway > 0) {
                         const targetDate = new Date(newScheduledDate);
                         targetDate.setDate(targetDate.getDate() + (intervalsAway * intervalDays));
                         newFutureDate = targetDate;
                     }
                 } else if (frequency === 'MONTHLY') {
                     // Approximate months away
                     const monthsDiff = (oldFutureDate.getFullYear() - originalAnchorDate.getFullYear()) * 12 + (oldFutureDate.getMonth() - originalAnchorDate.getMonth());
                     if (monthsDiff > 0) {
                         const targetDate = new Date(newScheduledDate);
                         targetDate.setMonth(targetDate.getMonth() + monthsDiff);
                         newFutureDate = targetDate;
                     }
                 }

                 updateFutureData.scheduledDate = newFutureDate;

                 if (input.scheduledTime !== undefined) {
                     updateFutureData.scheduledTime = input.scheduledTime;
                 }

                 if (Object.keys(updateFutureData).length > 0) {
                     await db.booking.update({
                         where: { id: futureBooking.id },
                         data: updateFutureData
                     });
                 }
             }
        }
      }

      // Generate recurring bookings ONLY if frequency is changed to a recurring type
      if (input.serviceFrequency &&
          ["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(input.serviceFrequency) &&
          input.serviceFrequency !== existingBooking.serviceFrequency
         ) {

         // Fix: When changing frequency, we must clear "future" bookings that might conflict or be "off-cadence"
         // But we must strictly preserve history.
         // Cutoff is the LATER of (Today, ScheduledDate).
         const now = new Date();
         const scheduledDate = new Date(existingBooking.scheduledDate);

         // If booking is in the past, we start clearing from tomorrow (or technically > now)
         // If booking is in the future, we start clearing from after that booking.
         const cutoffDate = scheduledDate > now ? scheduledDate : now;

         // Delete future bookings of the same service type to "clear the runway"
         console.log(`[Recurrence Update] Clearing future bookings after ${cutoffDate.toISOString()}`);
         const deleteResult = await db.booking.deleteMany({
            where: {
                clientId: existingBooking.clientId,
                serviceType: existingBooking.serviceType, // Only match this service type
                scheduledDate: { gt: cutoffDate },
                status: { notIn: ["CANCELLED", "COMPLETED", "IN_PROGRESS"] }
            }
         });
         console.log(`[Recurrence Update] Deleted ${deleteResult.count} bookings.`);

         // Await recurrence generation to ensure consistency
         await generateFutureBookings(booking, input.serviceFrequency);
      }

      // Check configuration for payment hold delay
      const configuration = await db.configuration.findFirst();
      const paymentHoldDelayHours = configuration?.paymentHoldDelayHours;

      // Determine if we should place a hold now or defer it
      let shouldPlaceHoldNow = true;
      if (paymentHoldDelayHours !== null && paymentHoldDelayHours !== undefined) {
        // Calculate hours until booking
        const scheduledDateTime = input.scheduledDate
          ? new Date(input.scheduledDate)
          : existingBooking.scheduledDate;
        const now = new Date();
        const hoursUntilBooking = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Only place hold if we're within the delay window
        shouldPlaceHoldNow = hoursUntilBooking <= paymentHoldDelayHours;
      }

      // Handle payment method changes
      if (input.replacePaymentMethod || input.savedPaymentMethodId !== undefined) {
        // Fetch existing payments for this booking
        const existingPayments = await db.payment.findMany({
          where: {
            bookingId: input.bookingId,
            isCaptured: false,
            status: "requires_capture",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Cancel existing holds if we're replacing the payment method
        for (const payment of existingPayments) {
          if (payment.stripePaymentIntentId) {
            try {
              await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
              await db.payment.update({
                where: { id: payment.id },
                data: { status: "canceled" },
              });
            } catch (error) {
              console.error("Failed to cancel existing payment hold:", error);
              // Continue anyway - we'll create the new hold
            }
          }
        }

        // If using a saved payment method, create a new hold (if within delay window)
        if (input.savedPaymentMethodId && input.finalPrice && input.finalPrice > 0 && shouldPlaceHoldNow) {
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
          if (savedPaymentMethod.userId !== existingBooking.clientId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Payment method does not belong to this client",
            });
          }

          // Get the client's Stripe customer ID
          const clientWithStripe = await db.user.findUnique({
            where: { id: existingBooking.clientId },
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
              description: `Booking #${input.bookingId}: ${input.serviceType || existingBooking.serviceType}`,
              metadata: {
                bookingId: input.bookingId.toString(),
                clientId: existingBooking.clientId.toString(),
              },
            });

            // Create payment record
            await db.payment.create({
              data: {
                bookingId: input.bookingId,
                cleanerId: input.cleanerId !== undefined ? input.cleanerId : existingBooking.cleanerId,
                amount: input.finalPrice,
                description: `Payment hold for booking #${input.bookingId}`,
                stripePaymentIntentId: paymentIntent.id,
                stripePaymentMethodId: savedPaymentMethod.stripePaymentMethodId,
                status: paymentIntent.status,
                isCaptured: false,
              },
            });

            // Update booking with payment details
            await db.booking.update({
              where: { id: input.bookingId },
              data: {
                paymentMethod: "CREDIT_CARD",
                paymentDetails: `Saved card ending in ${savedPaymentMethod.last4} - Hold: ${paymentIntent.id}`,
              },
            });
          } catch (error) {
            console.error("Failed to create payment hold with saved card:", error);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error instanceof Stripe.errors.StripeError
                ? `Stripe error: ${error.message}`
                : "Failed to create payment hold",
            });
          }
        } else if (input.savedPaymentMethodId && input.finalPrice && input.finalPrice > 0 && !shouldPlaceHoldNow) {
          // Payment hold is deferred - update booking to indicate this
          await db.booking.update({
            where: { id: input.bookingId },
            data: {
              paymentMethod: "CREDIT_CARD",
              paymentDetails: `Payment hold deferred - will be placed ${paymentHoldDelayHours} hours before booking`,
            },
          });
        } else if (input.paymentMethod === "CASH") {
          // Switch to cash payment
          await db.booking.update({
            where: { id: input.bookingId },
            data: {
              paymentMethod: "CASH",
              paymentDetails: "Cash payment",
            },
          });
        }
      }

      // Handle price updates for existing payment holds
      // Only runs if we're NOT replacing the payment method (since that logic handles holds separately)
      if (!input.replacePaymentMethod && input.finalPrice !== undefined && input.finalPrice !== null && existingBooking.finalPrice !== input.finalPrice) {
        // Find the most recent active payment transaction (hold or legitimate charge attempts)
        const activeHold = await db.payment.findFirst({
          where: {
            bookingId: input.bookingId,
            isCaptured: false,
            // We don't filter by status 'requires_capture' strictly here because it might be 'requires_authorization' etc.
            // We'll validate the status before acting.
            // Must have a Stripe ID.
            stripePaymentIntentId: { not: null },
            status: { notIn: ["canceled", "failed"] } // Exclude terminal failed states
          },
          orderBy: { createdAt: "desc" }
        });

        if (activeHold && activeHold.stripePaymentIntentId) {
          try {
            const newAmountCents = Math.round(input.finalPrice * 100);

            // Check current status from DB (or fetch from Stripe to be sure, but DB is faster and acceptable)
            // If status is 'requires_capture', we CANNOT update amount. We must create NEW and Cancel OLD.
            if (activeHold.status === 'requires_capture') {
                 // 1. Fetch Customer ID
                 const client = await db.user.findUnique({
                     where: { id: existingBooking.clientId },
                     select: { stripeCustomerId: true }
                 });

                 if (!client?.stripeCustomerId || !activeHold.stripePaymentMethodId) {
                     throw new Error("Cannot update hold: Missing Stripe Customer ID or Payment Method ID");
                 }

                 // 2. Create NEW Payment Intent
                 const newPaymentIntent = await stripe.paymentIntents.create({
                     amount: newAmountCents,
                     currency: "usd",
                     customer: client.stripeCustomerId,
                     payment_method: activeHold.stripePaymentMethodId,
                     capture_method: "manual",
                     confirm: true,
                     off_session: true,
                     description: `Booking #${input.bookingId}: ${input.serviceType || existingBooking.serviceType} (Updated Price)`,
                     metadata: {
                         bookingId: input.bookingId.toString(),
                         clientId: existingBooking.clientId.toString(),
                     }
                 });

                 if (newPaymentIntent.status !== 'requires_capture' && newPaymentIntent.status !== 'requires_confirmation') {
                     // If it failed to authorize (e.g. requires action), we might want to abort?
                     // If 'requires_action', we can't complete it off-session.
                     if (newPaymentIntent.status === 'requires_action') {
                          // Clean up the new intent since we can't use it easily
                          await stripe.paymentIntents.cancel(newPaymentIntent.id);
                          throw new Error("Cannot update hold: New amount requires authentication (3DS).");
                     }
                 }

                 // 3. Cancel OLD Payment Intent
                 await stripe.paymentIntents.cancel(activeHold.stripePaymentIntentId);

                 // 4. Update DB Record to point to NEW Intent
                 await db.payment.update({
                     where: { id: activeHold.id },
                     data: {
                         amount: input.finalPrice,
                         stripePaymentIntentId: newPaymentIntent.id,
                         status: newPaymentIntent.status,
                         description: `Payment hold for booking #${input.bookingId} (Replaced for Price Update)`
                     }
                 });

            } else {
                // For other statuses (e.g. requires_payment_method), try to update existing
                let updatedPI = await stripe.paymentIntents.update(activeHold.stripePaymentIntentId, {
                  amount: newAmountCents
                });

                if (updatedPI.status === 'requires_confirmation') {
                    updatedPI = await stripe.paymentIntents.confirm(activeHold.stripePaymentIntentId);
                }

                await db.payment.update({
                  where: { id: activeHold.id },
                  data: {
                    amount: input.finalPrice,
                    status: updatedPI.status,
                    description: `Payment hold for booking #${input.bookingId} (Updated Amount)`
                  }
                });
            }

            // Update booking payment details to reflect the updated hold (optional but good for visibility)
            // But we might overwrite existing details which might be custom?
            // "paymentDetails" in booking usually says "Card ending in ... - Hold: pi_..."
            // Let's leave booking.paymentDetails alone as it mostly tracks the method/logic.
          } catch (error) {
            console.error("Failed to update payment hold amount:", error);
            // We don't throw here to avoid blocking the booking update, but user should know?
            // For admin portal, maybe better to throw so they know it failed?
            // "Fix the booking update logic" implies it should work.
            // If it fails, the price is updated in DB but hold is wrong.
            // I'll log it. Throwing might be safer for data integrity.
            throw new TRPCError({
               code: "INTERNAL_SERVER_ERROR",
               message: "Failed to update Stripe payment hold amount: " + (error instanceof Error ? error.message : "Unknown error")
            });
          }
        }
      }



      return { booking };
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
