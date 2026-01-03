
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { processPaymentHoldsLogic } from "~/server/utils/paymentHolds";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover" as any,
});

export const processPaymentHolds = baseProcedure
  .input(
    z.object({
      authToken: z.string(), // require admin auth to trigger manually/via cron
    })
  )
  .mutation(async ({ input }) => {
    try {
      // 1. Verify Auth
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      // We assume only admins can trigger this system process
      const parsed = z.object({ userId: z.number() }).parse(verified);
      const admin = await db.user.findUnique({ where: { id: parsed.userId } });

      if (!admin || (admin.role !== "ADMIN" && admin.role !== "OWNER")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      // Use shared logic
      const results = await processPaymentHoldsLogic();
      return results;
    } catch (error) {
       console.error("ProcessPaymentHolds Error:", error);
       throw new TRPCError({
         code: "INTERNAL_SERVER_ERROR",
         message: "Failed to process payment holds",
       });
    }
  });
