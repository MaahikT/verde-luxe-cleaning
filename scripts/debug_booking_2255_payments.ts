
import { db } from "../src/server/db";

async function main() {
  const bookingId = 2255;
  console.log(`Fetching all payments for Booking #${bookingId}...`);

  const payments = await db.payment.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      status: true,
      isCaptured: true,
      createdAt: true,
      paidAt: true,
      stripePaymentIntentId: true,
      description: true
    }
  });

  console.log("Found payments:", payments.length);
  console.table(payments);

  // Calculate net total
  const net = payments.reduce((sum, p) => sum + p.amount, 0);
  console.log("Total Net (All):", net);

  // Simulate getAllCapturedCharges filter
  const filtered = payments.filter(p => p.isCaptured === true && p.status === 'succeeded');
  console.log("Visible in All Charges (isCaptured=true, status='succeeded'):", filtered.length);
  console.table(filtered);
  console.log("Total Net (Visible):", filtered.reduce((sum, p) => sum + p.amount, 0));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
