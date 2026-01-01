
import { db } from "../src/server/db";

async function main() {
  const bookingId = 2255;

  // 1. Get the original payment intent ID from the initial charge
  const originalCharge = await db.payment.findFirst({
      where: { bookingId, amount: { gt: 0 } }
  });

  if (!originalCharge || !originalCharge.stripePaymentIntentId) {
      console.error("No original charge found!");
      return;
  }

  console.log("Found original intent:", originalCharge.stripePaymentIntentId);

  // 2. Insert missing refund record
  // Logic: 200 - 90 - 70 = 40. Target is 20. Diff = -20.

  const result = await db.payment.create({
      data: {
          bookingId,
          cleanerId: originalCharge.cleanerId,
          amount: -20,
          description: "Refund for Booking #2255 - Price Adjustment (Manual Fix)",
          stripePaymentIntentId: originalCharge.stripePaymentIntentId,
          status: 'succeeded',
          isCaptured: true,
          paidAt: new Date()
      }
  });

  console.log("Inserted missing refund record:", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
