
import { env } from "../env";
import * as fs from "fs";
import * as path from "path";

const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");

function logDebug(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (e) {
    console.error("Failed to write to debug log:", e);
  }
  console.log(message); // Keep console log as well
}

interface OpenPhoneContact {
  id: string;
  defaultFields: {
    firstName?: string;
    lastName?: string;
    phoneNumbers?: { value: string; name: string }[];
    emails?: { value: string; name: string }[];
  };
}

export const createOpenPhoneContact = async (
  firstName: string,
  lastName: string,
  phone: string,
  email?: string,
  company?: string,
  role?: string,
  externalId?: string
): Promise<string | null> => {
  if (!env.OPENPHONE_API_KEY) {
    logDebug("OPENPHONE_API_KEY not set, skipping contact creation");
    return null;
  }

  try {
    // Ensure phone is E.164 formatted
    const digits = phone.replace(/\D/g, "");
    let formattedPhone = "";
    if (digits.length === 10) {
        formattedPhone = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
        formattedPhone = `+${digits}`;
    } else {
        formattedPhone = `+${digits}`;
    }

    const payload = {
      defaultFields: {
        firstName,
        lastName,
        phoneNumbers: [{ value: formattedPhone, name: "mobile" }],
        emails: email ? [{ value: email, name: "personal" }] : undefined,
        company: company || undefined,
        role: role || undefined,
      },
      source: "PN5tcpQkro", // Explicitly associate with the Main Company Number
      shared: true, // Attempt to toggle sharing
      externalId: externalId || undefined
    };

    logDebug(`[OpenPhone] Attempting to create contact. Name: ${firstName} ${lastName}, Phone: ${formattedPhone} (Original: ${phone})`);

    // 1. Check for duplicates using Search
    try {
        const query = new URLSearchParams({ search: formattedPhone });
        const existingReq = await fetch(`https://api.openphone.com/v1/contacts?${query}`, {
            method: "GET",
            headers: {
                "Authorization": env.OPENPHONE_API_KEY,
                "Content-Type": "application/json",
            }
        });

        if (existingReq.status === 200) {
            const body = await existingReq.json();
            if (body.data && Array.isArray(body.data)) {
                 // OpenPhone search is fuzzy/broad. We MUST verify the phone number matches exactly.
                 const exactMatch = body.data.find((contact: any) =>
                     contact.defaultFields?.phoneNumbers?.some((p: any) => p.value === formattedPhone)
                 );

                 if (exactMatch) {
                     logDebug(`[OpenPhone] Found existing contact via search. ID: ${exactMatch.id}`);
                     return exactMatch.id;
                 } else {
                     logDebug(`[OpenPhone] Search returned ${body.data.length} results, but none matched ${formattedPhone} exactly.`);
                 }
            }
        }
    } catch (searchErr) {
        logDebug(`[OpenPhone] Warning: Duplicate check failed, proceeding to create. ${searchErr}`);
    }

    // 2. Create if not found
    const response = await fetch("https://api.openphone.com/v1/contacts", {
      method: "POST",
      headers: {
        "Authorization": env.OPENPHONE_API_KEY, // No Bearer prefix based on verification
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();
    logDebug(`[OpenPhone] Response Status: ${response.status}`);

    if (response.status !== 201) {
       logDebug(`[OpenPhone] Error Response Body: ${JSON.stringify(responseBody, null, 2)}`);
    } else {
       logDebug(`[OpenPhone] Success! Contact ID: ${responseBody.data?.id}`);
    }

    if (response.status === 201 && responseBody.data?.id) {
      return responseBody.data.id;
    } else if (response.status === 409) {
        logDebug("[OpenPhone] Contact creation conflict (likely duplicate).");
        return null;
    } else {
      logDebug("[OpenPhone] Failed to create contact.");
      return null;
    }

  } catch (error) {
    logDebug(`[OpenPhone] Exception during API call: ${error}`);
    return null;
  }
};
