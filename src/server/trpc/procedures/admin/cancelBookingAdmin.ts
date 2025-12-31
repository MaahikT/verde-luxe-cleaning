import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";
import { sendEmail } from "~/server/utils/mailer";
import { EmailRecipientType, EmailEventCategory } from "@prisma/client";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-18.clover" as any, // Cast to any to avoid strict typing issues if minor versions mismatch, or use specific version
});

export const cancelBookingAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      bookingId: z.number(),
      chargeFee: z.boolean(),
      sendEmail: z.boolean(),
      cancellationReason: z.string().optional(),
      feeAmount: z.number().optional(), // Allow overriding the fee
      cancelFutureBookings: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // 1. Authenticate Admin
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const user = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.role !== "ADMIN" && user.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        });
      }

      if (user.role === "ADMIN" && !hasPermission(user, "manage_bookings")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage bookings",
        });
      }

      // 2. Fetch Booking and Config
      const booking = await db.booking.findUnique({
        where: { id: input.bookingId },
        include: {
          client: true,
          payments: true, // Fetch payments to check for holds
        },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      if (booking.status === "CANCELLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is already cancelled" });
      }

      const configuration = await db.configuration.findFirst();

      // 3. Update Booking Status
      const updatedBooking = await db.booking.update({
        where: { id: input.bookingId },
        data: {
          status: "CANCELLED",
          specialInstructions: input.cancellationReason
            ? (booking.specialInstructions ? booking.specialInstructions + "\n\nCancellation Reason: " + input.cancellationReason : "Cancellation Reason: " + input.cancellationReason)
            : booking.specialInstructions,
        },
      });

      // 3.5. Release/Cancel Payment Holds
      // Find payments that are pending holds (have intent ID, not captured, status pending/requires_capture)
      const pendingHolds = booking.payments.filter(
        (p) =>
          p.stripePaymentIntentId &&
          !p.isCaptured &&
          (p.status === "pending" || p.status === "requires_capture")
      );

      for (const hold of pendingHolds) {
        if (hold.stripePaymentIntentId) {
          try {
            const canceledIntent = await stripe.paymentIntents.cancel(hold.stripePaymentIntentId);

            await db.payment.update({
              where: { id: hold.id },
              data: {
                status: canceledIntent.status,
              },
            });
            console.log(`Successfully cancelled payment hold ${hold.id} (Intent: ${hold.stripePaymentIntentId})`);
          } catch (stripeError: any) {
             // Log error but don't fail the cancellation flow
             console.error(`Failed to cancel payment hold ${hold.id} manually:`, stripeError.message);
             // We could optionally update the payment status to 'cancellation_failed' or similar if schema allowed,
             // but for now we just log it. Admin can use the explicit "Cancel Hold" button if needed.
          }
        }
      }

      // 4. Handle Fee Logic
      let feeCharged = false;
      const feeToCharge = input.feeAmount ?? configuration?.cancellationFeeAmount ?? 50.0;

      if (input.chargeFee && feeToCharge > 0) {
        // Create a record of the fee charge
        // For now, we will create a Payment record with status 'pending' (or 'requires_capture' if we had a card)
        // Since we don't have the full payment charging logic integrated here yet, we'll mark it as a pending payment.
        // Ideally, we would trigger a Stripe charge here if `booking.paymentDetails` or saved card existed.

        await db.payment.create({
          data: {
            bookingId: booking.id,
            amount: feeToCharge,
            status: "pending",
            description: `Cancellation Fee - ${input.cancellationReason || "No reason provided"}`,
            isCaptured: false,
          },
        });
        feeCharged = true;
      }

      // 5. Send Email Logic
      if (input.sendEmail) {
        const templateName = feeCharged ? "booking_cancellation_fee" : "booking_cancellation_no_fee";

        const template = await db.emailTemplate.findUnique({
          where: { name: templateName },
        });

        if (template && template.isActive) {
          // Replace placeholders
          let body = template.body;
          const subject = template.subject;

          const replacements: Record<string, string> = {
            "{{customer_first_name}}": booking.client.firstName || "Customer",
            "{{customer_last_name}}": booking.client.lastName || "",
            "{{service_type}}": booking.serviceType,
            "{{scheduled_date}}": booking.scheduledDate.toLocaleDateString(),
            "{{scheduled_time}}": booking.scheduledTime,
            "{{cancellation_fee}}": feeCharged ? `$${feeToCharge.toFixed(2)}` : "$0.00",
            "{{cancellation_reason}}": input.cancellationReason || "N/A",
          };

          for (const [key, value] of Object.entries(replacements)) {
            body = body.replace(new RegExp(key, "g"), value);
          }

          // Send email
          await sendEmail({
            to: booking.client.email,
            subject: subject,
            html: body,
          });
        }
      }

      // 6. Handle Recurring Bookings Cancellation
      if (input.cancelFutureBookings && booking.serviceFrequency && booking.serviceFrequency !== "ONE_TIME") {
        const futureBookings = await db.booking.findMany({
          where: {
            clientId: booking.clientId,
            serviceType: booking.serviceType,
            serviceFrequency: booking.serviceFrequency,
            scheduledDate: {
              gt: booking.scheduledDate,
            },
            status: {
              notIn: ["CANCELLED", "COMPLETED"],
            },
          },
          include: {
            payments: true,
          },
        });

        const futureIds = futureBookings.map((b) => b.id);

        if (futureIds.length > 0) {
          // Bulk update status
          await db.booking.updateMany({
            where: {
              id: { in: futureIds },
            },
            data: {
              status: "CANCELLED",
              specialInstructions: `Cancelled via bulk cancellation of booking #${booking.id}`,
            },
          });

          // Cancel payment holds for future bookings
          for (const futureBooking of futureBookings) {
             const holds = futureBooking.payments.filter(
                (p) =>
                  p.stripePaymentIntentId &&
                  !p.isCaptured &&
                  (p.status === "pending" || p.status === "requires_capture")
              );

              for (const hold of holds) {
                if (hold.stripePaymentIntentId) {
                   try {
                     const canceledIntent = await stripe.paymentIntents.cancel(hold.stripePaymentIntentId);
                     await db.payment.update({
                       where: { id: hold.id },
                       data: { status: canceledIntent.status },
                     });
                   } catch (e) {
                      console.error(`Failed to cancel hold for future booking ${futureBooking.id}:`, e);
                   }
                }
              }
          }
          console.log(`Cancelled ${futureIds.length} future bookings for booking #${booking.id}`);
        }
      }

      return { success: true, booking: updatedBooking };

    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error cancelling booking:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel booking",
      });
    }
  });
