import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getRevenueReport = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().date().optional(),
      endDate: z.string().date().optional(),
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

      // Check for view_reports permission
      if (user.role === "ADMIN" && !hasPermission(user, "view_reports")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view reports",
        });
      }

      // Build date filter (with EST alignment)
      // We shift dates by 5 hours because standard inputs (YYYY-MM-DD) parse to UTC midnight.
      // UTC Midnight is 7PM EST previous day. We want 00:00 EST (which is 05:00 UTC).
      const EST_OFFSET = 5;
      const dateFilter: any = {};

      if (input.startDate) {
        const start = new Date(input.startDate);
        start.setUTCHours(EST_OFFSET, 0, 0, 0);
        dateFilter.gte = start;
      }

      if (input.endDate) {
        // End of day estimation: 23:59:59 EST = 04:59:59 UTC (Next Day)
        const end = new Date(input.endDate);
        end.setDate(end.getDate() + 1);
        end.setUTCHours(EST_OFFSET - 1, 59, 59, 999);
        dateFilter.lte = end;
      }

      // Get all bookings with finalPrice in the date range
      const bookingsWithPrice = await db.booking.findMany({
        where: {
          finalPrice: { not: null },
          ...(Object.keys(dateFilter).length > 0 ? { scheduledDate: dateFilter } : {}),
        },
        select: {
          id: true,
          finalPrice: true,
          status: true,
          scheduledDate: true,
          serviceFrequency: true,
        },
      });

      const now = new Date();

      // Initialize metrics
      let billedRevenue = 0;
      let pendingRevenue = 0;
      let recurringRevenue = 0;
      let weeklyRevenue = 0;
      let biweeklyRevenue = 0;
      let monthlyRevenue = 0;

      // Calculate all metrics
      bookingsWithPrice.forEach((booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        const isPast = scheduledDate < now;
        const derivedStatus = isPast && booking.status !== "CANCELLED" ? "COMPLETED" : booking.status;
        const price = booking.finalPrice || 0;

        // Billed revenue includes all completed bookings
        if (derivedStatus === "COMPLETED") {
          billedRevenue += price;
        }

        // Pending revenue includes future bookings (not cancelled)
        if (!isPast && booking.status !== "CANCELLED") {
          pendingRevenue += price;
        }

        // Recurring revenue includes all recurring bookings (not one-time, not cancelled)
        if (
          booking.serviceFrequency &&
          booking.serviceFrequency !== "ONE_TIME" &&
          booking.status !== "CANCELLED"
        ) {
          recurringRevenue += price;

          // Break down by frequency
          switch (booking.serviceFrequency) {
            case "WEEKLY":
              weeklyRevenue += price;
              break;
            case "BIWEEKLY":
              biweeklyRevenue += price;
              break;
            case "MONTHLY":
              monthlyRevenue += price;
              break;
          }
        }
      });

      // Total revenue is the sum of billed and pending revenue
      const totalRevenue = billedRevenue + pendingRevenue;

      return {
        totalRevenue,
        billedRevenue,
        pendingRevenue,
        recurringRevenue,
        weeklyRevenue,
        biweeklyRevenue,
        monthlyRevenue,
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
