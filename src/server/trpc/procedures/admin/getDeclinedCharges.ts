import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getDeclinedCharges = baseProcedure
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
            // Payment must have failed or been canceled
            status: {
              in: ["canceled", "failed", "requires_payment_method"],
            },
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

      // Fetch payments with declined/failed status
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
          createdAt: "desc",
        },
      });

      // Filter out payments where booking didn't match search (if search was provided)
      const filteredPayments = Object.keys(bookingSearchWhere).length > 0
        ? payments.filter(p => p.booking !== null)
        : payments;

      // Apply date filters if provided (filter by booking scheduled date)
      let finalPayments = filteredPayments;
      if (input.startDate || input.endDate) {
        finalPayments = filteredPayments.filter((payment) => {
          if (!payment.booking) return false;
          const scheduledDate = new Date(payment.booking.scheduledDate);
          if (input.startDate && scheduledDate < new Date(input.startDate)) {
            return false;
          }
          if (input.endDate && scheduledDate > new Date(input.endDate)) {
            return false;
          }
          return true;
        });
      }

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
