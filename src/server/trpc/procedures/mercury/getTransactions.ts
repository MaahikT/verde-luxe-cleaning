import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getTransactions = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      accountId: z.number().optional(),
      categoryId: z.number().optional(),
      status: z.enum(["PENDING", "POSTED", "CANCELLED"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      transactionType: z.enum(["debit", "credit", "all"]).optional(),
      searchQuery: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    // Verify authentication
    try {
      const decoded = jwt.verify(input.authToken, env.JWT_SECRET) as {
        userId: number;
      };
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
      });
      if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Admin access required",
        });
      }
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid authentication token",
      });
    }

    try {
      // Build where clause
      const where: any = {};

      if (input.accountId) {
        where.accountId = input.accountId;
      }

      if (input.categoryId) {
        where.categoryId = input.categoryId;
      }

      if (input.status) {
        where.status = input.status;
      }

      if (input.startDate || input.endDate) {
        where.date = {};
        if (input.startDate) {
          where.date.gte = new Date(input.startDate);
        }
        if (input.endDate) {
          where.date.lte = new Date(input.endDate);
        }
      }

      if (input.minAmount !== undefined || input.maxAmount !== undefined) {
        where.amount = {};
        if (input.minAmount !== undefined) {
          where.amount.gte = input.minAmount;
        }
        if (input.maxAmount !== undefined) {
          where.amount.lte = input.maxAmount;
        }
      }

      if (input.transactionType && input.transactionType !== "all") {
        if (input.transactionType === "debit") {
          where.amount = { ...where.amount, lt: 0 };
        } else if (input.transactionType === "credit") {
          where.amount = { ...where.amount, gt: 0 };
        }
      }

      if (input.searchQuery) {
        where.OR = [
          {
            description: {
              contains: input.searchQuery,
              mode: "insensitive" as const,
            },
          },
          {
            editedDescription: {
              contains: input.searchQuery,
              mode: "insensitive" as const,
            },
          },
          {
            counterpartyName: {
              contains: input.searchQuery,
              mode: "insensitive" as const,
            },
          },
        ];
      }

      // Fetch transactions with relations
      const transactions = await db.transaction.findMany({
        where,
        include: {
          account: true,
          category: true,
        },
        orderBy: { date: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      // Get total count for pagination
      const totalCount = await db.transaction.count({ where });

      return {
        transactions,
        totalCount,
        hasMore: input.offset + transactions.length < totalCount,
      };
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch transactions",
      });
    }
  });
