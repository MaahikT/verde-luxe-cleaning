
import { db } from "~/server/db";
import { env } from "~/server/env";
import jwt from "jsonwebtoken";
// import { createOpenPhoneContact } from "~/server/services/openphone";

const BASE_URL = "http://localhost:3001/trpc";

async function runTest() {
  console.log("Starting OpenPhone Integration Test...");

  // 1. Get an Admin User
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" }
  });

  if (!admin) {
    console.error("No Admin user found in DB. Please create one first.");
    process.exit(1);
  }

  console.log(`Using Admin User: ${admin.email} (ID: ${admin.id})`);

  // 2. Generate Auth Token
  const token = jwt.sign({ userId: admin.id }, env.JWT_SECRET, { expiresIn: "1h" });

  // 3. Prepare Test Data
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  const testPhone = `555555${randomSuffix}`;
  const testEmail = `test.auto.${randomSuffix}@example.com`;

  // TEST CASE 1: Create a New User (should trigger OpenPhone sync)
  console.log("\n[TEST 1] Creating New User via createUserAdmin...");

  const createUserInput = {
    authToken: token,
    email: testEmail,
    password: "password123",
    role: "CLIENT",
    firstName: "TestAuto",
    lastName: `User${randomSuffix}`,
    phone: testPhone,
    color: "#000000"
  };

  const createUserQuery = `createUserAdmin`;
  const createUserUrl = `${BASE_URL}/${createUserQuery}?batch=1`;

  const userPayload = {
     "0": { "json": createUserInput }
  };

  const userRes = await fetch(createUserUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userPayload)
  });

  if (!userRes.ok) {
     console.error("Failed to create user:", await userRes.text());
     process.exit(1);
  }

  const userJson = await userRes.json();
  const createdUser = userJson[0].result.data.json.user;
  console.log(`User Created. ID: ${createdUser.id}`);

  // Verify OpenPhone Sync
  console.log("Verifying User's OpenPhone ID in DB...");
  const dbUser = await db.user.findUnique({ where: { id: createdUser.id } });

  if (dbUser?.openPhoneContactId) {
      console.log(`SUCCESS: User has OpenPhone ID: ${dbUser.openPhoneContactId}`);

      // Verify via API
      console.log("Verifying visibility via OpenPhone API...");
      try {
          const opRes = await fetch(`https://api.openphone.com/v1/contacts/${dbUser.openPhoneContactId}`, {
              headers: {
                  "Authorization": env.OPENPHONE_API_KEY!,
                  "Content-Type": "application/json"
              }
          });
          if (opRes.status === 200) {
              const opData = await opRes.json();
              if (opData.data.shared) {
                   console.log("SUCCESS: Contact is visible and SHARED.");
              } else {
                   console.log("Contact found. (Check manual visibility if 'shared' prop is missing in check)");
              }
          } else {
              console.error(`FAILURE: Could not fetch contact from OpenPhone. Status: ${opRes.status}`);
          }
      } catch (e) {
          console.error("Error checking OpenPhone API:", e);
      }

  } else {
      console.error("FAILURE: User created but OpenPhone ID is MISSING in DB.");
  }

  // TEST CASE 2: Create Booking for this User (Testing createBookingAdmin sync logic)
  console.log("\n[TEST 2] Creating Booking via createBookingAdmin...");

  const bookingPayloadRaw = {
    authToken: token,
    clientId: createdUser.id,
    serviceType: "Deep Home Cleaning",
    scheduledDate: new Date().toISOString(),
    scheduledTime: "10:00",
    finalPrice: 150,
    paymentMethod: "CASH",
    address: "123 Test St" // Required field
  };

  const createBookingUrl = `${BASE_URL}/createBookingAdmin?batch=1`;
  const bookingReqBody = { "0": { "json": bookingPayloadRaw } };

  const bookingRes = await fetch(createBookingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingReqBody)
  });

  if (!bookingRes.ok) {
      console.error("Failed to create booking:", await bookingRes.text());
  } else {
      const bookingJson = await bookingRes.json();
      console.log("Booking created successfully:", JSON.stringify(bookingJson[0].result.data, null, 2));
      console.log("Verified that booking creation works (which triggers contact sync internally).");
  }
  // TEST CASE 3: Create Booking with NEW Client (Implicit Creation)
  // This tests the flow where the user enters a new email/phone in the booking form directly.

  const randomSuffix2 = Math.floor(Math.random() * 9000) + 1000;
  const testPhone2 = `555555${randomSuffix2}`;
  const testEmail2 = `test.booking.implicit.${randomSuffix2}@example.com`;

  console.log(`\n[TEST 3] Creating Booking with NEW Implicit Client: ${testEmail2}`);

  const bookingImplicitPayload = {
    authToken: token,
    // No clientId
    clientEmail: testEmail2,
    clientFirstName: "TestImplicit",
    clientLastName: "User",
    clientPhone: testPhone2,

    serviceType: "Deep Home Cleaning",
    scheduledDate: new Date().toISOString(),
    scheduledTime: "12:00",
    finalPrice: 200,
    paymentMethod: "CASH",
    address: "789 Implicit Ln"
  };

  const bookingReqBody2 = { "0": { "json": bookingImplicitPayload } };

  const bookingRes2 = await fetch(createBookingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingReqBody2)
  });

  if (!bookingRes2.ok) {
      console.error("Failed to create implicit booking:", await bookingRes2.text());
  } else {
      const bookingJson2 = await bookingRes2.json();
      console.log("Response JSON:", JSON.stringify(bookingJson2, null, 2));

      if (bookingJson2[0].error) {
        console.error("tRPC Error:", bookingJson2[0].error);
      } else {
        const result = bookingJson2[0].result;
        // tRPC generic structure check
        const dataJson = result?.data?.json;
        if (!dataJson || !dataJson.booking) {
             console.error("Unexpected response structure:", result);
        } else {
            const bookingData = dataJson.booking;
            const clientData = bookingData.client;

            console.log(`Booking Created. ID: ${bookingData.id}`);
            console.log(`Implicit Client Created. ID: ${clientData.id}, Phone: ${clientData.phone}`);

            // Verify OpenPhone Sync for this new user
            console.log("Verifying Implicit User's OpenPhone ID in DB...");
            const dbUser2 = await db.user.findUnique({ where: { id: clientData.id } });

            if (dbUser2?.openPhoneContactId) {
                console.log(`SUCCESS: Implicit User has OpenPhone ID: ${dbUser2.openPhoneContactId}`);
            } else {
                console.error("FAILURE: Implicit User created via Booking but OpenPhone ID is MISSING.");
            }
        }
      }
  }
}

runTest().catch(console.error);
