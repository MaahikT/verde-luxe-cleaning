
import { env } from "~/server/env";

const contactId = "695315a428cdfc2ceeca1c3f"; // The ID from the "successful" test-shared-contact run

async function checkContactAndUser() {
  console.log("Checking API Key Owner and Contact Visibility...");

  if (!env.OPENPHONE_API_KEY) {
      console.error("No API Key");
      return;
  }

  // 1. Check current user (who owns the key?)
  try {
      // Trying a common endpoint to identify the user.
      // OpenPhone API docs might not have /users/me publicly documented but worth a try,
      // or we just rely on contact createdByUserId.
      // Actually, let's just inspect the contact we created.
  } catch (e) {}

  // 2. Fetch the contact
  try {
    console.log(`Fetching Contact ${contactId}...`);
    const response = await fetch(`https://api.openphone.com/v1/contacts/${contactId}`, {
      method: "GET",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      }
    });

    console.log(`Contact Status: ${response.status}`);
    if (response.status === 200) {
        const body = await response.json();
        console.log("Contact Data:", JSON.stringify(body, null, 2));
        console.log(`Created By User ID: ${body.data.createdByUserId}`);
    } else {
        console.error("Failed to fetch contact. It might be deleted or inaccessible.");
    }
  } catch (err) {
    console.error("Error fetching contact:", err);
  }
}

checkContactAndUser();
