import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";

export const updateLeadAdmin = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      leadId: z.number(),
      // Client information
      clientId: z.number().optional(), // Can link to a user
      clientEmail: z.string().email().optional(),
      clientFirstName: z.string().optional(),
      clientLastName: z.string().optional(),
      clientPhone: z.string().optional(),
      // Service details
      serviceType: z.string().min(1, "Service type is required"),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      durationHours: z.number().positive().optional(),
      address: z.string().optional(),
      specialInstructions: z.string().optional(),
      finalPrice: z.number().positive().optional(),
      serviceFrequency: z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
      houseSquareFootage: z.number().int().positive().optional(),
      basementSquareFootage: z.number().int().positive().optional(),
      numberOfBedrooms: z.number().int().positive().optional(),
      numberOfBathrooms: z.number().int().positive().optional(),
      numberOfCleanersRequested: z.number().int().positive().optional(),
      selectedExtras: z.array(z.number()).optional(),
    })
  )
  .mutation(async ({ input }) => {
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

      // Check if user is an admin or owner
      if (user.role !== "ADMIN" && user.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Admin privileges required.",
        });
      }

      // Check for manage_customers permission
      if (user.role === "ADMIN" && !hasPermission(user, "manage_customers")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update leads",
        });
      }

      const lead = await db.bookingInquiry.findUnique({
        where: { id: input.leadId },
      });

      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }

      // Determine client information to update
      let userId = lead.userId; // Default to existing
      let firstName = input.clientFirstName;
      let lastName = input.clientLastName;
      let email = input.clientEmail || lead.email;
      let phone = input.clientPhone || lead.phone;

      if (input.clientId) {
        const client = await db.user.findUnique({ where: { id: input.clientId } });
        if (client) {
            userId = client.id;
            firstName = client.firstName || undefined;
            lastName = client.lastName || undefined;
            email = client.email;
            phone = client.phone || undefined;
        }
      }

      // Build detailed message with booking information
      const bookingDetails: any = {
        serviceType: input.serviceType,
      };

      if (input.scheduledDate) bookingDetails.scheduledDate = input.scheduledDate;
      if (input.scheduledTime) bookingDetails.scheduledTime = input.scheduledTime;
      if (input.durationHours) bookingDetails.durationHours = input.durationHours;
      if (input.address) bookingDetails.address = input.address;
      if (input.finalPrice) bookingDetails.finalPrice = input.finalPrice;
      if (input.serviceFrequency) bookingDetails.serviceFrequency = input.serviceFrequency;
      if (input.houseSquareFootage) bookingDetails.houseSquareFootage = input.houseSquareFootage;
      if (input.basementSquareFootage) bookingDetails.basementSquareFootage = input.basementSquareFootage;
      if (input.numberOfBedrooms) bookingDetails.numberOfBedrooms = input.numberOfBedrooms;
      if (input.numberOfBathrooms) bookingDetails.numberOfBathrooms = input.numberOfBathrooms;
      if (input.numberOfCleanersRequested) bookingDetails.numberOfCleanersRequested = input.numberOfCleanersRequested;
      if (input.selectedExtras && input.selectedExtras.length > 0) {
        bookingDetails.selectedExtras = input.selectedExtras;
      }

      // Combine special instructions and booking details into message
      let message = "";
      if (input.specialInstructions) {
        message = `Special Instructions: ${input.specialInstructions}\n\n`;
      }
      message += `Booking Details:\n${JSON.stringify(bookingDetails, null, 2)}`;

      // Update the lead
      const updatedLead = await db.bookingInquiry.update({
        where: { id: input.leadId },
        data: {
          userId: userId,
          firstName: firstName || null,
          lastName: lastName || null,
          email: email,
          phone: phone || "N/A",
          message: message,
          // Status is NOT updated here, separate mutation for that
        },
      });

      return { lead: updatedLead };
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
