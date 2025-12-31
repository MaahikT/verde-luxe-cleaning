import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const updateTimeOffRequestStatus = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      requestId: z.number(),
      status: z.enum(["APPROVED", "REJECTED"]),
      adminNotes: z.string().optional(),
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
        message: "You do not have permission to update time-off requests",
      });
    }

    // Check if request exists
    const request = await db.timeOffRequest.findUnique({
      where: { id: input.requestId },
    });

    if (!request) {
      throw new Error("Time-off request not found");
    }

    // Update the request
    const updatedRequest = await db.timeOffRequest.update({
      where: { id: input.requestId },
      data: {
        status: input.status,
        reviewedById: userId,
        reviewedAt: new Date(),
        adminNotes: input.adminNotes,
      },
      include: {
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    });

    return {
      success: true,
      request: updatedRequest,
    };
  });
