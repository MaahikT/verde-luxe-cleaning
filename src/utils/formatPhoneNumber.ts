/**
 * Sanitizes a phone number by removing all non-numeric characters.
 * Returns just the digits, which can be stored in the database.
 * 
 * @param phone - The phone number to sanitize (can be in any format)
 * @returns The sanitized phone number containing only digits, or null if invalid
 * 
 * @example
 * sanitizePhoneNumber("(123) 456-7890") // "1234567890"
 * sanitizePhoneNumber("+1 (123) 456-7890") // "11234567890"
 * sanitizePhoneNumber("123-456-7890") // "1234567890"
 */
export function sanitizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Return null if empty after cleaning
  if (!cleaned) return null;
  
  return cleaned;
}

/**
 * Formats a phone number to the standard display format: +1 (123) 456-7890
 * Handles various input formats and normalizes them to the standard format.
 * 
 * @param phone - The phone number to format (can be in any format)
 * @returns The formatted phone number, or the original input if it cannot be formatted
 * 
 * @example
 * formatPhoneNumber("1234567890") // "+1 (123) 456-7890"
 * formatPhoneNumber("11234567890") // "+1 (123) 456-7890"
 * formatPhoneNumber("(123) 456-7890") // "+1 (123) 456-7890"
 * formatPhoneNumber("+1 (123) 456-7890") // "+1 (123) 456-7890"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Handle 11-digit numbers (with country code 1)
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Handle 10-digit numbers (assume US, add country code)
  if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // If we can't format it properly, return the original input
  return phone;
}
