
import { db } from "~/server/db";
import Stripe from "stripe";
import { env } from "~/server/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover" as any,
});

export const processPaymentHoldsLogic = async (overrideDelayHours?: number) => {
    try {
      let delayHours: number | null | undefined = overrideDelayHours;

      if (delayHours === undefined) {
          // Get Configuration
          const config = await db.configuration.findFirst();
          delayHours = config?.paymentHoldDelayHours;
      }

      if (!delayHours) {
        return { message: "No payment hold delay configured. Skipping." };
      }

      const now = new Date();
      // Calculate target window: Bookings scheduled between NOW and (NOW + delayHours)
      const targetDate = new Date(now.getTime() + delayHours * 60 * 60 * 1000);

      // Find Bookings needing holds
      const bookings = await db.booking.findMany({
        where: {
          scheduledDate: {
            gt: now,
            lte: targetDate,
          },
          status: {
            notIn: ["CANCELLED", "COMPLETED", "IN_PROGRESS"],
          },
          // AND: No active hold
          payments: {
            none: {
              isCaptured: false,
              stripePaymentIntentId: { not: null },
              status: { notIn: ["canceled", "failed"] },
            }
          }
        },
        include: {
          client: {
             include: {
                 savedPaymentMethods: {
                     orderBy: { isDefault: 'desc' }, // Get default first
                 }
             }
          }
        }
      });

      console.log(`[ProcessPaymentHolds] Found ${bookings.length} bookings needing holds.`);

      const results = {
        processed: 0,
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const booking of bookings) {
        results.processed++;

        try {
          if (!booking.client.stripeCustomerId) {
             console.log(`[ProcessPaymentHolds] Booking #${booking.id} skipped: Client has no Stripe Customer ID.`);
             continue;
          }

          // Determine Payment Method
          // 1. Try local saved methods
          let paymentMethodId: string | undefined = booking.client.savedPaymentMethods[0]?.stripePaymentMethodId;
          let paymentMethodLast4: string | undefined = booking.client.savedPaymentMethods[0]?.last4;

          // 2. Fallback to Stripe if no local method
          if (!paymentMethodId) {
              console.log(`[ProcessPaymentHolds] No local method for Booking #${booking.id}. Checking Stripe...`);
              try {
                  const stripeMethods = await stripe.customers.listPaymentMethods(
                      booking.client.stripeCustomerId,
                      { type: 'card', limit: 100 }
                  );

                  if (stripeMethods.data.length > 0) {
                      // Sort by created asc (oldest first)
                      const sorted = stripeMethods.data.sort((a, b) => a.created - b.created);
                      const bestMethod = sorted[0];
                      if (bestMethod) {
                          paymentMethodId = bestMethod.id;
                          paymentMethodLast4 = bestMethod.card?.last4;
                          console.log(`[ProcessPaymentHolds] Found Stripe fallback method: ${paymentMethodId} (Created: ${bestMethod.created})`);
                      }
                  }
              } catch (e) {
                  console.error(`[ProcessPaymentHolds] Failed to fetch Stripe methods for client ${booking.clientId}:`, e);
              }
          }

          if (!paymentMethodId) {
            console.log(`[ProcessPaymentHolds] Booking #${booking.id} skipped: No usable payment method found.`);
            continue;
          }

           // Create Payment Intent (Hold)
           const amount = booking.finalPrice || 0;
           if (amount <= 0) continue;

           const paymentIntent = await stripe.paymentIntents.create({
             amount: Math.round(amount * 100),
             currency: "usd",
             customer: booking.client.stripeCustomerId,
             payment_method: paymentMethodId,
             capture_method: "manual", // This makes it a hold
             confirm: true,
             off_session: true,
             description: `Automatic Payment Hold for Booking #${booking.id}`,
             metadata: {
               bookingId: booking.id.toString(),
               clientId: booking.clientId.toString(),
               type: "auto_hold"
             },
           });

           // Create Payment Record
           await db.payment.create({
             data: {
               bookingId: booking.id,
               amount: amount,
               description: `Automatic Payment Hold (Cron/Config Re-eval)`,
               stripePaymentIntentId: paymentIntent.id,
               stripePaymentMethodId: paymentMethodId,
               status: paymentIntent.status,
               isCaptured: false,
             },
           });

           // Update Booking Details
           await db.booking.update({
             where: { id: booking.id },
             data: {
               paymentDetails: `Saved card ending in ${paymentMethodLast4 || 'XXXX'} - Auto Hold: ${paymentIntent.id}`
             }
           });

           results.success++;
           console.log(`[ProcessPaymentHolds] Successfully placed hold for Booking #${booking.id}`);

        } catch (err) {
          console.error(`[ProcessPaymentHolds] Failed booking #${booking.id}:`, err);
          results.failed++;
          results.errors.push(`Booking #${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return results;

    } catch (error) {
       console.error("ProcessPaymentHolds Error:", error);
       throw new Error("Failed to process payment holds");
    }
};
