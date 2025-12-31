import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const calculateBookingPrice = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      serviceType: z.string(),
      houseSquareFootage: z.number().int().positive().optional(),
      basementSquareFootage: z.number().int().positive().optional(),
      numberOfBedrooms: z.number().int().positive().optional(),
      numberOfBathrooms: z.number().int().positive().optional(),
      selectedExtras: z.array(z.number()).optional(), // Array of extra service rule IDs
    })
  )
  .query(async ({ input }) => {
    try {
      // Verify and decode JWT token
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Fetch user from database
      const user = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if user is an admin or owner (only they can create/edit bookings)
      if (user.role !== "ADMIN" && user.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        });
      }

      // Check for manage_bookings permission
      if (user.role === "ADMIN" && !hasPermission(user, "manage_bookings")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to manage bookings",
        });
      }

      // Fetch all active pricing rules
      const pricingRules = await db.pricingRule.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });

      let totalPrice = 0;
      let totalTime = 0;
      const breakdown: Array<{ description: string; amount: number; time?: number }> = [];

      // 1. Apply base price for the service type
      const basePriceRule = pricingRules.find(
        (rule) =>
          rule.ruleType === "BASE_PRICE" &&
          (rule.serviceType === input.serviceType || rule.serviceType === null)
      );

      if (basePriceRule) {
        const price = basePriceRule.priceAmount || 0;
        totalPrice += price;
        breakdown.push({
          description: `Base price for ${input.serviceType}`,
          amount: price,
        });

        if (basePriceRule.timeAmount) {
          totalTime += basePriceRule.timeAmount;
        }
      }

      // 2. Apply square footage rates
      const totalSquareFootage =
        (input.houseSquareFootage || 0) + (input.basementSquareFootage || 0);

      if (totalSquareFootage > 0) {
        const sqftRule = pricingRules.find(
          (rule) =>
            rule.ruleType === "SQFT_RATE" &&
            (rule.serviceType === input.serviceType || rule.serviceType === null)
        );

        if (sqftRule && sqftRule.ratePerUnit) {
          const price = totalSquareFootage * sqftRule.ratePerUnit;
          totalPrice += price;
          breakdown.push({
            description: `${totalSquareFootage} sq ft @ $${sqftRule.ratePerUnit}/sq ft`,
            amount: price,
          });

          if (sqftRule.timePerUnit) {
            const time = totalSquareFootage * sqftRule.timePerUnit;
            totalTime += time;
          }
        }
      }

      // 3. Apply bedroom rate
      if (input.numberOfBedrooms && input.numberOfBedrooms > 0) {
        const bedroomRule = pricingRules.find(
          (rule) =>
            rule.ruleType === "BEDROOM_RATE" &&
            (rule.serviceType === input.serviceType || rule.serviceType === null)
        );

        if (bedroomRule && bedroomRule.ratePerUnit) {
          const price = input.numberOfBedrooms * bedroomRule.ratePerUnit;
          totalPrice += price;
          breakdown.push({
            description: `${input.numberOfBedrooms} bedroom(s) @ $${bedroomRule.ratePerUnit}/bedroom`,
            amount: price,
          });

          if (bedroomRule.timePerUnit) {
            const time = input.numberOfBedrooms * bedroomRule.timePerUnit;
            totalTime += time;
          }
        }
      }

      // 4. Apply bathroom rate
      if (input.numberOfBathrooms && input.numberOfBathrooms > 0) {
        const bathroomRule = pricingRules.find(
          (rule) =>
            rule.ruleType === "BATHROOM_RATE" &&
            (rule.serviceType === input.serviceType || rule.serviceType === null)
        );

        if (bathroomRule && bathroomRule.ratePerUnit) {
          const price = input.numberOfBathrooms * bathroomRule.ratePerUnit;
          totalPrice += price;
          breakdown.push({
            description: `${input.numberOfBathrooms} bathroom(s) @ $${bathroomRule.ratePerUnit}/bathroom`,
            amount: price,
          });

          if (bathroomRule.timePerUnit) {
            const time = input.numberOfBathrooms * bathroomRule.timePerUnit;
            totalTime += time;
          }
        }
      }

      // 5. Apply extra services
      if (input.selectedExtras && input.selectedExtras.length > 0) {
        for (const extraId of input.selectedExtras) {
          const extraRule = pricingRules.find(
            (rule) => rule.id === extraId && rule.ruleType === "EXTRA_SERVICE"
          );

          if (extraRule) {
            const price = extraRule.priceAmount || 0;
            totalPrice += price;
            breakdown.push({
              description: extraRule.extraName || "Extra service",
              amount: price,
            });

            if (extraRule.timeAmount) {
              totalTime += extraRule.timeAmount;
            }
          }
        }
      }

      // 6. Apply time estimate rules (if not already calculated)
      if (totalTime === 0) {
        const timeRule = pricingRules.find(
          (rule) =>
            rule.ruleType === "TIME_ESTIMATE" &&
            (rule.serviceType === input.serviceType || rule.serviceType === null)
        );

        if (timeRule) {
          if (timeRule.timeAmount) {
            totalTime += timeRule.timeAmount;
          }

          if (timeRule.timePerUnit && totalSquareFootage > 0) {
            totalTime += totalSquareFootage * timeRule.timePerUnit;
          }
        }
      }

      // Round to 2 decimal places for price and 0.5 hour increments for time
      const finalPrice = Math.round(totalPrice * 100) / 100;
      const finalTime = Math.ceil(totalTime * 2) / 2; // Round up to nearest 0.5 hours

      return {
        price: finalPrice,
        durationHours: finalTime > 0 ? finalTime : null,
        breakdown,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
