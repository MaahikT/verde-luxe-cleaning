import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const login = baseProcedure
  .input(
    z.object({
      email: z.string().email("Valid email is required"),
      password: z.string().min(1, "Password is required"),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(
      input.password,
      user.password
    );

    if (!isValidPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

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
        adminPermissions: (user.role === "ADMIN" || user.role === "OWNER") ? user.adminPermissions as Record<string, boolean> | null : null,
      },
    };
  });
