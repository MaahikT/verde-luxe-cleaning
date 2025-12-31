import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      role: 'ADMIN', // Ensure this matches your UserRole enum
      firstName: 'Admin',
      lastName: 'User',
      hasResetPassword: true,
    },
  });

  console.log(`User created: ${user.email} / ${password}`);

  const ownerEmail = 'owner@example.com';
  const ownerPassword = 'h4eD6hBUZnQWW1m3WW95pG';
  const hashedOwnerPassword = await bcrypt.hash(ownerPassword, 10);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      password: hashedOwnerPassword,
      role: 'OWNER',
      firstName: 'Owner',
      lastName: 'User',
      hasResetPassword: true,
    },
  });

  console.log(`Owner created: ${owner.email} / ${ownerPassword}`);

  // Seed Email Templates
  const templates = [
    {
      name: 'booking_cancellation_no_fee',
      recipient: 'CUSTOMER',
      category: 'BOOKING_CANCELED_POSTPONED',
      event: 'booking_cancelled_no_fee',
      subject: 'Booking Cancellation - Verde Luxe Cleaning',
      body: '<p>Dear {{customer_first_name}},</p><p>This email is to confirm that your booking for {{service_type}} on {{scheduled_date}} at {{scheduled_time}} has been cancelled.</p><p>As per our cancellation policy, no fee has been charged for this cancellation.</p><p><strong>Reason:</strong> {{cancellation_reason}}</p><p>We hope to serve you again in the future.</p><p>Best regards,<br>The Verde Luxe Cleaning Team</p>',
      description: 'Sent to customer when booking is cancelled without a fee',
    },
    {
      name: 'booking_cancellation_fee',
      recipient: 'CUSTOMER',
      category: 'BOOKING_CANCELED_POSTPONED',
      event: 'booking_cancelled_with_fee',
      subject: 'Booking Cancellation Notification',
      body: '<p>Dear {{customer_first_name}},</p><p>This email is to confirm that your booking for {{service_type}} on {{scheduled_date}} at {{scheduled_time}} has been cancelled.</p><p>Because this cancellation occurred within our cancellation window, a fee of <strong>{{cancellation_fee}}</strong> has been applied.</p><p><strong>Reason:</strong> {{cancellation_reason}}</p><p>If you have any questions, please reply to this email.</p><p>Best regards,<br>The Verde Luxe Cleaning Team</p>',
      description: 'Sent to customer when booking is cancelled with a fee',
    }
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: t.name },
      update: {
        subject: t.subject,
        body: t.body,
      },
      create: {
        name: t.name,
        recipient: t.recipient as any, // Cast to any or import Enum if needed, but string works if types match
        category: t.category as any,
        event: t.event,
        subject: t.subject,
        body: t.body,
        description: t.description,
      },
    });
    console.log(`Upserted template: ${t.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
