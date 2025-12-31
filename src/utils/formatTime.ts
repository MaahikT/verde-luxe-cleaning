/**
 * Converts a time string to 12-hour format with AM/PM suffix
 * Handles various input formats:
 * - 24-hour format: "14:30", "09:00", "23:45"
 * - Already formatted: "2:00 PM", "10:30 AM"
 * - With seconds: "14:30:00"
 * 
 * @param timeString - The time string to format
 * @returns Formatted time string in 12-hour format with AM/PM (e.g., "2:30 PM", "9:00 AM")
 */
export function formatTime12Hour(timeString: string): string {
  // Handle empty/null/undefined input
  if (!timeString || typeof timeString !== 'string') {
    return "";
  }
  
  // Trim whitespace
  const trimmedTime = timeString.trim();
  
  // If already contains AM/PM (case-insensitive), return as-is
  const upperTime = trimmedTime.toUpperCase();
  if (upperTime.includes("AM") || upperTime.includes("PM")) {
    return trimmedTime;
  }
  
  // Parse the time string (handle formats like "14:30" or "14:30:00")
  const timeParts = trimmedTime.split(":");
  
  // Validate we have at least hours and minutes
  if (timeParts.length < 2) {
    return trimmedTime; // Return original if invalid format
  }
  
  // Parse hours and minutes
  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1] || "00";
  
  // Validate parsed values
  if (isNaN(hours) || hours < 0 || hours > 23) {
    return trimmedTime; // Return original if invalid hours
  }
  
  // Determine AM/PM period
  const period = hours >= 12 ? "PM" : "AM";
  
  // Convert to 12-hour format
  if (hours === 0) {
    // Midnight: 00:xx becomes 12:xx AM
    hours = 12;
  } else if (hours > 12) {
    // Afternoon/Evening: 13-23 becomes 1-11 PM
    hours = hours - 12;
  }
  // Note: 12:xx stays as 12:xx PM (noon hour)
  // Note: 1-11 stay as 1-11 AM (morning hours)
  
  // Format minutes with leading zero if needed
  const formattedMinutes = minutes.padStart(2, "0");
  
  return `${hours}:${formattedMinutes} ${period}`;
}

/**
 * Converts decimal hours to a human-readable duration format
 * Examples:
 * - 1.5 → "1 hr 30 min"
 * - 2.0 → "2 hr"
 * - 0.5 → "30 min"
 * - 2.033333 → "2 hr 2 min"
 * 
 * @param duration - Duration in decimal hours (e.g., 1.5 for 1 hour 30 minutes)
 * @returns Formatted duration string (e.g., "1 hr 30 min")
 */
export function formatDurationHours(duration: number | null | undefined): string {
  // Handle null/undefined/invalid input
  if (!duration || duration <= 0 || isNaN(duration)) {
    return "0 min";
  }
  
  // Extract hours and minutes
  const hours = Math.floor(duration);
  const minutes = Math.round((duration - hours) * 60);
  
  // Build the formatted string
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours} hr`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }
  
  // If we have no parts (shouldn't happen due to initial check, but safety)
  if (parts.length === 0) {
    return "0 min";
  }
  
  return parts.join(" ");
}
