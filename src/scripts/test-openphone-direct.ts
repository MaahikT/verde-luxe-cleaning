import { createOpenPhoneContact } from "~/server/services/openphone";
import { env } from "~/server/env";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

async function test() {
  console.log("Testing OpenPhone Service Direct Call...");

  // Debug .env loading
  const envPath = path.resolve(process.cwd(), ".env");
  console.log("Looking for .env at:", envPath);
  if (fs.existsSync(envPath)) {
      console.log(".env file exists.");
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      console.log("Keys found in .env:", Object.keys(envConfig));
      if (envConfig.OPENPHONE_API_KEY) {
          console.log("OPENPHONE_API_KEY is present in .env file.");
      } else {
          console.error("OPENPHONE_API_KEY is MISSING from .env file.");
      }
  } else {
      console.error(".env file NOT found at expected path.");
  }

  // Reload env to be sure
  dotenv.config();

  if (!process.env.OPENPHONE_API_KEY) {
      console.error("ERROR: OPENPHONE_API_KEY is still missing from process.env!");
      console.log("Current process.env keys:", Object.keys(process.env).filter(k => k.includes("API")));
      process.exit(1);
  }

  const key = process.env.OPENPHONE_API_KEY || "";
  console.log("Key analysis:");
  console.log(`- Length: ${key.length}`);
  console.log(`- Starts with "Bearer "?: ${key.startsWith("Bearer ")}`);
  console.log(`- Starts with quote?: ${key.startsWith('"') || key.startsWith("'")}`);
  console.log(`- Ends with quote?: ${key.endsWith('"') || key.endsWith("'")}`);
  console.log(`- Check first 4 chars: '${key.substring(0, 4)}***'`);
  console.log(`- Check last 4 chars: '***${key.substring(key.length - 4)}'`);

  try {
      // 1. Try a simpler GET request first to verify Auth
      // GET /v1/phone-numbers is usually a good test
      console.log("\nAttempting GET /v1/phone-numbers to verify Auth...");
      const getPNs = await fetch("https://api.openphone.com/v1/phone-numbers", {
          method: "GET",
          headers: {
              "Authorization": key.startsWith("Bearer ") ? key : `Bearer ${key}`, // Handle if user included Bearer
              "Content-Type": "application/json",
          }
      });
      console.log(`GET /v1/phone-numbers Status: ${getPNs.status}`);
      if (getPNs.status === 200) {
          console.log("Auth is working with Bearer! Issue might be with POST payload.");
      } else {
          console.log(`Auth failed on GET with Bearer (Status: ${getPNs.status}).`);

          // TRY WITHOUT BEARER
          console.log("\nAttempting GET /v1/phone-numbers WITHOUT Bearer prefix...");
          const getPNsNoBearer = await fetch("https://api.openphone.com/v1/phone-numbers", {
              method: "GET",
              headers: {
                  "Authorization": key,
                  "Content-Type": "application/json",
              }
          });
          console.log(`GET /v1/phone-numbers (No Bearer) Status: ${getPNsNoBearer.status}`);
           if (getPNsNoBearer.status === 200) {
              console.log("Auth is working WITHOUT Bearer!");
              console.log("Please update the code to remove 'Bearer ' prefix.");
          } else {
              console.log("Auth failed without Bearer as well.");
          }
      }


      // 3. Test Search Logic to prevent duplicates
      const searchPhone = "+15551234567";
      console.log(`\nTesting Search for ${searchPhone}...`);

      // Attempt 1: search param
      console.log("Attempt 1: ?search=");
      const query1 = new URLSearchParams({ search: searchPhone });
      const search1 = await fetch(`https://api.openphone.com/v1/contacts?${query1}`, {
         headers: { "Authorization": key, "Content-Type": "application/json" }
      });
      console.log(`Search 1 Status: ${search1.status}`);
      if (search1.status === 200) {
          const body = await search1.json();
          console.log(`Search 1 Results: ${body.data?.length} found.`);
          if (body.data?.length > 0) console.log("First match ID:", body.data[0].id);
      }

      // Attempt 2: phoneNumbers.value (common nested filter)
      console.log("Attempt 2: ?phoneNumbers.value=");
      // No standard query string for nested, maybe just check if search works.

      // Attempt 3: exact match filter if supported?
      // "Prisma" style filtering is rare in REST APIs.

      // 2. Try the POST contact
      const testPhone = "5551234567";
      const testName = "TestUser";

      console.log(`Calling createOpenPhoneContact for ${testName} with ${testPhone}...`);

      const result = await createOpenPhoneContact(testName, "ManualTest", testPhone, "test@example.com");

      console.log("Result:", result);

      if (result) {
          console.log("SUCCESS: Contact created with ID:", result);
      } else {
          console.log("FAILURE: Contact creation returned null.");
      }

  } catch (err) {
      console.error("CRITICAL EXCEPTION:", err);
  }
}

test();
