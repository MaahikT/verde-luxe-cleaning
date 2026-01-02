
import { env } from "~/server/env";

const makeRandomPhone = () => {
  const random = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `+1${random}`;
};

async function testGroupContact() {
  const phone = makeRandomPhone();
  console.log(`Testing Group contact creation for: ${phone}`);

  // Hypothesis: Passing groupId might place it in the shared group
  const payload = {
    groupId: "GRG09WiO5z", // Main Group ID found from phone number
    shared: true,
    defaultFields: {
      firstName: "TestGroup",
      lastName: "Contact",
      phoneNumbers: [{ value: phone, name: "mobile" }],
    },
  };

  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch("https://api.openphone.com/v1/contacts", {
      method: "POST",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`Status: ${response.status}`);
    const body = await response.json();
    console.log(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error(err);
  }
}

testGroupContact();
