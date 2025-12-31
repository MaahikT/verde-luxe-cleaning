import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getTimeOffRequests = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .query(async ({ input }) => {
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
      throw new Error("Only cleaners can view time-off requests");
    }

    // Fetch all time-off requests for this cleaner
    const requests = await db.timeOffRequest.findMany({
      where: {
        cleanerId: userId,
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      requests,
    };
  });
