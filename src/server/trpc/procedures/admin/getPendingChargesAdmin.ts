import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getPendingChargesAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().date().optional(),
      endDate: z.string().date().optional(),
      searchTerm: z.string().optional(), // Search by name, email, phone, or address
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

      // Build where clause for bookings
      const now = new Date();
      const bookingWhere: any = {
        AND: [
          {
            // Only get bookings that are completed or have passed their scheduled date
            OR: [
              { status: "COMPLETED" },
              {
                scheduledDate: { lt: now },
                status: { not: "CANCELLED" },
              },
            ],
          },
          {
            // Must have at least one payment that needs to be captured
            payments: {
              some: {
                isCaptured: false,
                status: "requires_capture",
              },
            },
          },
        ],
      };

      // Apply date filters if provided
      if (input.startDate || input.endDate) {
        const EST_OFFSET = 5;
        const dateFilter: any = {};

        if (input.startDate) {
           const start = new Date(input.startDate);
           start.setUTCHours(EST_OFFSET, 0, 0, 0);
           dateFilter.gte = start;
        }

        if (input.endDate) {
           const end = new Date(input.endDate);
           end.setDate(end.getDate() + 1);
           end.setUTCHours(EST_OFFSET - 1, 59, 59, 999);
           dateFilter.lte = end;
        }

        bookingWhere.AND.push({ scheduledDate: dateFilter });
      }

      // Apply search filter if provided
      if (input.searchTerm && input.searchTerm.trim() !== "") {
        const searchTerm = input.searchTerm.trim();
        bookingWhere.AND.push({
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
        });
      }

      // Fetch bookings with pending charges
      const bookings = await db.booking.findMany({
        where: bookingWhere,
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
          payments: {
            where: {
              isCaptured: false,
              status: "requires_capture",
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
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
