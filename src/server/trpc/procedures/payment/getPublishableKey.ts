import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getPublishableKey = baseProcedure.query(async () => {
  return {
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  };
});
