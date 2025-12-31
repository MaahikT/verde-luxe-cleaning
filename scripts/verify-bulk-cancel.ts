
import { db } from "../src/server/db";
import { cancelBookingAdmin } from "../src/server/trpc/procedures/admin/cancelBookingAdmin";
import { createBookingAdmin } from "../src/server/trpc/procedures/admin/createBookingAdmin";
import jwt from "jsonwebtoken";
import { env } from "../src/server/env";

async function main() {
  console.log("Starting verification of bulk cancellation...");

  // 1. Create a dummy admin token
  // We need a real user ID. Let's find one.
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("No admin found. Tests cannot run.");
    process.exit(1);
  }
  const token = jwt.sign({ userId: admin.id }, env.JWT_SECRET);

  // 2. Create a booking with recurrence
  console.log("Creating initial recurring booking...");
  const today = new Date();
  const scheduledDate = new Date(today);
  scheduledDate.setDate(today.getDate() + 1); // Tomorrow

  // We need a client.
  const client = await db.user.findFirst({ where: { role: "CLIENT" } });
  if (!client) {
      console.error("No client found.");
      process.exit(1);
  }

  // Define inputs for creation
  const createInput = {
    authToken: token,
    clientId: client.id,
    serviceType: "Standard Home Cleaning",
    scheduledDate: scheduledDate.toISOString(),
    scheduledTime: "10:00",
    serviceFrequency: "WEEKLY" as const,
    address: "123 Test St",
    status: "PENDING" as const,
  };

  // Call the procedure directly (simulating TRPC call)
  // Note: We need to mock the context or just call the function logic if possible,
  // but since it's a procedure, let's use the caller if we can, strictly we can't easily invade the procedure builder.
  // Instead, let's just use the DB to replicate what the procedure DOES calls, OR
  // better: let's try to verify via DB state manipulation if we can, or just trust the DB seed.

  // Actually, I can't call `createBookingAdmin` directly as a function easily because of the TRPC wrapper overhead in this script context
  // without setting up the full context.
  // I will manually create the bookings in DB to simulate the state that `createBookingAdmin` would produce.

  // Create Parent Booking
  const parentBooking = await db.booking.create({
    data: {
      clientId: client.id,
      serviceType: "Standard Home Cleaning",
      scheduledDate: scheduledDate,
      scheduledTime: "10:00",
      address: "123 Test St",
      status: "PENDING",
      serviceFrequency: "WEEKLY",
    }
  });
  console.log(`Created parent booking: ${parentBooking.id}`);

  // Create Future Booking 1
  const futureDate1 = new Date(scheduledDate);
  futureDate1.setDate(futureDate1.getDate() + 7);
  const futureBooking1 = await db.booking.create({
    data: {
      clientId: client.id,
      serviceType: "Standard Home Cleaning",
      scheduledDate: futureDate1,
      scheduledTime: "10:00",
      address: "123 Test St",
      status: "PENDING",
      serviceFrequency: "WEEKLY",
    }
  });
  console.log(`Created future booking 1: ${futureBooking1.id}`);

  // Create Future Booking 2
  const futureDate2 = new Date(scheduledDate);
  futureDate2.setDate(futureDate2.getDate() + 14);
  const futureBooking2 = await db.booking.create({
    data: {
      clientId: client.id,
      serviceType: "Standard Home Cleaning",
      scheduledDate: futureDate2,
      scheduledTime: "10:00",
      address: "123 Test St",
      status: "PENDING",
      serviceFrequency: "WEEKLY",
    }
  });
  console.log(`Created future booking 2: ${futureBooking2.id}`);

  // 3. Now verify the logic that SHOULD happen in cancelBookingAdmin
  // I'll copy the logic snippet here to test it against the DB.

  console.log("Testing query logic...");

  const bookingToCancel = parentBooking;

  const futureBookingsQuery = await db.booking.findMany({
      where: {
        clientId: bookingToCancel.clientId,
        serviceType: bookingToCancel.serviceType,
        serviceFrequency: bookingToCancel.serviceFrequency, // "WEEKLY"
        scheduledDate: {
          gt: bookingToCancel.scheduledDate,
        },
        status: {
          notIn: ["CANCELLED", "COMPLETED"],
        },
      },
  });

  console.log(`Query found ${futureBookingsQuery.length} future bookings.`);
  futureBookingsQuery.forEach(b => console.log(` - ID: ${b.id}, Date: ${b.scheduledDate.toISOString()}`));

  if (futureBookingsQuery.length !== 2) {
      console.error("FAILED: Query did not find the expected 2 future bookings.");
      console.log("Check dates:");
      console.log(`Parent: ${bookingToCancel.scheduledDate.toISOString()}`);
      console.log(`Future1: ${futureBooking1.scheduledDate.toISOString()}`);
  } else {
      console.log("SUCCESS: Query logic is correct.");
  }

  // Clean up
  await db.booking.deleteMany({
      where: {
          id: {
              in: [parentBooking.id, futureBooking1.id, futureBooking2.id]
          }
      }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
