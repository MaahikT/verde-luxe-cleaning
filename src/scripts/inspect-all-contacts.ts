
import { env } from "~/server/env";

async function inspectAllContacts() {
  console.log("Listing contacts to find a 'Shared' example...");

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  try {
    const response = await fetch("https://api.openphone.com/v1/contacts?maxResults=20", {
      method: "GET",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      }
    });

    console.log(`Status: ${response.status}`);
    const body = await response.json();

    if (body.data && Array.isArray(body.data)) {
        console.log(`Found ${body.data.length} contacts.`);

        // Print the first 3 contacts fully to see structure differences
        console.log("--- Contact Sample 1 ---");
        console.log(JSON.stringify(body.data[0], null, 2));

        if (body.data.length > 1) {
             console.log("--- Contact Sample 2 ---");
             console.log(JSON.stringify(body.data[1], null, 2));
        }
    } else {
        console.log("No contacts found or unexpected format.");
        console.log(JSON.stringify(body, null, 2));
    }

  } catch (err) {
    console.error(err);
  }
}

inspectAllContacts();
