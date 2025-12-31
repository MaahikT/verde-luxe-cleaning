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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
