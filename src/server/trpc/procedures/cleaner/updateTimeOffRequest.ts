import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateTimeOffRequest = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      requestId: z.number(),
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
      throw new Error("Only cleaners can update time-off requests");
    }

    // Get the time-off request and verify ownership
    const request = await db.timeOffRequest.findUnique({
      where: { id: input.requestId },
    });

    if (!request) {
      throw new Error("Time-off request not found");
    }

    if (request.cleanerId !== userId) {
      throw new Error("You can only update your own time-off requests");
    }

    if (request.status !== "PENDING") {
      throw new Error("Only pending requests can be updated");
    }

    // Validate dates
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate < startDate) {
      throw new Error("End date must be after start date");
    }

    // Update the request
    const updatedRequest = await db.timeOffRequest.update({
      where: { id: input.requestId },
      data: {
        startDate,
        endDate,
        reason: input.reason,
      },
    });

    return {
      success: true,
      request: updatedRequest,
    };
  });
