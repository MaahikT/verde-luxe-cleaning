import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getBookingStatsAdmin = baseProcedure
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

      // Check for manage_bookings permission
      if (user.role === "ADMIN" && !hasPermission(user, "manage_bookings")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage bookings",
        });
      }

      // Get total bookings count
      const totalBookings = await db.booking.count();

      // Get all bookings to calculate derived status
      const allBookings = await db.booking.findMany({
        select: {
          id: true,
          status: true,
          scheduledDate: true,
        },
      });

      const now = new Date();

      // Calculate counts with derived status
      let pendingCount = 0;
      let confirmedCount = 0;
      let inProgressCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;

      allBookings.forEach((booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        const isPast = scheduledDate < now;

        // Derive status: past bookings are completed unless cancelled
        const derivedStatus = isPast && booking.status !== "CANCELLED" ? "COMPLETED" : booking.status;

        switch (derivedStatus) {
          case "PENDING":
            pendingCount++;
            break;
          case "CONFIRMED":
            confirmedCount++;
            break;
          case "IN_PROGRESS":
            inProgressCount++;
            break;
          case "COMPLETED":
            completedCount++;
            break;
          case "CANCELLED":
            cancelledCount++;
            break;
        }
      });

      // Get total clients and cleaners
      const totalClients = await db.user.count({ where: { role: "CLIENT" } });
      const totalCleaners = await db.user.count({ where: { role: "CLEANER" } });

      // Get active cleaners (cleaners with bookings in last 30 days or upcoming bookings)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeCleanersData = await db.booking.findMany({
        where: {
          cleanerId: { not: null },
          OR: [
            { scheduledDate: { gte: thirtyDaysAgo } },
            { scheduledDate: { gte: new Date() } },
          ],
        },
        select: {
          cleanerId: true,
        },
        distinct: ['cleanerId'],
      });

      const activeCleaners = activeCleanersData.length;

      // Get revenue metrics - only use finalPrice for all revenue calculations
      const bookingsWithFinalPrice = await db.booking.findMany({
        where: {
          finalPrice: { not: null },
        },
        select: {
          finalPrice: true,
          status: true,
          scheduledDate: true,
        },
      });

      const totalRevenue = bookingsWithFinalPrice
        .filter((booking) => {
          const scheduledDate = new Date(booking.scheduledDate);
          const isPast = scheduledDate < now;
          const derivedStatus = isPast && booking.status !== "CANCELLED" ? "COMPLETED" : booking.status;
          return derivedStatus === "COMPLETED";
        })
        .reduce((sum, booking) => sum + (booking.finalPrice || 0), 0);

      // Pending revenue only counts future bookings with finalPrice set (not past bookings)
      const pendingRevenue = bookingsWithFinalPrice
        .filter((booking) => {
          const scheduledDate = new Date(booking.scheduledDate);
          const isPast = scheduledDate < now;
          const derivedStatus = isPast && booking.status !== "CANCELLED" ? "COMPLETED" : booking.status;
          return derivedStatus === "PENDING" || derivedStatus === "CONFIRMED" || derivedStatus === "IN_PROGRESS";
        })
        .reduce((sum, booking) => sum + (booking.finalPrice || 0), 0);

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

      // Get upcoming appointments (next 10) - only future bookings
      const upcomingAppointments = await db.booking.findMany({
        where: {
          scheduledDate: { gte: now },
          status: { notIn: ["CANCELLED", "COMPLETED"] },
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
          scheduledDate: 'asc',
        },
        take: 10,
      });

      // Get bookings without assigned cleaners
      const unassignedBookings = await db.booking.count({
        where: {
          cleanerId: null,
          status: { not: "CANCELLED" },
        },
      });

      return {
        totalBookings,
        bookingsByStatus: {
          pending: pendingCount,
          confirmed: confirmedCount,
          inProgress: inProgressCount,
          completed: completedCount,
          cancelled: cancelledCount,
        },
        totalClients,
        totalCleaners,
        activeCleaners,
        revenue: {
          total: totalRevenue,
          pending: pendingRevenue,
        },
        revenueTrends,
        upcomingAppointments,
        unassignedBookings,
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
