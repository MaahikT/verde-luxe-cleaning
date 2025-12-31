
import { env } from "~/server/env";

const debugOpenPhoneCreation = async () => {
  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  const phone = `+1555555${randomSuffix}`;
  const payload = {
    shared: true,
    defaultFields: {
      firstName: "TestShared",
      lastName: `Debug${randomSuffix}`,
      phoneNumbers: [{ value: phone, name: "mobile" }],
    },
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

    console.log(`Response Status: ${response.status}`);
    const body = await response.json();
    console.log("Response Body:", JSON.stringify(body, null, 2));

    if (body.data && body.data.shared) {
        console.log("SUCCESS: 'shared' property IS true in response.");
    } else {
        console.log("FAILURE: 'shared' property is missing or false in response.");
    }

  } catch (error) {
    console.error("Error:", error);
  }
};

debugOpenPhoneCreation();
