
import { env } from "~/server/env";

async function testSearch(phone: string) {
  console.log(`Searching for phone: ${phone}`);
  try {
    const query = new URLSearchParams({ search: phone });
    const response = await fetch(`https://api.openphone.com/v1/contacts?${query}`, {
      method: "GET",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY,
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

testSearch("+17342335342");
