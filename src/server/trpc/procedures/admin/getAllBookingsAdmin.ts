import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getAllBookingsAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().date().optional(),
      endDate: z.string().date().optional(),
      clientId: z.number().optional(),
      cleanerId: z.number().optional(),
      status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
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

      // Check if user has the required permission
      if (!hasPermission(user, "manage_bookings")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage bookings",
        });
      }

      // Build where clause based on filters
      const where: any = {};

      if (input.startDate) {
        where.scheduledDate = {
          ...where.scheduledDate,
          gte: new Date(input.startDate),
        };
      }

      if (input.endDate) {
        where.scheduledDate = {
          ...where.scheduledDate,
          lte: new Date(input.endDate),
        };
      }

      if (input.clientId) {
        where.clientId = input.clientId;
      }

      if (input.cleanerId) {
        where.cleanerId = input.cleanerId;
      }

      if (input.status) {
        where.status = input.status;
      }

      // Fetch all bookings with filters
      const bookings = await db.booking.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
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
                select: {
                  id: true,
                  isCompleted: true,
                  completedAt: true,
                  completedBy: true,
                },
                orderBy: {
                  order: "asc",
                },
              },
              template: {
                select: {
                  name: true,
                  serviceType: true,
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

        // If the booking is in the past and not cancelled, treat it as completed
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
