
import { env } from "~/server/env";

const VISIBLE_ID = "695316f511811ebd5a4d4941"; // TestInteraction User (User saw this)
const INVISIBLE_ID = "6953191c11811ebd5a4d51ac"; // John Doe (User did NOT see this)

async function compareContacts() {
  console.log("Comparing Visible vs Invisible Contacts...");

  if (!env.OPENPHONE_API_KEY) {
    console.error("OPENPHONE_API_KEY not set");
    return;
  }

  const fetchContact = async (id: string, label: string) => {
    try {
        const response = await fetch(`https://api.openphone.com/v1/contacts/${id}`, {
        method: "GET",
        headers: {
            "Authorization": env.OPENPHONE_API_KEY,
            "Content-Type": "application/json",
        }
        });
        const body = await response.json();
        console.log(`\n--- ${label} (${id}) ---`);
        console.log(JSON.stringify(body, null, 2));
        return body;
    } catch(e) { console.error(e); }
  };

  await fetchContact(VISIBLE_ID, "VISIBLE (Interaction)");
  await fetchContact(INVISIBLE_ID, "INVISIBLE (Curl)");
}

compareContacts();
