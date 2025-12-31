
import { env } from "~/server/env";

async function inspectConversations() {
  console.log("Listing conversations...");

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  try {
    const response = await fetch("https://api.openphone.com/v1/conversations?maxResults=5", {
      method: "GET",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      }
    });

    console.log(`Status: ${response.status}`);
    const body = await response.json();

    if (body.data && Array.isArray(body.data)) {
        console.log(`Found ${body.data.length} conversations.`);
        if (body.data.length > 0) {
            console.log("--- Conversation Sample ---");
            console.log(JSON.stringify(body.data[0], null, 2));
        }
    } else {
        console.log("No conversations found.");
    }

  } catch (err) {
    console.error(err);
  }
}

inspectConversations();
