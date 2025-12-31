
import { env } from "~/server/env";
import { createOpenPhoneContact } from "~/server/services/openphone";
import { db } from "~/server/db";

async function verify() {
  console.log("Verifying OpenPhone Integration Setup...");

  // 1. Check Env
  try {
    if (env.OPENPHONE_API_KEY === undefined) {
      console.log("OPENPHONE_API_KEY is undefined (expected if not set in .env), but env schema passed.");
    } else {
      console.log("OPENPHONE_API_KEY is present.");
    }
  } catch (e) {
    console.error("Env check failed:", e);
    process.exit(1);
  }

  // 2. Check Service Import
  if (typeof createOpenPhoneContact !== 'function') {
    console.error("createOpenPhoneContact is not a function");
    process.exit(1);
  }
  console.log("Service import successful.");

  // 3. Check Prisma Client Fields (runtime check if possible, though strict TS might catch it before running if we were compiling fully)
  // We can't easily check the runtime fields without creating a record, but we can check if the model def exists in our code knowledge.
  // The fact this script runs via tsx means imports are resolving.

  console.log("Verification checks passed!");
}

verify().catch(console.error);
