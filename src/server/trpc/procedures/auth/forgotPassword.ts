import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcryptjs from "bcryptjs";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";

export const forgotPassword = baseProcedure
  .input(
    z.object({
      email: z.string().email("Valid email is required"),
      temporaryPassword: z.string().min(1, "Temporary password is required"),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No account found with this email address",
      });
    }

    // Check if user has a temporary password set
    if (user.temporaryPassword) {
      // User has a temporary password, so we must verify it matches
      if (input.temporaryPassword !== user.temporaryPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect temporary password. Please contact us if you've forgotten it.",
        });
      }
    } else {
      // User doesn't have a temporary password (they set their own password during registration)
      // In this case, we still require them to provide the temporary password field,
      // but we'll reject it since they should use the login flow instead
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This account was not created with a temporary password. Please use the login page or contact support.",
      });
    }

    // Hash the new password
    const hashedPassword = await bcryptjs.hash(input.newPassword, 10);

    // Update user's password and mark as reset
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        hasResetPassword: true, // Mark that they've reset their password
        // temporaryPassword is intentionally NOT cleared so staff can always see it
      },
    });

    return {
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    };
  });
