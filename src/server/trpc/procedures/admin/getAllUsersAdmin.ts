import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getAllUsersAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      role: z.enum(["CLIENT", "CLEANER", "ADMIN", "OWNER"]).optional(),
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

      // Build where clause based on role filter
      const where: any = {};
      if (input.role) {
        where.role = input.role;

        // Check role-specific permissions
        if (input.role === "CLIENT" && !hasPermission(user, "manage_customers")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to manage customers",
          });
        }
        if (input.role === "CLEANER" && !hasPermission(user, "manage_cleaners")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to manage cleaners",
          });
        }
        if ((input.role === "ADMIN" || input.role === "OWNER") && !hasPermission(user, "manage_admins")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to manage admins",
          });
        }
      } else {
        // If no role filter, user must have at least one management permission
        if (!hasPermission(user, "manage_customers") &&
            !hasPermission(user, "manage_cleaners") &&
            !hasPermission(user, "manage_admins")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to manage users",
          });
        }
      }

      // Fetch all users
      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phone: true,
          color: true,
          createdAt: true,
          temporaryPassword: true,
          hasResetPassword: true,
          adminPermissions: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return { users };
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
