
import { db } from "./src/server/db";

async function main() {
  console.log("Fetching booking 2456...");
  try {
    const booking = await db.booking.findUnique({
      where: { id: 2456 },
      include: {
        payments: true,
        client: {
           include: { savedPaymentMethods: true }
        }
      }
    });

    if (!booking) {
      console.log("Booking 2456 not found!");
    } else {
      console.log("Booking Status:", booking.status);
      console.log("Client ID:", booking.clientId);
      console.log("Stripe Customer ID:", booking.client.stripeCustomerId);
      console.log("Number of Payments:", booking.payments.length);
      console.log("Payments:", JSON.stringify(booking.payments, null, 2));
      console.log("Saved Payment Methods:", JSON.stringify(booking.client.savedPaymentMethods, null, 2));

      // Check for config
      const config = await db.configuration.findFirst();
      console.log("Configuration:", JSON.stringify(config, null, 2));
    }
  } catch (e) {
    console.error("Error fetching booking:", e);
  }
}

main().catch(console.error);
