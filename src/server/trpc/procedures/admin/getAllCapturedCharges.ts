import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getAllCapturedCharges = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().date().optional(),
      endDate: z.string().date().optional(),
      searchTerm: z.string().optional(),
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
          message: "You do not have permission to view charges",
        });
      }

      // Build where clause for payments
      const paymentWhere: any = {
        AND: [
          {
            isCaptured: true,
            status: "succeeded",
          },
        ],
      };

      // Build booking search filter if provided
      let bookingSearchWhere: any = {};
      if (input.searchTerm && input.searchTerm.trim() !== "") {
        const searchTerm = input.searchTerm.trim();
        bookingSearchWhere = {
          OR: [
            {
              client: {
                OR: [
                  { firstName: { contains: searchTerm, mode: "insensitive" } },
                  { lastName: { contains: searchTerm, mode: "insensitive" } },
                  { email: { contains: searchTerm, mode: "insensitive" } },
                  { phone: { contains: searchTerm, mode: "insensitive" } },
                ],
              },
            },
            { address: { contains: searchTerm, mode: "insensitive" } },
          ],
        };
      }

      if (Object.keys(bookingSearchWhere).length > 0) {
         paymentWhere.AND.push({ booking: bookingSearchWhere });
      }

      // Fetch all captured payments
      const payments = await db.payment.findMany({
        where: paymentWhere,
        include: {
          booking: {
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
          },
        },
        orderBy: {
          paidAt: "desc",
        },
      });

      // Filter out payments where booking didn't match search (if search was provided)
      const filteredPayments = Object.keys(bookingSearchWhere).length > 0
        ? payments.filter(p => p.booking !== null)
        : payments;

      // Apply date filters to identify RELEVANT bookings
      let relevantBookingIds = new Set<number>();

      const EST_OFFSET = 5;
      let startBoundary: Date | undefined;
      let endBoundary: Date | undefined;

      if (input.startDate) {
        startBoundary = new Date(input.startDate);
        startBoundary.setUTCHours(EST_OFFSET, 0, 0, 0);
      }
      if (input.endDate) {
        endBoundary = new Date(input.endDate);
        endBoundary.setDate(endBoundary.getDate() + 1);
        endBoundary.setUTCHours(EST_OFFSET - 1, 59, 59, 999);
      }

      // If no date filter, all bookings in filteredPayments are relevant
      if (!input.startDate && !input.endDate) {
         return { payments: filteredPayments };
      }

      // Find bookings that have activity within the date range
      filteredPayments.forEach((payment) => {
          if (!payment.bookingId) return;
          if (!payment.paidAt) return;

          const paidDate = new Date(payment.paidAt);
          if (startBoundary && paidDate < startBoundary) return;
          if (endBoundary && paidDate > endBoundary) return;

          relevantBookingIds.add(payment.bookingId);
      });

      // Return ALL payments for those bookings (to ensure Net Amount and History are correct)
      const finalPayments = payments.filter(p => relevantBookingIds.has(p.bookingId));

      return { payments: finalPayments };
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
