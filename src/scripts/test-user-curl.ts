
import { env } from "~/server/env";

async function testUserCurl() {
  const random = Math.floor(Math.random() * 9000);
  const phone = `+1555000${random}`;

  console.log(`Testing User Curl Payload for: ${phone}`);

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  // Exact payload structure from user's curl (with dynamic phone/externalId)
  const payload = {
    defaultFields: {
      firstName: "John",
      company: "OpenPhone", // User example had this
      emails: [
        {
          name: "work", // User had <string>, guessing 'work'
          value: `abc${random}@example.com`
        }
      ],
      lastName: "Doe",
      phoneNumbers: [
        {
          name: "mobile", // User had <string>, guessing 'mobile'
          value: phone
        }
      ],
      role: "Sales" // User example had this
    },
    // Skipping customFields for now as they require valid keys
    source: "public-api",
    externalId: `ext-${random}`
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
        console.log(`Please check OpenPhone for 'John Doe' (Company: OpenPhone)`);
    }

  } catch (err) {
    console.error(err);
  }
}

testUserCurl();
