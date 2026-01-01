
import { db } from "../src/server/db";
import { appRouter } from "../src/server/trpc/root";
import jwt from "jsonwebtoken";
import { env } from "../src/server/env";

const mockCtx = {} as any;
const caller = appRouter.createCaller(mockCtx);

async function main() {
    console.log("Starting Repro: Double Booking Check...");

    // 1. Cleanup
    await db.booking.deleteMany({ where: { client: { email: "repro_double@test.com" } } });
    await db.user.deleteMany({ where: { email: "repro_double@test.com" } });

    // 2. Create User
    const user = await db.user.create({
        data: {
            email: "repro_double@test.com",
            firstName: "Repro",
            lastName: "Double",
            role: "ADMIN",
            password: "password",
            adminPermissions: { manage_bookings: true },
        }
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET);

    // 3. Create Weekly Series (Future)
    // Start Today + 1 day
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(10, 0, 0, 0);

    console.log(`Creating Weekly series starting: ${startDate.toISOString()}`);

    const booking = await caller.createBookingAdmin({
        authToken: token,
        clientId: user.id,
        serviceType: "Standard Home Cleaning",
        scheduledDate: startDate.toISOString(),
        scheduledTime: "10:00",
        address: "123 Test St",
        serviceFrequency: "WEEKLY",
        status: "PENDING",
        finalPrice: 100,
        paymentMethod: "CASH",
    });

    // Verify initial state (e.g. 5 bookings)
    const bookingsInitial = await db.booking.findMany({
        where: { clientId: user.id },
        orderBy: { scheduledDate: 'asc' }
    });
    console.log(`Initial Setup: ${bookingsInitial.length} bookings.`);
    bookingsInitial.forEach(b => console.log(` - ${b.scheduledDate.toISOString()}`));

    // 4. Update Frequency to BIWEEKLY
    // This should delete the off-weeks and keep the on-weeks.
    // Ideally it shouldn't produce duplicates.

    console.log("\nUpdating to BIWEEKLY...");
    await caller.updateBookingAdmin({
        authToken: token,
        bookingId: booking.booking.id,
        serviceFrequency: "BIWEEKLY",
        // Simulate changing time slightly to trigger potential time-based duplicate bugs
        scheduledTime: "11:00", // Shifted time to test date-range check
        // scheduledDate: ... // Uncomment to test date change
    });

    // 5. Verify
    const bookingsAfter = await db.booking.findMany({
        where: { clientId: user.id },
        orderBy: { scheduledDate: 'asc' }
    });

    console.log(`\nAfter Update: ${bookingsAfter.length} bookings.`);
    bookingsAfter.forEach(b => console.log(` - ${b.scheduledDate.toISOString()}`));

    // Check for duplicates (same day)
    const dates = bookingsAfter.map(b => b.scheduledDate.toISOString().split('T')[0]);
    const duplicates = dates.filter((item, index) => dates.indexOf(item) !== index);

    if (duplicates.length > 0) {
        console.log("❌ DUPLICATE BOOKINGS FOUND ON DATES:", duplicates);
    } else {
        console.log("✅ No duplicates found.");
    }
}

main().catch(console.error);
