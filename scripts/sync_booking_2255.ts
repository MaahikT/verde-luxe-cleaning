
import { db } from "../src/server/db";

async function main() {
  const bookingId = 2255;

  // 1. Get original charge
  const originalCharge = await db.payment.findFirst({
      where: { bookingId, amount: { gt: 0 } }
  });

  if (!originalCharge || !originalCharge.stripePaymentIntentId) {
      console.error("No original charge found!");
      return;
  }

  // 2. Insert refund record necessary to reach $3
  // Current Net is $17. Target $3. Diff $14.

  const result = await db.payment.create({
      data: {
          bookingId,
          cleanerId: originalCharge.cleanerId,
          amount: -14,
          description: "Refund for Booking #2255 - Syncing Price to Ledger",
          stripePaymentIntentId: originalCharge.stripePaymentIntentId,
          status: 'succeeded',
          isCaptured: true,
          paidAt: new Date()
      }
  });

  console.log("Inserted syncing refund record:", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
