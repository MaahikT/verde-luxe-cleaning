import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getPayments = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      // Verify and decode JWT token
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Fetch user and verify role
      const user = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.role !== "CLEANER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only cleaners can access payment information",
        });
      }

      // Build date filter for booking's scheduledDate
      const dateFilter: any = {};
      if (input.startDate) {
        dateFilter.gte = new Date(input.startDate);
      }
      if (input.endDate) {
        // Set to end of day for endDate
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }

      // Fetch payments for this cleaner
      const payments = await db.payment.findMany({
        where: {
          cleanerId: user.id,
          ...(Object.keys(dateFilter).length > 0
            ? {
                booking: {
                  scheduledDate: dateFilter,
                },
              }
            : {}),
        },
        include: {
          booking: {
            select: {
              serviceType: true,
              scheduledDate: true,
              address: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Calculate total earnings
      const totalEarnings = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      const paidEarnings = payments
        .filter((p) => p.paidAt !== null)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const pendingEarnings = totalEarnings - paidEarnings;

      return {
        payments,
        summary: {
          totalEarnings,
          paidEarnings,
          pendingEarnings,
        },
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
