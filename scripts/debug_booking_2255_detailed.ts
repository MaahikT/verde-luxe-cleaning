
import { db } from "../src/server/db";

async function main() {
  const bookingId = 2255;
  console.log(`--- Debugging Booking #${bookingId} ---`);

  const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, finalPrice: true, status: true, paymentDetails: true }
  });
  console.log("Booking:", booking);

  const payments = await db.payment.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' }
  });

  console.log("\n--- All Payments in DB ---");
  payments.forEach(p => {
      console.log(`ID: ${p.id} | Amount: ${p.amount} | Status: ${p.status} | Captured: ${p.isCaptured} | Date: ${p.createdAt.toISOString()} | Desc: ${p.description}`);
  });

  const visiblePayments = payments.filter(p => p.isCaptured === true && p.status === 'succeeded');
  const visibleTotal = visiblePayments.reduce((sum, p) => sum + p.amount, 0);

  console.log("\n--- Visible in Admin Panel (isCaptured=true, status='succeeded') ---");
  visiblePayments.forEach(p => {
      console.log(`ID: ${p.id} | Amount: ${p.amount}`);
  });
  console.log(`\nCALCULATED NET TOTAL: ${visibleTotal}`);
  console.log(`EXPECTED NET TOTAL: ${booking?.finalPrice}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
