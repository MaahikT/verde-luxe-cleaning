import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getBookingAvailability = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().date(),
      endDate: z.string().date(),
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

      // Create an inclusive end date (end of day) to ensure all bookings on the last day are included
      const endDateInclusive = new Date(input.endDate);
      endDateInclusive.setHours(23, 59, 59, 999);

      // Fetch bookings within date range with minimal fields
      const bookings = await db.booking.findMany({
        where: {
          scheduledDate: {
            gte: new Date(input.startDate),
            lte: endDateInclusive,
          },
          status: {
            not: "CANCELLED", // Exclude cancelled bookings from availability
          },
        },
        select: {
          id: true,
          scheduledDate: true,
          scheduledTime: true,
          durationHours: true,
          serviceType: true,
          cleaner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          scheduledTime: "asc",
        },
      });

      return { bookings };
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
