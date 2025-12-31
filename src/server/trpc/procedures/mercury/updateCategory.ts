import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateCategory = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      categoryId: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
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
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.color !== undefined) updateData.color = input.color;

      const category = await db.transactionCategory.update({
        where: { id: input.categoryId },
        data: updateData,
      });

      return {
        category,
      };
    } catch (error) {
      console.error("Error updating category:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update category",
      });
    }
  });
