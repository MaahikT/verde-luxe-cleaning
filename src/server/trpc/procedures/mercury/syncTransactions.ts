import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import jwt from "jsonwebtoken";

export const syncTransactions = baseProcedure
  .input(z.object({ authToken: z.string() }))
  .mutation(async ({ input }) => {
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
      // Get all accounts from database
      const accounts = await db.mercuryAccount.findMany();

      if (accounts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No accounts found. Please fetch accounts first.",
        });
      }

      // Fetch categorization rules for auto-categorization
      const rules = await db.categorizationRule.findMany({
        where: { isActive: true },
        orderBy: { priority: "desc" },
        include: { category: true },
      });

      let totalSynced = 0;

      // Sync transactions for each account
      for (const account of accounts) {
        try {
          const response = await fetch(
            `https://api-sandbox.mercury.com/api/v1/account/${account.mercuryId}/transactions?limit=1000`,
            {
              headers: {
                Authorization: `Bearer ${env.MERCURY_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            let errorMessage = `Mercury API error for account ${account.mercuryId}: ${response.status} ${response.statusText}`;
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = `Mercury API error for account ${account.mercuryId}: ${errorData.error}`;
              } else if (errorData.message) {
                errorMessage = `Mercury API error for account ${account.mercuryId}: ${errorData.message}`;
              }
            } catch {
              // If we can't parse the error response, use the default message
            }
            console.error(errorMessage);
            continue;
          }

          const data = await response.json();
          const transactions = data.transactions || [];

          for (const mercuryTx of transactions) {
            // Auto-categorize based on rules
            let categoryId: number | null = null;
            for (const rule of rules) {
              let matches = false;
              const description = mercuryTx.description || "";
              const counterpartyName = mercuryTx.counterpartyName || "";
              const amount = Math.abs(mercuryTx.amount || 0);

              switch (rule.conditionType) {
                case "VENDOR_CONTAINS":
                case "DESCRIPTION_CONTAINS":
                  matches =
                    description
                      .toLowerCase()
                      .includes(rule.conditionValue.toLowerCase()) ||
                    counterpartyName
                      .toLowerCase()
                      .includes(rule.conditionValue.toLowerCase());
                  break;
                case "COUNTERPARTY_EQUALS":
                  matches =
                    counterpartyName.toLowerCase() ===
                    rule.conditionValue.toLowerCase();
                  break;
                case "AMOUNT_EQUALS":
                  matches = amount === parseFloat(rule.conditionValue);
                  break;
                case "AMOUNT_GREATER_THAN":
                  matches = amount > parseFloat(rule.conditionValue);
                  break;
                case "AMOUNT_LESS_THAN":
                  matches = amount < parseFloat(rule.conditionValue);
                  break;
              }

              if (matches) {
                categoryId = rule.categoryId;
                break;
              }
            }

            // Upsert transaction
            await db.transaction.upsert({
              where: { mercuryId: mercuryTx.id },
              create: {
                mercuryId: mercuryTx.id,
                accountId: account.id,
                date: new Date(mercuryTx.createdAt || mercuryTx.postedAt),
                description: mercuryTx.description || "Unknown transaction",
                amount: mercuryTx.amount || 0,
                status: mercuryTx.status === "pending" ? "PENDING" : "POSTED",
                counterpartyName: mercuryTx.counterpartyName || null,
                counterpartyId: mercuryTx.counterpartyId || null,
                bankDescription: mercuryTx.bankDescription || null,
                categoryId,
                details: mercuryTx.details || null,
              },
              update: {
                description: mercuryTx.description || "Unknown transaction",
                amount: mercuryTx.amount || 0,
                status: mercuryTx.status === "pending" ? "PENDING" : "POSTED",
                counterpartyName: mercuryTx.counterpartyName || null,
                bankDescription: mercuryTx.bankDescription || null,
                details: mercuryTx.details || null,
                // Only update category if not manually set (editedDescription is null)
                categoryId: categoryId,
              },
            });

            totalSynced++;
          }
        } catch (error) {
          console.error(
            `Error syncing transactions for account ${account.mercuryId}:`,
            error
          );
        }
      }

      return {
        success: true,
        syncedCount: totalSynced,
        message: `Successfully synced ${totalSynced} transactions`,
      };
    } catch (error) {
      console.error("Error syncing transactions:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to sync transactions",
      });
    }
  });
