import { z } from "zod";
import { createTRPCRouter, baseProcedure } from "../main";
import { db } from "~/server/db";
import { createOpenPhoneContact } from "~/server/services/openphone";

// Helper function to sanitize phone numbers (remove all non-numeric characters)
function sanitizePhone(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned || null;
}

export const bookingRouter = createTRPCRouter({
  submit: baseProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().min(1, "Phone is required"),
        email: z.string().email("Valid email is required"),
        howHeardAbout: z.string().min(1, "This field is required"),
        message: z.string().optional(),
        smsConsent: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const inquiry = await db.bookingInquiry.create({
        data: {
          firstName: input.firstName || null,
          lastName: input.lastName || null,
          phone: sanitizePhone(input.phone) || input.phone, // Sanitize but fallback to original if null
          email: input.email,
          howHeardAbout: input.howHeardAbout,
          message: input.message || null,
          smsConsent: input.smsConsent,
        },
      });

      // OpenPhone Integration
      try {
        if (inquiry.phone && !inquiry.openPhoneContactId) {
           const openPhoneId = await createOpenPhoneContact(
             inquiry.firstName || "",
             inquiry.lastName || "",
             inquiry.phone,
             inquiry.email
           );

           if (openPhoneId) {
             await db.bookingInquiry.update({
               where: { id: inquiry.id },
               data: { openPhoneContactId: openPhoneId }
             });
           }
        }
      } catch (err) {
        console.error("Failed to sync inquiry with OpenPhone:", err);
      }

      return { success: true, id: inquiry.id };
    }),
});
