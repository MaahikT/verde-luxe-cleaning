
import { env } from "~/server/env";

const makeRandomPhone = () => {
  const random = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `+1${random}`;
};

async function testShareUpdate() {
  const phone = makeRandomPhone();
  console.log(`Testing Creation + PATCH Share for: ${phone}`);

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  try {
    // 1. Create Contact (Private initially?)
    const payload = {
      defaultFields: {
        firstName: "TestPatch",
        lastName: "Share",
        phoneNumbers: [{ value: phone, name: "mobile" }],
      },
      // Check if source helps at creation
      source: "PN5tcpQkro"
    };

    console.log("Creating Contact...");
    const createRes = await fetch("https://api.openphone.com/v1/contacts", {
      method: "POST",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const createBody = await createRes.json();
    const contactId = createBody.data?.id;
    console.log(`Created ID: ${contactId}`);

    if (!contactId) return;

    // 2. Attempt PATCH to set shared: true
    console.log("Attempting PATCH to set shared: true...");
    const patchPayload = {
      shared: true,
      groupId: "GRG09WiO5z" // Try group ID too
    };

    const patchRes = await fetch(`https://api.openphone.com/v1/contacts/${contactId}`, {
      method: "PATCH",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchPayload)
    });

    console.log(`PATCH Status: ${patchRes.status}`);
    const patchBody = await patchRes.json();
    console.log("PATCH Response:", JSON.stringify(patchBody, null, 2));

  } catch (err) {
    console.error(err);
  }
}

testShareUpdate();
