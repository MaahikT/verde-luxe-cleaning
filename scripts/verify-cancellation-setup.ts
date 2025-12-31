import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting verification...');

  // 1. Verify Configuration Columns
  // We can't easily check schema at runtime without query, but we can check if we can read the fields
  const config = await prisma.configuration.findFirst();
  if (config) {
    if ('cancellationWindowHours' in config && 'cancellationFeeAmount' in config) {
       console.log(`✅ Configuration has new fields. Window: ${config.cancellationWindowHours}h, Fee: $${config.cancellationFeeAmount}`);
    } else {
       console.error('❌ Configuration missing new fields (runtime check failed, though types might say otherwise)');
    }
  } else {
    console.log('⚠️ No configuration found, skipping field check.');
  }

  // 2. Verify Email Templates
  const templates = await prisma.emailTemplate.findMany({
    where: {
      name: { in: ['booking_cancellation_fee', 'booking_cancellation_no_fee'] }
    }
  });

  if (templates.length === 2) {
    console.log('✅ Email templates found:');
    templates.forEach(t => console.log(`   - ${t.name}`));
  } else {
    console.error(`❌ Expected 2 templates, found ${templates.length}`);
    templates.forEach(t => console.log(`   - ${t.name}`));
    process.exit(1);
  }

  console.log('✅ Verification complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
