
import { env } from "~/server/env";

const targetPhone = "+17348920931";

async function getPhoneDetails() {
  console.log(`Looking up phone number: ${targetPhone}`);

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  try {
      // Endpoint to list/search phone numbers associated with the org
      const response = await fetch("https://api.openphone.com/v1/phone-numbers", {
        method: "GET",
        headers: {
          "Authorization": env.OPENPHONE_API_KEY,
          "Content-Type": "application/json",
        }
      });

      console.log(`Status: ${response.status}`);
      if (response.status === 200) {
        const body = await response.json();
        const data = body.data;
        // console.log("All Numbers:", JSON.stringify(data, null, 2));

        const match = data.find((p: any) => p.number === targetPhone || p.number === targetPhone.replace("+1", ""));

        if (match) {
            console.log("FOUND matching phone number object:");
            console.log(JSON.stringify(match, null, 2));
        } else {
            console.log("No exact match found in this org's phone numbers.");
            console.log("Available numbers:", data.map((p: any) => p.number).join(", "));
        }
      } else {
        console.error("Failed to fetch phone numbers.");
      }

  } catch (err) {
    console.error(err);
  }
}

getPhoneDetails();
