import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getConfiguration = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
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

      // Check for manage_pricing permission (configurations often relate to pricing/financials)
      if (user.role === "ADMIN" && !hasPermission(user, "manage_pricing")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view configuration",
        });
      }

      // Fetch configuration (or create if doesn't exist)
      let configuration = await db.configuration.findFirst();

      if (!configuration) {
        // Create default configuration if it doesn't exist
        configuration = await db.configuration.create({
          data: {
            paymentHoldDelayHours: null,
          },
        });
      }

      return {
        configuration,
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
