import { db } from "~/server/db";
import { type Booking } from "@prisma/client";

export enum RecurrenceFrequency {
  WEEKLY = "WEEKLY",
  BIWEEKLY = "BIWEEKLY",
  MONTHLY = "MONTHLY",
  ONE_TIME = "ONE_TIME"
}

export async function generateFutureBookings(
  originalBooking: Booking,
  frequency: string
) {
  if (frequency === RecurrenceFrequency.ONE_TIME) return;

  const startDate = new Date(originalBooking.scheduledDate);
  const futureBookings = [];

  // Calculate end date (12 months from now)
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 12);

  let nextDate = new Date(startDate);

  // Skip the first date as it's the original booking
  nextDate = incrementDate(nextDate, frequency);

  while (nextDate <= endDate) {
    // Clone booking data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, isGenerated, ...bookingData } = originalBooking as any;

    // Use specific fields we want to copy
    const newBookingData = {
      clientId: originalBooking.clientId,
      cleanerId: originalBooking.cleanerId,
      serviceType: originalBooking.serviceType,
      scheduledDate: new Date(nextDate),
      scheduledTime: originalBooking.scheduledTime,
      durationHours: originalBooking.durationHours,
      address: originalBooking.address,
      specialInstructions: originalBooking.specialInstructions,
      finalPrice: originalBooking.finalPrice,
      status: "PENDING" as const, // Default to PENDING for future bookings
      serviceFrequency: frequency as any,
      houseSquareFootage: originalBooking.houseSquareFootage,
      basementSquareFootage: originalBooking.basementSquareFootage,
      numberOfBedrooms: originalBooking.numberOfBedrooms,
      numberOfBathrooms: originalBooking.numberOfBathrooms,
      numberOfCleanersRequested: originalBooking.numberOfCleanersRequested,
      cleanerPaymentAmount: originalBooking.cleanerPaymentAmount,
      paymentMethod: originalBooking.paymentMethod,
      paymentDetails: originalBooking.paymentDetails, // You might want to strip specific transaction IDs if they were one-time
      selectedExtras: originalBooking.selectedExtras ?? undefined,
    };

    futureBookings.push(newBookingData);

    // Create the booking in DB
    try {
        await db.booking.create({
            data: newBookingData
        });
    } catch (e) {
        console.error(`Failed to generate recurring booking for ${nextDate.toISOString()}:`, e);
    }

    nextDate = incrementDate(nextDate, frequency);
  }

  return futureBookings;
}

function incrementDate(date: Date, frequency: string): Date {
  const newDate = new Date(date);
  switch (frequency) {
    case RecurrenceFrequency.WEEKLY:
      newDate.setDate(newDate.getDate() + 7);
      break;
    case RecurrenceFrequency.BIWEEKLY:
      newDate.setDate(newDate.getDate() + 14);
      break;
    case RecurrenceFrequency.MONTHLY:
      newDate.setMonth(newDate.getMonth() + 1);
      break;
  }
  return newDate;
}
