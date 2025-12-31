import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const submitTimeOffRequest = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Verify auth token
    let userId: number;
    try {
      const decoded = jwt.verify(input.authToken, env.JWT_SECRET) as {
        userId: number;
      };
      userId = decoded.userId;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }

    // Get user and verify they are a cleaner
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "CLEANER") {
      throw new Error("Only cleaners can submit time-off requests");
    }

    // Validate dates
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate < startDate) {
      throw new Error("End date must be after start date");
    }

    // Create the time-off request
    const timeOffRequest = await db.timeOffRequest.create({
      data: {
        cleanerId: userId,
        startDate,
        endDate,
        reason: input.reason,
        status: "PENDING",
      },
    });

    return {
      success: true,
      request: timeOffRequest,
    };
  });
