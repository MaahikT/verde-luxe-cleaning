import { db } from "~/server/db";
import { Prisma } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { env } from "~/server/env";

function generateTemporaryPassword(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function assignTemporaryPasswordsToClients() {
  console.log("Checking for clients without temporary passwords...");
  
  // Find all CLIENT users who don't have a temporary password
  const clientsWithoutTempPassword = await db.user.findMany({
    where: {
      role: "CLIENT",
      temporaryPassword: null,
    },
  });

  console.log(`Found ${clientsWithoutTempPassword.length} clients without temporary passwords`);

  let assignedCount = 0;
  
  for (const client of clientsWithoutTempPassword) {
    const tempPassword = generateTemporaryPassword(8);
    
    await db.user.update({
      where: { id: client.id },
      data: {
        temporaryPassword: tempPassword,
        hasResetPassword: false,
      },
    });
    
    assignedCount++;
    console.log(`Assigned temporary password to client: ${client.email} (${client.firstName} ${client.lastName}) - Temp Password: ${tempPassword}`);
  }

  console.log(`Successfully assigned ${assignedCount} temporary passwords to clients`);
}

async function assignDefaultColorsToCleaners() {
  console.log("Checking for cleaners without colors...");
  
  // Default color palette for cleaners
  const defaultColors = [
    "#FF6B6B", // Coral red
    "#4ECDC4", // Teal
    "#45B7D1", // Sky blue
    "#96CEB4", // Sage green
    "#FFEAA7", // Pale yellow
    "#DFE6E9", // Light gray
    "#A29BFE", // Lavender
    "#FD79A8", // Pink
    "#FDCB6E", // Orange
    "#6C5CE7", // Purple
  ];
  
  // Find all CLEANER users who don't have a color
  const cleanersWithoutColor = await db.user.findMany({
    where: {
      role: "CLEANER",
      color: null,
    },
  });

  console.log(`Found ${cleanersWithoutColor.length} cleaners without colors`);

  let assignedCount = 0;
  
  for (let i = 0; i < cleanersWithoutColor.length; i++) {
    const cleaner = cleanersWithoutColor[i];
    // Cycle through the color palette
    const color = defaultColors[i % defaultColors.length];
    
    await db.user.update({
      where: { id: cleaner.id },
      data: { color },
    });
    
    assignedCount++;
    console.log(`Assigned color ${color} to cleaner: ${cleaner.email} (${cleaner.firstName} ${cleaner.lastName})`);
  }

  console.log(`Successfully assigned ${assignedCount} colors to cleaners`);
}

async function migrateTimeOffRequestDates() {
  console.log("Migrating time-off request dates to corrected format...");
  
  // Find all time-off requests
  const allRequests = await db.timeOffRequest.findMany();
  
  console.log(`Found ${allRequests.length} time-off requests to check`);
  
  let migratedCount = 0;
  
  for (const request of allRequests) {
    // Check if this request uses the old format (00:00:00.000Z timestamps)
    const startHour = request.startDate.getUTCHours();
    const endHour = request.endDate.getUTCHours();
    
    // Old format has 00:00:00.000Z (hour 0), new format has 12:00:00.000Z (hour 12)
    if (startHour === 0 || endHour === 0) {
      // This request needs migration
      
      // Create new dates with 12:00:00.000Z time component
      // Keep the dates as inclusive (don't add 1 day to end date)
      const newStartDate = new Date(request.startDate);
      newStartDate.setUTCHours(12, 0, 0, 0);
      
      const newEndDate = new Date(request.endDate);
      newEndDate.setUTCHours(12, 0, 0, 0);
      
      await db.timeOffRequest.update({
        where: { id: request.id },
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
        },
      });
      
      migratedCount++;
      console.log(
        `Migrated request #${request.id}: ` +
        `${request.startDate.toISOString()} → ${newStartDate.toISOString()}, ` +
        `${request.endDate.toISOString()} → ${newEndDate.toISOString()}`
      );
    }
  }
  
  console.log(`Successfully migrated ${migratedCount} time-off requests to new date format`);
}

async function migrateAdminPermissions() {
  console.log("Migrating admin permissions...");
  
  // Set all permissions for OWNER users
  const owners = await db.user.findMany({
    where: { role: "OWNER" },
  });

  const allPermissions = {
    manage_bookings: true,
    manage_customers: true,
    manage_cleaners: true,
    manage_admins: true,
    manage_checklists: true,
    manage_pricing: true,
    view_reports: true,
    manage_time_off_requests: true,
  };

  for (const owner of owners) {
    await db.user.update({
      where: { id: owner.id },
      data: { adminPermissions: allPermissions },
    });
    console.log(`Set all permissions for owner: ${owner.email}`);
  }

  // Set empty permissions for ADMIN users who don't have any
  const adminsWithoutPermissions = await db.user.findMany({
    where: {
      role: "ADMIN",
      adminPermissions: { equals: Prisma.DbNull },
    },
  });

  for (const admin of adminsWithoutPermissions) {
    await db.user.update({
      where: { id: admin.id },
      data: { adminPermissions: {} },
    });
    console.log(`Set empty permissions for admin: ${admin.email}`);
  }

  console.log("Admin permissions migration complete");
}

async function migratePaymentMethodEnum() {
  console.log("Migrating PaymentMethod enum values from SAVED_CARD to CREDIT_CARD...");
  
  // Find bookings using the deprecated enum value
  // Use 'as any' to bypass TypeScript type checking on the old enum value
  const bookingsToMigrate = await db.booking.findMany({
    where: {
      paymentMethod: "SAVED_CARD" as any,
    },
  });

  if (bookingsToMigrate.length === 0) {
    console.log("No bookings found with SAVED_CARD payment method. Migration skipped.");
    return;
  }

  console.log(`Found ${bookingsToMigrate.length} bookings with SAVED_CARD payment method`);

  const bookingIds = bookingsToMigrate.map(b => b.id);
  
  // Update all affected bookings
  const updateResult = await db.booking.updateMany({
    where: {
      id: { in: bookingIds },
    },
    data: {
      paymentMethod: "CREDIT_CARD",
    },
  });

  console.log(`Successfully migrated ${updateResult.count} bookings from SAVED_CARD to CREDIT_CARD`);
}

async function initializeConfiguration() {
  console.log("Initializing configuration...");
  
  // Check if configuration record exists
  const existingConfig = await db.configuration.findFirst();
  
  if (!existingConfig) {
    // Create default configuration
    await db.configuration.create({
      data: {
        paymentHoldDelayHours: null, // Default: place holds immediately
      },
    });
    console.log("Created default configuration record");
  } else {
    console.log("Configuration already exists");
  }
}

async function setup() {
  console.log("Running setup script...");

  // Migrate payment method enum values first (before any other operations)
  await migratePaymentMethodEnum();

  // Initialize configuration
  await initializeConfiguration();

  // Hash password for owner user from environment variable
  const ownerHashedPassword = await bcryptjs.hash(env.ADMIN_PASSWORD, 10);

  // Check if owner user exists
  const existingOwner = await db.user.findUnique({
    where: { email: "owner@example.com" },
  });

  if (existingOwner) {
    // Update the owner user's password to match the environment variable
    await db.user.update({
      where: { email: "owner@example.com" },
      data: { password: ownerHashedPassword },
    });
    console.log("Updated owner user password to match ADMIN_PASSWORD environment variable");
    console.log("\n=== Owner Login Credentials ===");
    console.log(`Email: owner@example.com | Password: ${env.ADMIN_PASSWORD}`);
    console.log("================================\n");
    
    // Migrate admin permissions
    await migrateAdminPermissions();
    
    // Assign temporary passwords to existing clients without them
    await assignTemporaryPasswordsToClients();
    
    // Assign default colors to existing cleaners without them
    await assignDefaultColorsToCleaners();
    
    // Migrate time-off request dates to corrected format
    await migrateTimeOffRequestDates();
    
    // Still need to check if existing bookings need checklists attached
    await attachChecklistsToExistingBookings();
    return;
  }

  // Check if we already have users (but no owner)
  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    console.log("Database already has users but no owner, creating owner user...");
    
    await db.user.create({
      data: {
        email: "owner@example.com",
        password: ownerHashedPassword,
        role: "OWNER",
        firstName: "Owner",
        lastName: "User",
        phone: "+1 (555) 999-0000",
      },
    });
    console.log("Created owner user");
    console.log("\n=== Owner Login Credentials ===");
    console.log(`Email: owner@example.com | Password: ${env.ADMIN_PASSWORD}`);
    console.log("================================\n");
    
    // Migrate admin permissions
    await migrateAdminPermissions();
    
    // Assign temporary passwords to existing clients without them
    await assignTemporaryPasswordsToClients();
    
    // Assign default colors to existing cleaners without them
    await assignDefaultColorsToCleaners();
    
    // Migrate time-off request dates to corrected format
    await migrateTimeOffRequestDates();
    
    // Still need to check if existing bookings need checklists attached
    await attachChecklistsToExistingBookings();
    return;
  }

  console.log("Seeding database with sample data...");

  // Hash password for sample users (clients and cleaners)
  const sampleHashedPassword = await bcryptjs.hash("password123", 10);

  // Create clients
  const client1 = await db.user.create({
    data: {
      email: "client1@example.com",
      password: sampleHashedPassword,
      role: "CLIENT",
      firstName: "John",
      lastName: "Doe",
      phone: "+1 (555) 123-4567",
    },
  });

  const client2 = await db.user.create({
    data: {
      email: "client2@example.com",
      password: sampleHashedPassword,
      role: "CLIENT",
      firstName: "Jane",
      lastName: "Smith",
      phone: "+1 (555) 234-5678",
    },
  });

  // Create cleaners
  const cleaner1 = await db.user.create({
    data: {
      email: "cleaner1@example.com",
      password: sampleHashedPassword,
      role: "CLEANER",
      firstName: "Maria",
      lastName: "Garcia",
      phone: "+1 (555) 345-6789",
      color: "#FF6B6B", // Coral red
    },
  });

  const cleaner2 = await db.user.create({
    data: {
      email: "cleaner2@example.com",
      password: sampleHashedPassword,
      role: "CLEANER",
      firstName: "Carlos",
      lastName: "Rodriguez",
      phone: "+1 (555) 456-7890",
      color: "#4ECDC4", // Teal
    },
  });

  // Create owner
  const owner = await db.user.create({
    data: {
      email: "owner@example.com",
      password: ownerHashedPassword,
      role: "OWNER",
      firstName: "Owner",
      lastName: "User",
      phone: "+1 (555) 999-0000",
      adminPermissions: {
        manage_bookings: true,
        manage_customers: true,
        manage_cleaners: true,
        manage_admins: true,
        manage_checklists: true,
        manage_pricing: true,
        view_reports: true,
        manage_time_off_requests: true,
      },
    },
  });

  console.log("Created sample users");

  // Create checklist templates BEFORE creating bookings
  // This ensures templates are available when bookings are created
  console.log("Creating checklist templates...");
  
  const standardCleaningTemplate = await db.checklistTemplate.create({
    data: {
      name: "Standard Home Cleaning Checklist",
      serviceType: "Standard Home Cleaning",
      items: {
        create: [
          { description: "Vacuum all carpets and rugs", order: 1 },
          { description: "Mop all hard floors", order: 2 },
          { description: "Dust all surfaces and furniture", order: 3 },
          { description: "Clean kitchen counters and appliances", order: 4 },
          { description: "Clean and sanitize bathrooms", order: 5 },
          { description: "Empty all trash bins", order: 6 },
          { description: "Wipe down light switches and door handles", order: 7 },
          { description: "Clean mirrors and glass surfaces", order: 8 },
        ],
      },
    },
  });

  const deepCleaningTemplate = await db.checklistTemplate.create({
    data: {
      name: "Deep Home Cleaning Checklist",
      serviceType: "Deep Home Cleaning",
      items: {
        create: [
          { description: "Vacuum all carpets and rugs thoroughly", order: 1 },
          { description: "Mop and scrub all hard floors", order: 2 },
          { description: "Dust and wipe all surfaces, baseboards, and crown molding", order: 3 },
          { description: "Clean inside kitchen cabinets and drawers", order: 4 },
          { description: "Deep clean kitchen appliances (oven, refrigerator, microwave)", order: 5 },
          { description: "Scrub and sanitize all bathrooms including grout", order: 6 },
          { description: "Clean inside windows and window sills", order: 7 },
          { description: "Dust ceiling fans and light fixtures", order: 8 },
          { description: "Clean behind and under furniture", order: 9 },
          { description: "Wipe down all doors and door frames", order: 10 },
          { description: "Empty and sanitize all trash bins", order: 11 },
          { description: "Vacuum upholstered furniture", order: 12 },
        ],
      },
    },
  });

  const vacationRentalTemplate = await db.checklistTemplate.create({
    data: {
      name: "Vacation Rental Cleaning Checklist",
      serviceType: "Vacation Rental Cleaning",
      items: {
        create: [
          { description: "Strip and remake all beds with fresh linens", order: 1 },
          { description: "Wash and replace all towels", order: 2 },
          { description: "Vacuum all floors and carpets", order: 3 },
          { description: "Mop all hard floors", order: 4 },
          { description: "Clean and sanitize kitchen thoroughly", order: 5 },
          { description: "Clean and sanitize all bathrooms", order: 6 },
          { description: "Dust all surfaces and furniture", order: 7 },
          { description: "Empty all trash bins and replace liners", order: 8 },
          { description: "Check and restock supplies (toilet paper, paper towels, soap)", order: 9 },
          { description: "Clean mirrors and glass surfaces", order: 10 },
          { description: "Inspect for damage or missing items", order: 11 },
        ],
      },
    },
  });

  const moveInOutTemplate = await db.checklistTemplate.create({
    data: {
      name: "Move-In/Out Cleaning Checklist",
      serviceType: "Move-In/Out Cleaning",
      items: {
        create: [
          { description: "Deep clean all rooms including baseboards and corners", order: 1 },
          { description: "Clean inside all cabinets and drawers", order: 2 },
          { description: "Deep clean all appliances (oven, refrigerator, dishwasher, microwave)", order: 3 },
          { description: "Scrub and sanitize all bathrooms including grout", order: 4 },
          { description: "Clean inside windows and window sills", order: 5 },
          { description: "Vacuum and mop all floors thoroughly", order: 6 },
          { description: "Dust ceiling fans, light fixtures, and vents", order: 7 },
          { description: "Wipe down all doors, door frames, and light switches", order: 8 },
          { description: "Clean inside closets", order: 9 },
          { description: "Remove all trash and debris", order: 10 },
        ],
      },
    },
  });

  const postConstructionTemplate = await db.checklistTemplate.create({
    data: {
      name: "Post-Construction Cleaning Checklist",
      serviceType: "Post-Construction Cleaning",
      items: {
        create: [
          { description: "Remove all construction debris and materials", order: 1 },
          { description: "Vacuum and remove dust from all surfaces", order: 2 },
          { description: "Clean windows inside and out, removing stickers and labels", order: 3 },
          { description: "Wipe down all baseboards, trim, and molding", order: 4 },
          { description: "Clean and polish all fixtures and hardware", order: 5 },
          { description: "Deep clean kitchen including inside cabinets", order: 6 },
          { description: "Deep clean all bathrooms including grout", order: 7 },
          { description: "Remove paint splatters and adhesive residue", order: 8 },
          { description: "Vacuum and mop all floors multiple times", order: 9 },
          { description: "Clean air vents and replace filters if needed", order: 10 },
          { description: "Final walkthrough and touch-ups", order: 11 },
        ],
      },
    },
  });

  const commercialCleaningTemplate = await db.checklistTemplate.create({
    data: {
      name: "Commercial Cleaning Checklist",
      serviceType: "Commercial Cleaning",
      items: {
        create: [
          { description: "Vacuum all carpeted areas", order: 1 },
          { description: "Mop all hard floor surfaces", order: 2 },
          { description: "Empty and replace trash bin liners", order: 3 },
          { description: "Clean and sanitize restrooms", order: 4 },
          { description: "Restock restroom supplies", order: 5 },
          { description: "Dust all surfaces, desks, and furniture", order: 6 },
          { description: "Clean break room and kitchen area", order: 7 },
          { description: "Wipe down door handles and light switches", order: 8 },
          { description: "Clean glass doors and windows", order: 9 },
          { description: "Spot clean walls and remove marks", order: 10 },
        ],
      },
    },
  });

  console.log("Created checklist templates");

  // Create default pricing rules
  console.log("Creating default pricing rules...");
  
  // Base prices for different service types
  await db.pricingRule.create({
    data: {
      name: "Standard Cleaning - Base Price",
      ruleType: "BASE_PRICE",
      serviceType: "Standard Home Cleaning",
      priceAmount: 80.0,
      timeAmount: 2.0,
      isActive: true,
      displayOrder: 1,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Deep Cleaning - Base Price",
      ruleType: "BASE_PRICE",
      serviceType: "Deep Home Cleaning",
      priceAmount: 150.0,
      timeAmount: 3.0,
      isActive: true,
      displayOrder: 2,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Vacation Rental - Base Price",
      ruleType: "BASE_PRICE",
      serviceType: "Vacation Rental Cleaning",
      priceAmount: 100.0,
      timeAmount: 2.5,
      isActive: true,
      displayOrder: 3,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Move-In/Out - Base Price",
      ruleType: "BASE_PRICE",
      serviceType: "Move-In/Out Cleaning",
      priceAmount: 200.0,
      timeAmount: 4.0,
      isActive: true,
      displayOrder: 4,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Post-Construction - Base Price",
      ruleType: "BASE_PRICE",
      serviceType: "Post Construction Cleaning",
      priceAmount: 250.0,
      timeAmount: 5.0,
      isActive: true,
      displayOrder: 5,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Commercial - Base Price",
      ruleType: "BASE_PRICE",
      serviceType: "Commercial Cleaning",
      priceAmount: 120.0,
      timeAmount: 3.0,
      isActive: true,
      displayOrder: 6,
    },
  });

  // Square footage rates (applies to all service types)
  await db.pricingRule.create({
    data: {
      name: "Square Footage Rate",
      ruleType: "SQFT_RATE",
      serviceType: null, // Applies to all service types
      ratePerUnit: 0.08, // $0.08 per square foot
      timePerUnit: 0.0008, // ~0.05 hours per 60 sqft
      isActive: true,
      displayOrder: 10,
    },
  });

  // Bedroom rates
  await db.pricingRule.create({
    data: {
      name: "Per Bedroom Rate",
      ruleType: "BEDROOM_RATE",
      serviceType: null, // Applies to all service types
      ratePerUnit: 15.0, // $15 per bedroom
      timePerUnit: 0.25, // 15 minutes per bedroom
      isActive: true,
      displayOrder: 20,
    },
  });

  // Bathroom rates
  await db.pricingRule.create({
    data: {
      name: "Per Bathroom Rate",
      ruleType: "BATHROOM_RATE",
      serviceType: null, // Applies to all service types
      ratePerUnit: 20.0, // $20 per bathroom
      timePerUnit: 0.5, // 30 minutes per bathroom
      isActive: true,
      displayOrder: 30,
    },
  });

  // Extra services
  await db.pricingRule.create({
    data: {
      name: "Oven Cleaning",
      ruleType: "EXTRA_SERVICE",
      serviceType: null,
      extraName: "Oven Cleaning",
      extraDescription: "Deep clean inside of oven, including racks and door",
      priceAmount: 35.0,
      timeAmount: 0.5,
      isActive: true,
      displayOrder: 100,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Refrigerator Cleaning",
      ruleType: "EXTRA_SERVICE",
      serviceType: null,
      extraName: "Refrigerator Cleaning",
      extraDescription: "Clean inside and outside of refrigerator",
      priceAmount: 30.0,
      timeAmount: 0.5,
      isActive: true,
      displayOrder: 101,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Window Cleaning (Interior)",
      ruleType: "EXTRA_SERVICE",
      serviceType: null,
      extraName: "Window Cleaning (Interior)",
      extraDescription: "Clean all interior windows and window sills",
      priceAmount: 40.0,
      timeAmount: 0.75,
      isActive: true,
      displayOrder: 102,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Laundry Service",
      ruleType: "EXTRA_SERVICE",
      serviceType: null,
      extraName: "Laundry Service",
      extraDescription: "Wash, dry, and fold one load of laundry",
      priceAmount: 25.0,
      timeAmount: 1.0,
      isActive: true,
      displayOrder: 103,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Carpet Shampooing",
      ruleType: "EXTRA_SERVICE",
      serviceType: null,
      extraName: "Carpet Shampooing",
      extraDescription: "Deep clean carpets with shampooing machine (per room)",
      priceAmount: 50.0,
      timeAmount: 0.75,
      isActive: true,
      displayOrder: 104,
    },
  });

  await db.pricingRule.create({
    data: {
      name: "Cabinet Interior Cleaning",
      ruleType: "EXTRA_SERVICE",
      serviceType: null,
      extraName: "Cabinet Interior Cleaning",
      extraDescription: "Clean inside all kitchen cabinets and drawers",
      priceAmount: 45.0,
      timeAmount: 1.0,
      isActive: true,
      displayOrder: 105,
    },
  });

  console.log("Created default pricing rules");

  // Create sample bookings
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  // Upcoming booking for client1
  const booking1 = await db.booking.create({
    data: {
      clientId: client1.id,
      cleanerId: cleaner1.id,
      serviceType: "Standard Home Cleaning",
      scheduledDate: tomorrow,
      scheduledTime: "10:00 AM",
      durationHours: 3,
      address: "123 Main Street, Ann Arbor, MI 48103",
      specialInstructions: "Please focus on the kitchen and bathrooms",
      status: "CONFIRMED",
      finalPrice: 150.0,
      serviceFrequency: "WEEKLY",
      houseSquareFootage: 1800,
      basementSquareFootage: 600,
      numberOfBedrooms: 3,
      numberOfBathrooms: 2,
      numberOfCleanersRequested: 1,
      cleanerPaymentAmount: 90.0,
      paymentMethod: "CREDIT_CARD",
      paymentDetails: "Last 4: 1234",
    },
  });

  // Pending booking for client1
  const booking2 = await db.booking.create({
    data: {
      clientId: client1.id,
      cleanerId: null,
      serviceType: "Deep Home Cleaning",
      scheduledDate: nextWeek,
      scheduledTime: "2:00 PM",
      durationHours: 5,
      address: "123 Main Street, Ann Arbor, MI 48103",
      status: "PENDING",
      finalPrice: 300.0,
      serviceFrequency: "ONE_TIME",
      houseSquareFootage: 1800,
      basementSquareFootage: 600,
      numberOfBedrooms: 3,
      numberOfBathrooms: 2,
      numberOfCleanersRequested: 2,
      cleanerPaymentAmount: 180.0,
    },
  });

  // Completed booking for client1
  const booking3 = await db.booking.create({
    data: {
      clientId: client1.id,
      cleanerId: cleaner1.id,
      serviceType: "Standard Home Cleaning",
      scheduledDate: lastWeek,
      scheduledTime: "9:00 AM",
      durationHours: 3,
      address: "123 Main Street, Ann Arbor, MI 48103",
      status: "COMPLETED",
      finalPrice: 150.0,
      serviceFrequency: "WEEKLY",
      houseSquareFootage: 1800,
      numberOfBedrooms: 3,
      numberOfBathrooms: 2,
      numberOfCleanersRequested: 1,
      cleanerPaymentAmount: 90.0,
      paymentMethod: "CREDIT_CARD",
    },
  });

  // Upcoming booking for client2
  const booking4 = await db.booking.create({
    data: {
      clientId: client2.id,
      cleanerId: cleaner2.id,
      serviceType: "Vacation Rental Cleaning",
      scheduledDate: tomorrow,
      scheduledTime: "3:00 PM",
      durationHours: 2,
      address: "456 Oak Avenue, Ypsilanti, MI 48197",
      specialInstructions: "Check-out cleaning, change all linens",
      status: "CONFIRMED",
      finalPrice: 120.0,
      serviceFrequency: "ONE_TIME",
      houseSquareFootage: 1200,
      numberOfBedrooms: 2,
      numberOfBathrooms: 1,
      numberOfCleanersRequested: 1,
      cleanerPaymentAmount: 72.0,
      paymentMethod: "CASH",
    },
  });

  // In progress booking for client2
  const booking5 = await db.booking.create({
    data: {
      clientId: client2.id,
      cleanerId: cleaner2.id,
      serviceType: "Commercial Cleaning",
      scheduledDate: today,
      scheduledTime: "8:00 AM",
      durationHours: 4,
      address: "789 Business Park, Ann Arbor, MI 48104",
      status: "IN_PROGRESS",
      finalPrice: 250.0,
      houseSquareFootage: 3500,
      numberOfCleanersRequested: 2,
      cleanerPaymentAmount: 150.0,
      paymentMethod: "CREDIT_CARD",
      paymentDetails: "Invoice #12345",
    },
  });

  console.log("Created sample bookings");

  // Now attach checklists to all the bookings we just created
  await attachChecklistsToExistingBookings();

  // Create sample payments
  await db.payment.create({
    data: {
      bookingId: booking3.id,
      cleanerId: cleaner1.id,
      amount: 90.0, // 60% of booking price for cleaner
      paidAt: new Date(),
      description: "Payment for completed cleaning service",
    },
  });

  await db.payment.create({
    data: {
      bookingId: booking1.id,
      cleanerId: cleaner1.id,
      amount: 90.0,
      paidAt: null, // Pending payment
      description: "Payment for upcoming cleaning service",
    },
  });

  console.log("Created sample payments");
  console.log("\n=== Sample Login Credentials ===");
  console.log("Owner:");
  console.log(`  Email: owner@example.com | Password: ${env.ADMIN_PASSWORD}`);
  console.log("\nClients:");
  console.log("  Email: client1@example.com | Password: password123");
  console.log("  Email: client2@example.com | Password: password123");
  console.log("\nCleaners:");
  console.log("  Email: cleaner1@example.com | Password: password123");
  console.log("  Email: cleaner2@example.com | Password: password123");
  console.log("================================\n");
  
  // Migrate admin permissions
  await migrateAdminPermissions();
  
  // Assign temporary passwords to all clients (including the sample ones we just created)
  await assignTemporaryPasswordsToClients();
  
  // Assign default colors to all cleaners (in case any are missing)
  await assignDefaultColorsToCleaners();
  
  // Migrate time-off request dates to corrected format (in case any exist)
  await migrateTimeOffRequestDates();
}

async function attachChecklistsToExistingBookings() {
  console.log("Checking for bookings that need checklists...");
  
  // Find all bookings that don't have a checklist
  const bookingsNeedingChecklists = await db.booking.findMany({
    where: {
      checklist: null,
    },
  });

  console.log(`Found ${bookingsNeedingChecklists.length} bookings without checklists`);

  let attachedCount = 0;
  
  for (const booking of bookingsNeedingChecklists) {
    // Find a matching template for this booking's service type
    const matchingTemplate = await db.checklistTemplate.findFirst({
      where: {
        serviceType: booking.serviceType,
      },
      include: {
        items: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (matchingTemplate && matchingTemplate.items.length > 0) {
      // Create a checklist for this booking
      await db.bookingChecklist.create({
        data: {
          bookingId: booking.id,
          templateId: matchingTemplate.id,
          items: {
            create: matchingTemplate.items.map((item) => ({
              description: item.description,
              order: item.order,
              isCompleted: false,
            })),
          },
        },
      });
      attachedCount++;
      console.log(`Attached checklist to booking #${booking.id} (${booking.serviceType})`);
    } else {
      console.log(`No matching template found for booking #${booking.id} (${booking.serviceType})`);
    }
  }

  console.log(`Successfully attached ${attachedCount} checklists to bookings`);
}

setup()
  .then(() => {
    console.log("setup.ts complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
