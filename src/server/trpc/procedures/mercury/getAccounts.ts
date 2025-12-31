import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import jwt from "jsonwebtoken";

export const getAccounts = baseProcedure
  .input(z.object({ authToken: z.string() }))
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

    // Fetch accounts from Mercury API
    try {
      const response = await fetch("https://api-sandbox.mercury.com/api/v1/accounts", {
        headers: {
          Authorization: `Bearer ${env.MERCURY_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = `Mercury API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `Mercury API error: ${errorData.error}`;
          } else if (errorData.message) {
            errorMessage = `Mercury API error: ${errorData.message}`;
          }
        } catch {
          // If we can't parse the error response, use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const accounts = data.accounts || [];

      // Update or create accounts in our database
      for (const mercuryAccount of accounts) {
        await db.mercuryAccount.upsert({
          where: { mercuryId: mercuryAccount.id },
          create: {
            mercuryId: mercuryAccount.id,
            name: mercuryAccount.name,
            accountNumber: mercuryAccount.accountNumber?.slice(-4) || null,
            routingNumber: mercuryAccount.routingNumber || null,
            currentBalance: mercuryAccount.currentBalance || 0,
            availableBalance: mercuryAccount.availableBalance || 0,
            status: mercuryAccount.status || "active",
            type: mercuryAccount.type || null,
            lastSyncedAt: new Date(),
          },
          update: {
            name: mercuryAccount.name,
            accountNumber: mercuryAccount.accountNumber?.slice(-4) || null,
            routingNumber: mercuryAccount.routingNumber || null,
            currentBalance: mercuryAccount.currentBalance || 0,
            availableBalance: mercuryAccount.availableBalance || 0,
            status: mercuryAccount.status || "active",
            type: mercuryAccount.type || null,
            lastSyncedAt: new Date(),
          },
        });
      }

      // Fetch updated accounts from database
      const dbAccounts = await db.mercuryAccount.findMany({
        orderBy: { name: "asc" },
      });

      return {
        accounts: dbAccounts,
      };
    } catch (error) {
      console.error("Error fetching Mercury accounts:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch Mercury accounts",
      });
    }
  });
