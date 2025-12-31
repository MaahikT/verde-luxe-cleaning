import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getCustomerDetailsAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      userId: z.number(),
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

      // Check for manage_customers permission
      if (user.role === "ADMIN" && !hasPermission(user, "manage_customers")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view customer details",
        });
      }

      // Fetch the customer details
      const customer = await db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          temporaryPassword: true,
          hasResetPassword: true,
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Fetch all bookings for this customer (both as client and as cleaner)
      const clientBookings = await db.booking.findMany({
        where: {
          clientId: input.userId,
        },
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
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
        },
      });

      const cleanerBookings = await db.booking.findMany({
        where: {
          cleanerId: input.userId,
        },
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
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
        },
      });

      // Derive status: any booking with a past scheduled date should be treated as completed (unless cancelled)
      const now = new Date();

      const clientBookingsWithDerivedStatus = clientBookings.map((booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        if (scheduledDate < now && booking.status !== "CANCELLED") {
          return { ...booking, status: "COMPLETED" as const };
        }
        return booking;
      });

      const cleanerBookingsWithDerivedStatus = cleanerBookings.map((booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        if (scheduledDate < now && booking.status !== "CANCELLED") {
          return { ...booking, status: "COMPLETED" as const };
        }
        return booking;
      });

      // Calculate booking statistics using derived status
      const allBookingsWithDerivedStatus = [
        ...clientBookingsWithDerivedStatus,
        ...cleanerBookingsWithDerivedStatus,
      ];

      const totalBookings = allBookingsWithDerivedStatus.length;
      const completedBookings = allBookingsWithDerivedStatus.filter((b) => b.status === "COMPLETED").length;
      const cancelledBookings = allBookingsWithDerivedStatus.filter((b) => b.status === "CANCELLED").length;
      const totalSpent = clientBookingsWithDerivedStatus
        .filter((b) => b.finalPrice !== null)
        .reduce((sum, b) => sum + (b.finalPrice || 0), 0);
      const totalEarned = cleanerBookingsWithDerivedStatus
        .filter((b) => b.finalPrice !== null)
        .reduce((sum, b) => sum + (b.finalPrice || 0), 0);

      return {
        customer,
        clientBookings: clientBookingsWithDerivedStatus,
        cleanerBookings: cleanerBookingsWithDerivedStatus,
        statistics: {
          totalBookings,
          completedBookings,
          cancelledBookings,
          totalSpent,
          totalEarned,
        },
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
