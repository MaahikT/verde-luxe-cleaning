import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, baseProcedure } from "../main";
import { db } from "~/server/db";
import { env } from "~/server/env";
import jwt from "jsonwebtoken";
import { EmailRecipientType, EmailEventCategory } from "@prisma/client";

// Helper to verify admin access
const verifyAdmin = (authToken: string) => {
  try {
    const verified = jwt.verify(authToken, env.JWT_SECRET);
    const parsed = z.object({ userId: z.number() }).parse(verified);
    return parsed.userId;
  } catch (error) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }
};

const DEFAULT_TEMPLATES = [
  {
    name: "customer_booking_confirmation",
    recipient: EmailRecipientType.CUSTOMER,
    category: EmailEventCategory.BOOKING_NEW_MODIFIED,
    event: "booking_created",
    subject: "Booking Confirmation: {{service_type}} on {{scheduled_date}}",
    body: "Hi {{customer_first_name}},\n\nYour booking for {{service_type}} has been confirmed for {{scheduled_date}} at {{scheduled_time}}.\n\nThank you!",
    description: "Sent to customer when a new booking is created",
  },
  {
    name: "customer_booking_reminder_24h",
    recipient: EmailRecipientType.CUSTOMER,
    category: EmailEventCategory.REMINDERS,
    event: "booking_reminder_24h",
    subject: "Reminder: Cleaning scheduled for tomorrow",
    body: "Hi {{customer_first_name}},\n\nThis is a reminder that you have a cleaning scheduled for tomorrow at {{scheduled_time}}.",
    description: "Sent to customer 24 hours before booking",
  },
  {
    name: "cleaner_job_assigned",
    recipient: EmailRecipientType.CLEANER,
    category: EmailEventCategory.BOOKING_NEW_MODIFIED,
    event: "job_assigned",
    subject: "You have been assigned to a new job",
    body: "Hi {{cleaner_first_name}},\n\nYou have been confirmed for a cleaning on {{scheduled_date}} at {{scheduled_time}}.",
    description: "Sent to cleaner when they are assigned to a booking",
  },
  {
    name: "cleaner_new_job_available",
    recipient: EmailRecipientType.CLEANER,
    category: EmailEventCategory.BOOKING_UNASSIGNED,
    event: "job_available",
    subject: "New Job Available: {{service_type}}",
    body: "Hi {{cleaner_first_name}},\n\nA new job is available on {{scheduled_date}}. Log in to the portal to view details and accept it.",
    description: "Sent to cleaners when a new unassigned booking is posted",
  },
  {
    name: "admin_new_booking",
    recipient: EmailRecipientType.ADMIN,
    category: EmailEventCategory.BOOKING_NEW_MODIFIED,
    event: "new_booking_alert",
    subject: "New Booking Received: {{customer_name}}",
    body: "A new booking has been received from {{customer_name}} for {{scheduled_date}}.",
    description: "Alert sent to admins upon new booking creation",
  },
];

export const emailTemplateRouter = createTRPCRouter({
  list: baseProcedure
    .input(z.object({
      authToken: z.string(),
    }))
    .query(async ({ input }) => {
      await verifyAdmin(input.authToken);
      const templates = await db.emailTemplate.findMany({
        orderBy: { name: "asc" },
      });
      return { templates };
    }),

  ensureDefaults: baseProcedure
    .input(z.object({
      authToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      await verifyAdmin(input.authToken);

      const results = [];
      for (const tpl of DEFAULT_TEMPLATES) {
        const existing = await db.emailTemplate.findUnique({
          where: { name: tpl.name },
        });

        if (!existing) {
          const created = await db.emailTemplate.create({
            data: tpl,
          });
          results.push(created);
        }
      }
      return { seeded: results.length };
    }),

  sendTestEmail: baseProcedure
    .input(z.object({
      authToken: z.string(),
      templateId: z.number(),
      to: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      await verifyAdmin(input.authToken);

      const template = await db.emailTemplate.findUnique({
        where: { id: input.templateId },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Dummy data for placeholders
      const dummyData: Record<string, string> = {
        "{{customer_first_name}}": "John",
        "{{customer_last_name}}": "Doe",
        "{{cleaner_first_name}}": "Jane",
        "{{service_type}}": "Deep Cleaning",
        "{{scheduled_date}}": new Date().toLocaleDateString(),
        "{{scheduled_time}}": "10:00 AM",
        "{{address}}": "123 Main St, Springfield",
        "{{booking_link}}": "http://example.com/booking/123",
      };

      let subject = template.subject;
      let body = template.body;

      // Replace placeholders
      Object.entries(dummyData).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, "g"), value);
        body = body.replace(new RegExp(key, "g"), value);
      });

      const { sendEmail } = await import("~/server/utils/mailer");
      const result = await sendEmail({
        to: input.to,
        subject: `[TEST] ${subject}`,
        html: body.replace(/\n/g, "<br/>"), // Simple newline to BR
        text: body,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: result.message || "Failed to send email",
        });
      }

      return { success: true };
    }),

  create: baseProcedure
    .input(z.object({
      authToken: z.string(),
      name: z.string().min(1, "Name is required"),
      subject: z.string().min(1, "Subject is required"),
      body: z.string().min(1, "Body is required"),
      description: z.string().optional(),
      recipient: z.nativeEnum(EmailRecipientType),
      category: z.nativeEnum(EmailEventCategory),
      event: z.string().min(1, "Event ID is required"),
    }))
    .mutation(async ({ input }) => {
      await verifyAdmin(input.authToken);
      const { authToken, ...data } = input;
      const template = await db.emailTemplate.create({
        data,
      });
      return { template };
    }),

  update: baseProcedure
    .input(z.object({
      authToken: z.string(),
      id: z.number(),
      name: z.string().min(1, "Name is required"),
      subject: z.string().min(1, "Subject is required"),
      body: z.string().min(1, "Body is required"),
      description: z.string().optional(),
      recipient: z.nativeEnum(EmailRecipientType),
      category: z.nativeEnum(EmailEventCategory),
      event: z.string().min(1, "Event ID is required"),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await verifyAdmin(input.authToken);
      const { authToken, id, ...data } = input;
      const template = await db.emailTemplate.update({
        where: { id },
        data,
      });
      return { template };
    }),

  delete: baseProcedure
    .input(z.object({
      authToken: z.string(),
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      await verifyAdmin(input.authToken);
      await db.emailTemplate.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
