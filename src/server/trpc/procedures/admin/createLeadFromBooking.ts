import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import * as fs from "fs";
import * as path from "path";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { hasPermission } from "~/server/trpc/utils/permission-utils";
import { createOpenPhoneContact } from "~/server/services/openphone";

export const createLeadFromBooking = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      // Client information
      clientId: z.number().optional(),
      clientEmail: z.string().email().optional(),
      clientFirstName: z.string().optional(),
      clientLastName: z.string().optional(),
      clientPhone: z.string().optional(),
      // Service details
      serviceType: z.string().min(1, "Service type is required"),
      scheduledDate: z.string().datetime().optional(),
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
    .refine((data) => data.clientId || data.clientEmail, {
      message: "Either clientId or clientEmail must be provided",
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
          message: "You do not have permission to create leads",
        });
      }

      // Determine client information
      let firstName: string | undefined;
      let lastName: string | undefined;
      let phone: string | undefined;
      let email: string | undefined;
      let userId: number | undefined;

      if (input.clientId) {
        // Use existing client
        const client = await db.user.findUnique({
          where: { id: input.clientId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        userId = client.id;
        firstName = client.firstName || undefined;
        lastName = client.lastName || undefined;
        email = client.email;
        phone = client.phone || undefined;
      } else if (input.clientEmail) {
        // New client - use provided information
        firstName = input.clientFirstName;
        lastName = input.clientLastName;
        email = input.clientEmail;
        phone = input.clientPhone;

        // Check if user with this email already exists
        const existingUser = await db.user.findUnique({
          where: { email: input.clientEmail },
        });

        if (existingUser) {
          userId = existingUser.id;
        }
      }

      // Build detailed message with booking information
      const bookingDetails: any = {
        serviceType: input.serviceType,
      };

      if (input.scheduledDate) {
        bookingDetails.scheduledDate = input.scheduledDate;
      }
      if (input.scheduledTime) {
        bookingDetails.scheduledTime = input.scheduledTime;
      }
      if (input.durationHours) {
        bookingDetails.durationHours = input.durationHours;
      }
      if (input.address) {
        bookingDetails.address = input.address;
      }
      if (input.finalPrice) {
        bookingDetails.finalPrice = input.finalPrice;
      }
      if (input.serviceFrequency) {
        bookingDetails.serviceFrequency = input.serviceFrequency;
      }
      if (input.houseSquareFootage) {
        bookingDetails.houseSquareFootage = input.houseSquareFootage;
      }
      if (input.basementSquareFootage) {
        bookingDetails.basementSquareFootage = input.basementSquareFootage;
      }
      if (input.numberOfBedrooms) {
        bookingDetails.numberOfBedrooms = input.numberOfBedrooms;
      }
      if (input.numberOfBathrooms) {
        bookingDetails.numberOfBathrooms = input.numberOfBathrooms;
      }
      if (input.numberOfCleanersRequested) {
        bookingDetails.numberOfCleanersRequested = input.numberOfCleanersRequested;
      }
      if (input.selectedExtras && input.selectedExtras.length > 0) {
        bookingDetails.selectedExtras = input.selectedExtras;
      }

      // Combine special instructions and booking details into message
      let message = "";
      if (input.specialInstructions) {
        message = `Special Instructions: ${input.specialInstructions}\n\n`;
      }
      message += `Booking Details:\n${JSON.stringify(bookingDetails, null, 2)}`;

      // Create the lead (BookingInquiry)
      const lead = await db.bookingInquiry.create({
        data: {
          userId: userId || null,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || email || "N/A", // Phone is required, fallback to email if not provided
          email: email || "",
          howHeardAbout: "Admin Portal - Saved as Lead",
          message: message,
          status: "INCOMING",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

    // OpenPhone Integration
      try {
        const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
        const logDebug = (msg: string) => {
             const ts = new Date().toISOString();
             try { fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`); } catch(e) {}
             console.log(msg);
        };

        if (lead.phone && !lead.openPhoneContactId) {
          logDebug(`[AdminLead] Checking OpenPhone sync for Lead ID: ${lead.id}`);
          // Check if we have a user associated to maybe update them too, but primary goal is lead contact
          // If userId exists, check if they already have an ID
          let existingOpenPhoneId: string | null | undefined = null;

          if (lead.userId) {
            const user = await db.user.findUnique({
              where: { id: lead.userId },
              select: { openPhoneContactId: true }
            });
            existingOpenPhoneId = user?.openPhoneContactId;
            logDebug(`[AdminLead] Linked User ID: ${lead.userId}, Existing OpenPhone ID: ${existingOpenPhoneId}`);
          }

          if (!existingOpenPhoneId) {
             logDebug(`[AdminLead] Initiating OpenPhone Contact Creation...`);
             const openPhoneId = await createOpenPhoneContact(
            lead.firstName || "Lead",
            lead.lastName || "",
            lead.phone,
            lead.email,
            undefined,
            "Lead",
            `Lead-${lead.id}`
          );
             logDebug(`[AdminLead] OpenPhone Service returned ID: ${openPhoneId}`);

             if (openPhoneId) {
               // Update Inquiry
               await db.bookingInquiry.update({
                 where: { id: lead.id },
                 data: { openPhoneContactId: openPhoneId }
               });

               // Also update user if exists
               if (lead.userId) {
                 await db.user.update({
                   where: { id: lead.userId },
                   data: { openPhoneContactId: openPhoneId }
                 });
                 logDebug(`[AdminLead] Updated User and Lead with OpenPhone ID.`);
               } else {
                 logDebug(`[AdminLead] Updated Lead with OpenPhone ID.`);
               }
             }
          } else {
            logDebug(`[AdminLead] Use existing OpenPhone ID: ${existingOpenPhoneId}`);
            // Link existing ID to lead
            await db.bookingInquiry.update({
              where: { id: lead.id },
              data: { openPhoneContactId: existingOpenPhoneId }
            });
          }
        } else {
             logDebug(`[AdminLead] Skipping OpenPhone sync. Phone missing (${lead.phone}) or already has ID (${lead.openPhoneContactId}).`);
        }
      } catch (err) {
        const LOG_FILE = path.join(process.cwd(), "debug_openphone.log");
        try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [AdminLead] Failed to sync lead with OpenPhone: ${err}\n`); } catch(e) {}
        console.error("[AdminLead] Failed to sync lead with OpenPhone:", err);
      }

      return { lead };
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
