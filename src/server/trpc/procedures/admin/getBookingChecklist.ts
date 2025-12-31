import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getBookingChecklist = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      bookingId: z.number(),
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

      // Fetch the booking to verify access
      const booking = await db.booking.findUnique({
        where: { id: input.bookingId },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      // Check authorization: admin/owner can view any, cleaner can view their own, client can view their own
      const hasAdminAccess = user.role === "OWNER" || (user.role === "ADMIN" && hasPermission(user, "manage_bookings"));
      const isCleaner = user.role === "CLEANER" && booking.cleanerId === user.id;
      const isClient = user.role === "CLIENT" && booking.clientId === user.id;

      if (!hasAdminAccess && !isCleaner && !isClient) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied.",
        });
      }

      // Fetch the checklist
      const checklist = await db.bookingChecklist.findUnique({
        where: { bookingId: input.bookingId },
        include: {
          items: {
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
      });

      return { checklist };
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
