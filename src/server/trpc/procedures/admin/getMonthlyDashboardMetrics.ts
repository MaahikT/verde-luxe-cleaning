import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getMonthlyDashboardMetrics = baseProcedure
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
          message: "You do not have permission to view dashboard metrics",
        });
      }

      const now = new Date();

      // Calculate date ranges for this month and last month
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Get all bookings with finalPrice for revenue calculations
      const allBookings = await db.booking.findMany({
        where: {
          finalPrice: { not: null },
        },
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          finalPrice: true,
        },
      });

      // Calculate this month's revenue (completed bookings in this month)
      let thisMonthRevenue = 0;
      let thisMonthBookingsCount = 0;

      allBookings.forEach((booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        const isPast = scheduledDate < now;
        const derivedStatus = isPast && booking.status !== "CANCELLED" ? "COMPLETED" : booking.status;

        if (derivedStatus === "COMPLETED" && scheduledDate >= thisMonthStart) {
          thisMonthRevenue += booking.finalPrice || 0;
          thisMonthBookingsCount++;
        }
      });

      // Calculate last month's revenue (completed bookings in last month)
      let lastMonthRevenue = 0;
      let lastMonthBookingsCount = 0;

      allBookings.forEach((booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        const isPast = scheduledDate < now;
        const derivedStatus = isPast && booking.status !== "CANCELLED" ? "COMPLETED" : booking.status;

        if (derivedStatus === "COMPLETED" && scheduledDate >= lastMonthStart && scheduledDate <= lastMonthEnd) {
          lastMonthRevenue += booking.finalPrice || 0;
          lastMonthBookingsCount++;
        }
      });

      // Calculate percentage changes
      const revenueChange = lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      const bookingsChange = lastMonthBookingsCount > 0
        ? ((thisMonthBookingsCount - lastMonthBookingsCount) / lastMonthBookingsCount) * 100
        : 0;

      // Get revenue trends for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const completedBookingsForTrends = await db.booking.findMany({
        where: {
          status: "COMPLETED",
          finalPrice: { not: null },
          scheduledDate: { gte: sixMonthsAgo },
        },
        select: {
          scheduledDate: true,
          finalPrice: true,
        },
        orderBy: {
          scheduledDate: 'asc',
        },
      });

      // Group revenue by month
      const revenueByMonth: { [key: string]: number } = {};
      completedBookingsForTrends.forEach((booking) => {
        const date = new Date(booking.scheduledDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (booking.finalPrice || 0);
      });

      // Create array of last 6 months with revenue data
      const revenueTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        revenueTrends.push({
          month: monthName,
          monthKey,
          revenue: revenueByMonth[monthKey] || 0,
        });
      }

      // Count pending charges
      const pendingChargesCount = await db.booking.count({
        where: {
          AND: [
            {
              OR: [
                { status: "COMPLETED" },
                {
                  scheduledDate: { lt: now },
                  status: { not: "CANCELLED" },
                },
              ],
            },
            {
              payments: {
                some: {
                  isCaptured: false,
                  status: "requires_capture",
                },
              },
            },
          ],
        },
      });

      // Get upcoming jobs for today and tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 2); // End of tomorrow
      tomorrow.setHours(23, 59, 59, 999);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const upcomingJobs = await db.booking.findMany({
        where: {
          scheduledDate: {
            gte: todayStart,
            lte: tomorrow,
          },
          status: { notIn: ["CANCELLED"] },
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
              color: true,
            },
          },
        },
        orderBy: [
          { scheduledDate: 'asc' },
          { scheduledTime: 'asc' },
        ],
      });

      return {
        monthlyRevenue: {
          current: thisMonthRevenue,
          previous: lastMonthRevenue,
          changePercent: revenueChange,
        },
        monthlyBookings: {
          current: thisMonthBookingsCount,
          previous: lastMonthBookingsCount,
          changePercent: bookingsChange,
        },
        revenueTrends,
        pendingChargesCount,
        upcomingJobs,
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
