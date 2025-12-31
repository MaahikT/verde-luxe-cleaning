import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

// Helper function to sanitize phone numbers (remove all non-numeric characters)
function sanitizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned || undefined;
}

export const register = baseProcedure
  .input(
    z.object({
      email: z.string().email("Valid email is required"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(["CLIENT", "CLEANER"]).default("CLIENT"),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(input.password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: sanitizePhone(input.phone),
      },
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: "1y",
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  });
