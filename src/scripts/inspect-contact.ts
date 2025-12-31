
import { env } from "~/server/env";
const contactId = "69531378a2e52a484f784b11"; // ID from the implicit booking test (Test 3)

async function inspectContact() {
  console.log(`Inspecting Contact ID: ${contactId}`);
  try {
    const response = await fetch(`https://api.openphone.com/v1/contacts/${contactId}`, {
      method: "GET",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY!,
        "Content-Type": "application/json",
      }
    });

    console.log(`Status: ${response.status}`);
    const body = await response.json();
    console.log(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error(err);
  }
}

inspectContact();
