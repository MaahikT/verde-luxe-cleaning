import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateTransaction = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      transactionId: z.number(),
      categoryId: z.number().nullable().optional(),
      editedDescription: z.string().nullable().optional(),
    })
  )
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
      const updateData: any = {};
      if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
      if (input.editedDescription !== undefined)
        updateData.editedDescription = input.editedDescription;

      const transaction = await db.transaction.update({
        where: { id: input.transactionId },
        data: updateData,
        include: {
          account: true,
          category: true,
        },
      });

      return {
        transaction,
      };
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update transaction",
      });
    }
  });
