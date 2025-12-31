import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";
import { formatTime12Hour, formatDurationHours } from "~/utils/formatTime";

export const getCleanerAvailabilityDetails = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      scheduledDate: z.string(), // Date in YYYY-MM-DD format
      scheduledTime: z.string(), // Time in HH:MM format
      durationHours: z.number().positive().optional(),
      excludeBookingId: z.number().optional(), // When editing a booking, exclude it from conflict check
    })
  )
  .query(async ({ input }) => {
    try {
      // Verify and decode JWT token
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Fetch user from database
      const user = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if user is an admin or owner
      if (user.role !== "ADMIN" && user.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        });
      }

      // Check for manage_cleaners permission
      if (user.role === "ADMIN" && !hasPermission(user, "manage_cleaners")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view cleaner availability",
        });
      }

      // Fetch all cleaners
      const cleaners = await db.user.findMany({
        where: { role: "CLEANER" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          color: true,
        },
        orderBy: [
          { firstName: "asc" },
          { lastName: "asc" },
        ],
      });

      // If no date/time provided, return cleaners without availability check
      if (!input.scheduledDate || !input.scheduledTime) {
        return {
          cleaners: cleaners.map((cleaner) => ({
            ...cleaner,
            isAvailable: true,
            conflictType: null,
            conflictDetails: null,
          })),
        };
      }

      // Calculate booking time window using UTC to match time-off request storage
      const [hours, minutes] = input.scheduledTime.split(":").map(Number);

      // Parse the date string as YYYY-MM-DD and construct a UTC Date
      const dateParts = input.scheduledDate.split("-");
      if (dateParts.length !== 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid date format. Expected YYYY-MM-DD",
        });
      }

      const year = Number(dateParts[0]);
      const month = Number(dateParts[1]);
      const day = Number(dateParts[2]);

      const bookingStart = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

      const bookingEnd = new Date(bookingStart);
      if (input.durationHours) {
        bookingEnd.setUTCHours(bookingEnd.getUTCHours() + Math.floor(input.durationHours));
        bookingEnd.setUTCMinutes(bookingEnd.getUTCMinutes() + Math.round((input.durationHours % 1) * 60));
      } else {
        // Default to 2 hours if no duration specified
        bookingEnd.setUTCHours(bookingEnd.getUTCHours() + 2);
      }

      // Check availability for each cleaner
      const cleanersWithAvailability = await Promise.all(
        cleaners.map(async (cleaner) => {
          // Check for existing booking conflicts
          const conflictingBookings = await db.booking.findMany({
            where: {
              cleanerId: cleaner.id,
              id: input.excludeBookingId ? { not: input.excludeBookingId } : undefined,
              status: {
                notIn: ["CANCELLED"],
              },
              scheduledDate: {
                gte: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
                lt: new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0)),
              },
            },
            select: {
              id: true,
              scheduledTime: true,
              durationHours: true,
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          });

          // Check if any booking overlaps with our time window
          let bookingConflict = null;
          for (const booking of conflictingBookings) {
            const [existingHours, existingMinutes] = booking.scheduledTime.split(":").map(Number);
            const existingStart = new Date(Date.UTC(year, month - 1, day, existingHours, existingMinutes, 0, 0));

            const existingEnd = new Date(existingStart);
            if (booking.durationHours) {
              existingEnd.setUTCHours(existingEnd.getUTCHours() + Math.floor(booking.durationHours));
              existingEnd.setUTCMinutes(existingEnd.getUTCMinutes() + Math.round((booking.durationHours % 1) * 60));
            } else {
              existingEnd.setUTCHours(existingEnd.getUTCHours() + 2);
            }

            // Check for overlap: (start1 < end2) && (end1 > start2)
            if (bookingStart < existingEnd && bookingEnd > existingStart) {
              bookingConflict = {
                bookingId: booking.id,
                clientName: `${booking.client.firstName} ${booking.client.lastName}`,
                time: booking.scheduledTime,
                duration: booking.durationHours || 2,
              };
              break;
            }
          }

          // Check for time-off conflicts
          // Note: Time-off dates are now stored with T12:00:00.000Z timestamps as inclusive dates
          // - startDate: the first day of time off at noon
          // - endDate: the last day of time off at noon (inclusive)
          // We need to compare dates only (ignoring times) for proper conflict detection
          const timeOffConflicts = await db.timeOffRequest.findMany({
            where: {
              cleanerId: cleaner.id,
              status: "APPROVED",
              // For date-only comparison, we check if the booking date falls within the time-off period
              AND: [
                {
                  // Time-off starts before the end of the booking day
                  startDate: {
                    lt: new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0)),
                  },
                },
                {
                  // Time-off ends on or after the start of the booking day (inclusive check)
                  endDate: {
                    gte: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
                  },
                },
              ],
            },
            select: {
              id: true,
              startDate: true,
              endDate: true,
              reason: true,
            },
          });

          const timeOffConflict = timeOffConflicts.length > 0 ? timeOffConflicts[0] : null;

          // Determine availability status
          let isAvailable = true;
          let conflictType: "BOOKED" | "TIME_OFF" | null = null;
          let conflictDetails: string | null = null;

          if (bookingConflict) {
            isAvailable = false;
            conflictType = "BOOKED";
            conflictDetails = `Already booked: ${bookingConflict.clientName} at ${formatTime12Hour(bookingConflict.time)} (${formatDurationHours(bookingConflict.duration)})`;
          } else if (timeOffConflict) {
            isAvailable = false;
            conflictType = "TIME_OFF";
            // Display the inclusive date range (both dates are now stored inclusively)
            const startDate = new Date(timeOffConflict.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endDate = new Date(timeOffConflict.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            conflictDetails = `Time off: ${startDate} - ${endDate}${timeOffConflict.reason ? ` (${timeOffConflict.reason})` : ''}`;
          }

          return {
            ...cleaner,
            isAvailable,
            conflictType,
            conflictDetails,
          };
        })
      );

      return {
        cleaners: cleanersWithAvailability,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
