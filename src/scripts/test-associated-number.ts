
import { env } from "~/server/env";

async function testAssociatedNumber() {
  const random = Math.floor(Math.random() * 9000);
  const phone = `+1555000${random}`;

  console.log(`Testing Associated Number Source (PN5tcpQkro) for: ${phone}`);

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  // Payload using the "Associated Number" logic (Source ID)
  // This matches the "VISIBLE" contact structure we saw earlier
  const payload = {
    defaultFields: {
      firstName: "ASSOCIATED",
      lastName: `NUMBER TEST ${random}`,
      phoneNumbers: [{ value: phone, name: "mobile" }],
      company: "Verification",
      role: "Test"
    },
    source: "PN5tcpQkro", // Main Company ID
    shared: true
  };

  console.log("Sending Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch("https://api.openphone.com/v1/contacts", {
      method: "POST",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`Status: ${response.status}`);
    const body = await response.json();
    console.log("Response Body:", JSON.stringify(body, null, 2));

    if (response.status === 201) {
        console.log(`SUCCESS. Created ID: ${body.data.id}`);
        console.log(`Please check OpenPhone for 'ASSOCIATED NUMBER TEST ${random}'`);
    }

  } catch (err) {
    console.error(err);
  }
}

testAssociatedNumber();
