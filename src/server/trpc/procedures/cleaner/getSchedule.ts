import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getSchedule = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      // Verify and decode JWT token
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Fetch user and verify role
      const user = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.role !== "CLEANER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only cleaners can access schedules",
        });
      }

      // Fetch bookings assigned to this cleaner
      const bookings = await db.booking.findMany({
        where: {
          cleanerId: user.id,
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          cleaner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              color: true,
            },
          },
          checklist: {
            include: {
              items: {
                orderBy: {
                  order: "asc",
                },
              },
              template: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          scheduledDate: "asc",
        },
      });

      // Derive status: any booking with a past scheduled date should be treated as completed (unless cancelled)
      const now = new Date();
      const bookingsWithDerivedStatus = bookings.map((booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        
        if (scheduledDate < now && booking.status !== "CANCELLED") {
          return {
            ...booking,
            status: "COMPLETED" as const,
          };
        }
        
        return booking;
      });

      return { bookings: bookingsWithDerivedStatus };
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
