
import { env } from "~/server/env";

const makeRandomPhone = () => {
  const random = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `+1${random}`;
};

async function testSharedContact() {
  const phone = makeRandomPhone();
  console.log(`Testing shared contact creation for: ${phone}`);

  // Try top-level "shared": true
  const payload = {
    source: "PN5tcpQkro", // Main company line ID
    shared: true,
    defaultFields: {
      firstName: "TestShared",
      lastName: "Contact",
      phoneNumbers: [{ value: phone, name: "mobile" }],
    },
  };

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
    console.log(JSON.stringify(body, null, 2));

    if (response.status === 201) {
        console.log("Contact created! Check if 'shared' property is present.");
    }

  } catch (err) {
    console.error(err);
  }
}

testSharedContact();
