
import { db } from "../src/server/db";

async function main() {
  try {
    const bookingId = 2256;
    console.log(`Fetching booking #${bookingId}...`);

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
      }
    });

    if (!booking) {
      console.log("Booking not found!");
      return;
    }

    console.log("--- Booking Details ---");
    console.log(`ID: ${booking.id}`);
    console.log(`Status: ${booking.status}`);
    console.log(`ScheduledDate: ${booking.scheduledDate} (ISO: ${booking.scheduledDate.toISOString()})`);
    console.log(`PaymentMethod: ${booking.paymentMethod}`);
    console.log(`PaymentDetails: "${booking.paymentDetails}"`);
    console.log(`Payments Count: ${booking.payments.length}`);
    if (booking.payments.length > 0) {
        console.log("Payments:", JSON.stringify(booking.payments, null, 2));
    }

    // Simulate the logic
    const scheduledDate = new Date(booking.scheduledDate);
    const now = new Date();
    const diffHours = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    console.log(`\n--- Logic Simulation ---`);
    console.log(`Now: ${now.toISOString()}`);
    console.log(`DiffHours: ${diffHours}`);
    console.log(`Is < 48h: ${diffHours < 48}`);

    if (booking.paymentDetails) {
        if (booking.paymentDetails.includes("Hold:")) console.log("Logic Match: Includes 'Hold:'");
        else console.log("Logic Match: Does NOT include 'Hold:'");

        if (booking.paymentDetails.includes("Stripe Payment Intent:")) console.log("Logic Match: Includes 'Stripe Payment Intent:'");
        else console.log("Logic Match: Does NOT include 'Stripe Payment Intent:'");
    } else {
        console.log("Logic Match: paymentDetails is null/empty");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();
