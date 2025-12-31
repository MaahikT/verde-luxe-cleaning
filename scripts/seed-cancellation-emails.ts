import { db } from "~/server/db";
import { EmailRecipientType, EmailEventCategory } from "@prisma/client";

async function main() {
  console.log("Seeding cancellation email templates...");

  const templates = [
    {
      name: "booking_cancellation_fee",
      recipient: EmailRecipientType.CUSTOMER,
      category: EmailEventCategory.BOOKING_CANCELED_POSTPONED,
      event: "booking_cancelled_with_fee",
      subject: "Your booking has been cancelled",
      body: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Booking Cancellation Confirmed</h2>
          <p>Hi {{customer_first_name}},</p>
          <p>Your booking scheduled for {{scheduled_date}} at {{scheduled_time}} has been cancelled as requested.</p>
          <p><strong>Cancellation Reason:</strong> {{cancellation_reason}}</p>
          <p>Please note that a cancellation fee of <strong>{{cancellation_fee}}</strong> has been charged in accordance with our cancellation policy.</p>
          <p>If you have any questions, please reply to this email.</p>
          <p>Best regards,<br/>The Team</p>
        </div>
      `,
      description: "Sent when a booking is cancelled and a fee is charged",
    },
    {
      name: "booking_cancellation_no_fee",
      recipient: EmailRecipientType.CUSTOMER,
      category: EmailEventCategory.BOOKING_CANCELED_POSTPONED,
      event: "booking_cancelled_no_fee",
      subject: "Your booking has been cancelled",
      body: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Booking Cancellation Confirmed</h2>
          <p>Hi {{customer_first_name}},</p>
          <p>Your booking scheduled for {{scheduled_date}} at {{scheduled_time}} has been cancelled as requested.</p>
          <p><strong>Cancellation Reason:</strong> {{cancellation_reason}}</p>
          <p>There is no cancellation fee for this cancellation.</p>
          <p>We hope to see you again soon!</p>
          <p>Best regards,<br/>The Team</p>
        </div>
      `,
      description: "Sent when a booking is cancelled without a fee",
    },
  ];

  for (const t of templates) {
    const existing = await db.emailTemplate.findUnique({
      where: { name: t.name },
    });

    if (!existing) {
      await db.emailTemplate.create({
        data: t,
      });
      console.log(`Created template: ${t.name}`);
    } else {
      console.log(`Template already exists: ${t.name}`);
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
