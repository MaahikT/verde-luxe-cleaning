import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";
import { createOpenPhoneContact } from "~/server/services/openphone";
import * as fs from "fs";
import * as path from "path";

// Helper function to sanitize phone numbers (remove all non-numeric characters)
function sanitizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned || undefined;
}

export const updateUserAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      userId: z.number(),
      email: z.string().email("Invalid email address").optional(),
      password: z.string().min(6, "Password must be at least 6 characters").optional(),
      role: z.enum(["CLIENT", "CLEANER", "ADMIN", "OWNER"]).optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      temporaryPassword: z.string().optional(),
      color: z.union([
        z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (use #RRGGBB)"),
        z.null()
      ]).optional(),
      adminPermissions: z.record(z.boolean()).optional(),
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

      // Check if target user exists
      const targetUser = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User to update not found",
        });
      }

      // Check role-specific permissions based on target user's role
      const roleToCheck = input.role || targetUser.role;
      if (roleToCheck === "CLIENT" && !hasPermission(user, "manage_customers")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage customers",
        });
      }
      if (roleToCheck === "CLEANER" && !hasPermission(user, "manage_cleaners")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage cleaners",
        });
      }
      if ((roleToCheck === "ADMIN" || roleToCheck === "OWNER") && !hasPermission(user, "manage_admins")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage admins",
        });
      }

      // If email is being changed, check if new email is already in use
      if (input.email && input.email !== targetUser.email) {
        const existingUser = await db.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (input.email !== undefined) updateData.email = input.email;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.firstName !== undefined) updateData.firstName = input.firstName;
      if (input.lastName !== undefined) updateData.lastName = input.lastName;
      if (input.phone !== undefined) updateData.phone = sanitizePhone(input.phone);
      if (input.color !== undefined) updateData.color = input.color;

      // Hash password if it's being updated
      if (input.password) {
        updateData.password = await bcryptjs.hash(input.password, 10);
      }

      // Handle temporary password
      if (input.temporaryPassword !== undefined) {
        if (input.temporaryPassword === "" || input.temporaryPassword === null) {
          // Empty string means remove the temporary password
          updateData.temporaryPassword = null;
          updateData.hasResetPassword = false;
        } else if (input.temporaryPassword.length >= 6) {
          // Set the new temporary password (stored as plaintext)
          updateData.temporaryPassword = input.temporaryPassword;
          // Reset the flag since this is a new/changed temporary password
          updateData.hasResetPassword = false;
        }
      }

      // Handle admin permissions update with validation
      // Determine the target user's final role (taking into account role changes)
      const targetFinalRole = input.role !== undefined ? input.role : targetUser.role;

      if (input.adminPermissions !== undefined && (targetFinalRole === "ADMIN" || targetFinalRole === "OWNER")) {
        // Only OWNER and ADMIN can modify admin permissions
        if (user.role !== "OWNER" && user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins and owners can modify admin permissions",
          });
        }

        // ADMIN users cannot modify OWNER permissions
        if (user.role === "ADMIN" && targetFinalRole === "OWNER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admins cannot modify owner permissions",
          });
        }

        // If the current user is an ADMIN (not OWNER), validate they can only grant permissions they have
        if (user.role === "ADMIN") {
          const currentUserPermissions = user.adminPermissions as Record<string, boolean> | null;

          if (!currentUserPermissions) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have permission to grant any permissions",
            });
          }

          // Check if admin has manage_admins permission
          if (!currentUserPermissions.manage_admins) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have permission to manage admin permissions",
            });
          }

          // Validate each permission being granted
          for (const [permission, value] of Object.entries(input.adminPermissions)) {
            if (value === true && !currentUserPermissions[permission]) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: `You cannot grant the '${permission}' permission because you do not have it yourself`,
              });
            }
          }
        }

        updateData.adminPermissions = input.adminPermissions;
      }

      // Update the user
      const updatedUser = await db.user.update({
        where: { id: input.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phone: true,
          color: true,
          createdAt: true,
          openPhoneContactId: true,
        },
      });

      // OpenPhone Integration
      try {
        const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
        const logDebug = (msg: string) => {
             const ts = new Date().toISOString();
             try { fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`); } catch(e) {}
             console.log(msg);
        };

        if (updatedUser.role === "CLIENT" && updatedUser.phone && !updatedUser.openPhoneContactId) {
             logDebug(`[AdminUpdateUser] Checking OpenPhone sync for User ID: ${updatedUser.id}`);

             const openPhoneId = await createOpenPhoneContact(
               updatedUser.firstName || "",
               updatedUser.lastName || "",
               updatedUser.phone,
               updatedUser.email,
               undefined,
               "Client",
               updatedUser.id.toString()
             );

             logDebug(`[AdminUpdateUser] OpenPhone Service returned ID: ${openPhoneId}`);

             if (openPhoneId) {
               await db.user.update({
                 where: { id: updatedUser.id },
                 data: { openPhoneContactId: openPhoneId }
               });
               logDebug(`[AdminUpdateUser] User updated with OpenPhone ID.`);
             }
        }
      } catch (err) {
        const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
        try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [AdminUpdateUser] Failed to sync with OpenPhone: ${err}\n`); } catch(e) {}
        console.error("[AdminUpdateUser] Failed to sync with OpenPhone:", err);
      }

      return { user: updatedUser };
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
