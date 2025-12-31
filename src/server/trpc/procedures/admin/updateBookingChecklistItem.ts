import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const updateBookingChecklistItem = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      itemId: z.number(),
      isCompleted: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
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

      // Fetch the checklist item with booking info
      const item = await db.bookingChecklistItem.findUnique({
        where: { id: input.itemId },
        include: {
          checklist: {
            include: {
              booking: true,
            },
          },
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checklist item not found",
        });
      }

      // Check authorization: admin/owner can update any, cleaner can update their own bookings
      const hasAdminAccess = user.role === "OWNER" || (user.role === "ADMIN" && hasPermission(user, "manage_bookings"));
      const isCleaner = user.role === "CLEANER" && item.checklist.booking.cleanerId === user.id;

      if (!hasAdminAccess && !isCleaner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied.",
        });
      }

      // Update the item
      const updatedItem = await db.bookingChecklistItem.update({
        where: { id: input.itemId },
        data: {
          isCompleted: input.isCompleted,
          completedAt: input.isCompleted ? new Date() : null,
          completedBy: input.isCompleted ? user.id : null,
        },
      });

      return { item: updatedItem };
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
