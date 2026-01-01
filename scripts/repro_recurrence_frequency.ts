
import { db } from "../src/server/db";
import { appRouter } from "../src/server/trpc/root";
// import { createTRPCContext } from "../src/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "../src/server/env";

const mockCtx = {} as any;
const caller = appRouter.createCaller(mockCtx);

async function main() {
    console.log("Starting Repro: Recurring Frequency Update...");

    // 1. Cleanup
    await db.booking.deleteMany({ where: { client: { email: "repro_freq@test.com" } } });
    await db.user.deleteMany({ where: { email: "repro_freq@test.com" } });

    // 2. Create User/Admin
    const user = await db.user.create({
        data: {
            email: "repro_freq@test.com",
            firstName: "Repro",
            lastName: "Freq",
            role: "ADMIN",
            password: "password123",
            adminPermissions: { manage_bookings: true },
        }
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET);

    // 3. Create "Past" Weekly Booking Series
    // Starting 2 weeks ago.
    // Dates: T-14 (Past), T-7 (Past), T (Today), T+7 (Future), T+14 (Future)
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 14);

    console.log(`Creating Weekly series starting from: ${pastDate.toISOString()}`);

    const booking = await caller.createBookingAdmin({ // Fixed caller path
        authToken: token,
        clientId: user.id,
        serviceType: "Standard Home Cleaning",
        scheduledDate: pastDate.toISOString(),
        scheduledTime: "10:00",
        address: "123 Test St",
        serviceFrequency: "WEEKLY",
        status: "PENDING",
        finalPrice: 100,
        paymentMethod: "CASH",
    });

    // Manually generating future bookings is needed because createBookingAdmin might only create the first one?
    // Actually createBookingAdmin calls generateFutureBookings. So we should have the series.
    // Let's verify we have 5 bookings (approx) in the next month.

    const bookingsBefore = await db.booking.findMany({
        where: { clientId: user.id },
        orderBy: { scheduledDate: 'asc' }
    });

    console.log(`Bookings Initial Count: ${bookingsBefore.length}`);
    bookingsBefore.forEach(b => console.log(` - ${b.scheduledDate.toISOString().split('T')[0]} (${b.serviceFrequency})`));

    // 4. Update the PAST booking (T-14) to BIWEEKLY
    // Expected behavior:
    // - T-14: Biweekly (Updated)
    // - T-7 (Past): SHOULD REMAIN (History preservation)
    // - T (Today): Biweekly (Matches T-14 + 14 days) -> Keeps or Updates
    // - T+7 (Future): SHOULD BE DELETED (Off-week)
    // - T+14 (Future): Biweekly -> Keep/Update

    console.log("\nUpdating T-14 Booking to BIWEEKLY...");
    await caller.updateBookingAdmin({
        authToken: token,
        bookingId: booking.booking.id,
        serviceFrequency: "BIWEEKLY",
        // updateMode: "FUTURE" // Admin form usually sends 'SINGLE' or prompts?
        // Wait, if I change frequency, I usually intend to change the series.
        // updateBookingAdmin logic only triggers recursion if frequency changes.
    });

    // 5. Verify Results
    const bookingsAfter = await db.booking.findMany({
        where: { clientId: user.id },
        orderBy: { scheduledDate: 'asc' }
    });

    console.log(`\nBookings After Update Count: ${bookingsAfter.length}`);
    bookingsAfter.forEach(b => console.log(` - ${b.scheduledDate.toISOString().split('T')[0]} (${b.serviceFrequency})`));

    // Assertions
    const tMinus7 = new Date(pastDate); tMinus7.setDate(tMinus7.getDate() + 7);
    const tPlus7 = new Date(pastDate); tPlus7.setDate(tPlus7.getDate() + 21); // 14 + 7 = 21 days from start

    const hasPastOffWeek = bookingsAfter.find(b => b.scheduledDate.toISOString().split('T')[0] === tMinus7.toISOString().split('T')[0]);
    const hasFutureOffWeek = bookingsAfter.find(b => b.scheduledDate.toISOString().split('T')[0] === tPlus7.toISOString().split('T')[0]);

    console.log("\n--- Verification ---");
    if (hasPastOffWeek) {
        console.log("✅ Past Off-Week (T-7) Preserved.");
    } else {
        console.log("❌ Past Off-Week (T-7) DELETED (Bad if it was completed/history).");
    }

    if (!hasFutureOffWeek) {
        console.log("✅ Future Off-Week (T+7) Deleted.");
    } else {
        console.log("❌ Future Off-Week (T+7) STILL EXISTS (Expected to be deleted).");
    }
}

main().catch(console.error);
