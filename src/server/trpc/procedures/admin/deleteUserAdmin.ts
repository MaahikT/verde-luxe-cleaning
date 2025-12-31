import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const deleteUserAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      userId: z.number(),
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

      // Check if user is an admin or owner
      if (user.role !== "ADMIN" && user.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        });
      }

      // Prevent admin from deleting themselves
      if (parsed.userId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      // Check if target user exists
      const targetUser = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User to delete not found",
        });
      }

      // Check role-specific permissions
      if (targetUser.role === "CLIENT" && !hasPermission(user, "manage_customers")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete customers",
        });
      }
      if (targetUser.role === "CLEANER" && !hasPermission(user, "manage_cleaners")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete cleaners",
        });
      }
      if ((targetUser.role === "ADMIN" || targetUser.role === "OWNER") && !hasPermission(user, "manage_admins")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete admins",
        });
      }

      // Delete the user
      await db.user.delete({
        where: { id: input.userId },
      });

      return { success: true };
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
