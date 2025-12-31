
import { env } from "~/server/env";

const COMPANY_PHONE_ID = "PN5tcpQkro"; // Main Shared Line

const makeRandomPhone = () => {
  const random = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `+1${random}`;
};

async function testInteractionFlow() {
  const phone = makeRandomPhone(); // Use a real number if possible for SMS delivery, but random for API test
  // Ideally we need a real number to receive the SMS, otherwise it might fail/bounce, but the conversation should theoretically be created.
  // Actually, OpenPhone might throw error if number invalid.
  // Let's use a "555" number? No, SMS won't send.
  // I'll used the random number and hope the "Outbound Message" object is created even if delivery fails.

  console.log(`Testing Interaction Flow for: ${phone}`);

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  // 1. Create Contact
  console.log("Creating Contact...");
  try {
    const contactPayload = {
      shared: true, // Legacy intent
      source: "PN5tcpQkro", // My best guess field
      defaultFields: {
        firstName: "TestInteraction",
        lastName: "User",
        phoneNumbers: [{ value: phone, name: "mobile" }],
      },
    };

    const contactRes = await fetch("https://api.openphone.com/v1/contacts", {
      method: "POST",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactPayload),
    });

    const contactBody = await contactRes.json();
    console.log(`Contact Created. ID: ${contactBody.data?.id}`);

    // 2. Send Message (Create Conversation)
    console.log("Sending Welcome Message...");
    const messagePayload = {
      content: "Welcome to Verde Luxe Cleaning! Your booking is confirmed.",
      from: COMPANY_PHONE_ID, // Use 'from' specific to OpenPhone SMS API
      to: [phone] // TO the new contact
    };

    const msgRes = await fetch("https://api.openphone.com/v1/messages", {
       method: "POST",
       headers: {
        "Authorization": env.OPENPHONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload)
    });

    console.log(`Message Status: ${msgRes.status}`);
    const msgBody = await msgRes.json();
    console.log("Message Response:", JSON.stringify(msgBody, null, 2));

    if (msgRes.status >= 200 && msgRes.status < 300) {
        console.log("SUCCESS: Message sent. Check the Shared Inbox for 'TestInteraction User'.");
    } else {
        console.log("FAILURE: Could not send message.");
    }

  } catch (err) {
    console.error(err);
  }
}

testInteractionFlow();
