
import { db } from "../db";
import { generateFutureBookings } from "../utils/recurrence";

async function main() {
  console.log("Setting up reproduction text...");

  // Cleanup
  await db.booking.deleteMany({
      where: {
          client: { email: "repro_recurrence@test.com" }
      }
  });

  const client = await db.user.findFirst({ where: { role: "CLIENT" } });
  if (!client) throw new Error("No client found");

  let cleaner = await db.user.findFirst({ where: { role: "CLEANER" } });
  if (!cleaner) {
      console.log("No cleaner found, creating one...");
      cleaner = await db.user.create({
          data: {
              firstName: "Repro",
              lastName: "Cleaner",
              email: "repro_cleaner@test.com",
              password: "password123",
              role: "CLEANER",
              phone: "555-0199"
          }
      });
  }

  // Create initial booking
  const startDate = new Date("2025-01-01T12:00:00.000Z");
  const booking = await db.booking.create({
    data: {
      serviceType: "Standard Cleaning",
      serviceFrequency: "WEEKLY",
      scheduledDate: startDate,
      scheduledTime: "12:00",
      address: "123 Test St",
      status: "CONFIRMED",
      clientId: client.id,
      cleanerId: cleaner.id,
      durationHours: 2,
      finalPrice: 100
    }
  });

  console.log("Created initial booking:", booking.id, booking.scheduledDate.toISOString());

  // Generate future bookings
  await generateFutureBookings(booking, "WEEKLY");

  // Verify future bookings
  const bookingsBefore = await db.booking.findMany({
      where: { clientId: client.id, scheduledDate: { gt: startDate } },
      orderBy: { scheduledDate: "asc" }
  });

  console.log("Future bookings before update:");
  bookingsBefore.forEach(b => console.log(b.id, b.scheduledDate.toISOString()));

  // Simulate update: Move Jan 1 to Jan 2 (+1 day)
  const originalDate = booking.scheduledDate;
  const newDate = new Date("2025-01-02T12:00:00.000Z");
  const dateDiff = newDate.getTime() - originalDate.getTime();

  console.log(`\nSimulating update... Moving +${dateDiff / (1000 * 60 * 60 * 24)} days`);

  // Manual logic simulation (mirroring updateBookingAdmin.ts)
  const futureBookings = await db.booking.findMany({
    where: {
        clientId: client.id,
        serviceType: "Standard Cleaning",
        serviceFrequency: "WEEKLY",
        scheduledDate: {
            gt: originalDate,
        },
        status: {
            not: 'CANCELLED'
        }
    }
 });

 for (const futureBooking of futureBookings) {
     if (dateDiff !== 0) {
         const oldDate = new Date(futureBooking.scheduledDate);
         const updatedDate = new Date(oldDate.getTime() + dateDiff);
         console.log(`Booking ${futureBooking.id}: ${oldDate.toISOString()} -> ${updatedDate.toISOString()}`);

         await db.booking.update({
             where: { id: futureBooking.id },
             data: { scheduledDate: updatedDate }
         });
     }
 }

  // Verify
  const bookingsAfter = await db.booking.findMany({
      where: { clientId: client.id, scheduledDate: { gt: newDate } },
      orderBy: { scheduledDate: "asc" }
  });

  console.log("\nFuture bookings after update:");
  bookingsAfter.forEach(b => console.log(b.id, b.scheduledDate.toISOString()));
}

main().catch(console.error);
