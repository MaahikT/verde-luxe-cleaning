import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const getAllTimeOffRequests = baseProcedure
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

    // Get user and verify they are an admin or owner
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin privileges required",
      });
    }

    // Check for manage_time_off_requests permission
    if (user.role === "ADMIN" && !hasPermission(user, "manage_time_off_requests")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view time-off requests",
      });
    }

    // Fetch time-off requests that haven't been cleared
    // Show all pending requests and only non-cleared approved/rejected requests
    const requests = await db.timeOffRequest.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          {
            AND: [
              { status: { in: ["APPROVED", "REJECTED"] } },
              { isCleared: false },
            ],
          },
        ],
      },
      include: {
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
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
