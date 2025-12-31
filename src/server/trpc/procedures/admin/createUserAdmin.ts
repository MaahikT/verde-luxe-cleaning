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

function generateTemporaryPassword(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const createUserAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      email: z.string().email("Invalid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      role: z.enum(["CLIENT", "CLEANER", "ADMIN", "OWNER"]),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      color: z.union([
        z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (use #RRGGBB)"),
        z.null()
      ]).optional(),
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

      // Check role-specific permissions
      if (input.role === "CLIENT" && !hasPermission(user, "manage_customers")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create customers",
        });
      }
      if (input.role === "CLEANER" && !hasPermission(user, "manage_cleaners")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create cleaners",
        });
      }
      if ((input.role === "ADMIN" || input.role === "OWNER") && !hasPermission(user, "manage_admins")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create admins",
        });
      }

      // Check if email already exists
      const existingUser = await db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already in use",
        });
      }

      // Hash the password
      const hashedPassword = await bcryptjs.hash(input.password, 10);

      // Generate temporary password for CLIENT users
      const temporaryPassword = input.role === "CLIENT" ? generateTemporaryPassword(8) : null;

      // Set admin permissions based on role
      let adminPermissions = undefined;
      if (input.role === "ADMIN") {
        // New admins start with no permissions
        adminPermissions = {};
      } else if (input.role === "OWNER") {
        // Owners get all permissions by default
        adminPermissions = {
          manage_bookings: true,
          manage_customers: true,
          manage_cleaners: true,
          manage_admins: true,
          manage_checklists: true,
          manage_pricing: true,
          view_reports: true,
          manage_time_off_requests: true,
        };
      }

      // Create the user
      const newUser = await db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          role: input.role,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: sanitizePhone(input.phone),
          color: input.color,
          temporaryPassword: temporaryPassword,
          hasResetPassword: false,
          adminPermissions: adminPermissions,
        },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phone: true,
          color: true,
          createdAt: true,
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

        if (newUser.role === "CLIENT" && newUser.phone) {
             logDebug(`[AdminCreateUser] Creating OpenPhone contact for New User ID: ${newUser.id}`);

             const openPhoneId = await createOpenPhoneContact(
               newUser.firstName || "",
               newUser.lastName || "",
               newUser.phone,
               newUser.email,
               undefined, // company
               "Client", // role
               newUser.id.toString() // externalId
             );

             logDebug(`[AdminCreateUser] OpenPhone Service returned ID: ${openPhoneId}`);

             if (openPhoneId) {
               await db.user.update({
                 where: { id: newUser.id },
                 data: { openPhoneContactId: openPhoneId }
               });
               logDebug(`[AdminCreateUser] User updated with OpenPhone ID.`);
             }
        }
      } catch (err) {
         const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
         try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [AdminCreateUser] Failed to sync with OpenPhone: ${err}\n`); } catch(e) {}
         console.error("[AdminCreateUser] Failed to sync with OpenPhone:", err);
      }

      return {
        user: newUser,
        generatedPassword: temporaryPassword, // Return the temp password so admin can see it
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
