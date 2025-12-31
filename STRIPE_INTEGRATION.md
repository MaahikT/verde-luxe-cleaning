# Stripe Payment Integration

This document describes the Stripe payment integration implemented in this application.

## Overview

The payment system uses Stripe's Payment Intents API with the following features:

- **Secure card collection** using Stripe Elements
- **PCI compliance** - card details never touch our servers
- **Flexible payment flows** - supports immediate charge, authorize-and-capture-later, or storing cards on file
- **Customer management** - creates and tracks Stripe customers
- **Payment tracking** - records all payment details in our database

## Architecture

### Backend (tRPC Procedures)

Located in `src/server/trpc/procedures/payment/`:

1. **getPublishableKey** - Returns the Stripe publishable key to the frontend
2. **createStripeCustomer** - Creates or retrieves a Stripe customer for a user
3. **createPaymentIntent** - Creates a Stripe Payment Intent for a specific amount
4. **recordSuccessfulPayment** - Records a successful payment in the database

### Frontend Components

1. **PaymentForm** (`src/components/PaymentForm.tsx`) - Stripe Elements form for card collection
2. **Payment Page** (`src/routes/payment/index.tsx`) - Full payment flow page

### Database Schema

Added fields to support Stripe:

**User model:**
- `stripeCustomerId` - Links user to their Stripe customer record

**Payment model:**
- `stripePaymentIntentId` - Stripe Payment Intent ID
- `stripePaymentMethodId` - Stripe Payment Method ID
- `status` - Payment status (succeeded, pending, failed, requires_capture)
- `isCaptured` - Whether payment was captured immediately or authorized only

## Configuration

### Environment Variables

Add to `.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**IMPORTANT:** The current keys in `.env` are placeholders. You must replace them with real Stripe test keys from your Stripe Dashboard (https://dashboard.stripe.com/test/apikeys).

### Getting Stripe Keys

1. Sign up for a Stripe account at https://stripe.com
2. Go to Developers > API keys
3. Copy your "Publishable key" and "Secret key" (use test mode keys for development)
4. Replace the placeholder values in `.env`

## Usage

### Basic Payment Flow

To initiate a payment, navigate to:

```
/payment?amount=100&bookingId=1
```

Query parameters:
- `amount` - Amount in dollars (default: 100)
- `bookingId` - ID of the booking to associate payment with (default: 1)

The page will:
1. Check authentication
2. Create a Stripe Payment Intent
3. Display the payment form with Stripe Elements
4. Process the payment when submitted
5. Record the payment in the database
6. Redirect to the client portal on success

### Programmatic Usage

From your code, you can create payment intents and process payments:

```typescript
const trpc = useTRPC();

// Create a payment intent
const createIntent = useMutation(
  trpc.payment.createPaymentIntent.mutationOptions()
);

const result = await createIntent.mutateAsync({
  authToken: "user_token",
  amount: 15000, // $150.00 in cents
  currency: "usd",
  bookingId: 123,
  captureMethod: "automatic", // or "manual" for authorize-only
});

// result.clientSecret is used to initialize Stripe Elements
```

## Payment Flows

### 1. Immediate Charge (Default)

Charges the card immediately when payment is confirmed.

```typescript
createPaymentIntent.mutate({
  authToken,
  amount: 10000, // $100.00
  captureMethod: "automatic", // Default
  bookingId: 1,
});
```

### 2. Authorize and Capture Later

Authorizes the payment but doesn't charge until you manually capture it later.

```typescript
// Step 1: Create payment intent with manual capture
createPaymentIntent.mutate({
  authToken,
  amount: 10000,
  captureMethod: "manual",
  bookingId: 1,
});

// Step 2: Customer completes payment (authorized but not charged)
// Payment record will have isCaptured: false, status: "requires_capture"

// Step 3: Later, capture the payment using Stripe API
// (You'll need to implement a capture procedure)
```

### 3. Store Card on File

To save a card for future use without charging:

```typescript
// Step 1: Create customer
const customer = await createStripeCustomer.mutateAsync({
  authToken,
  email: "customer@example.com",
});

// Step 2: Create a setup intent instead of payment intent
// (You'll need to implement setupIntent procedures for this flow)
```

## Testing

### Test Cards

Use these test card numbers in the payment form:

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires authentication:** 4000 0025 0000 3155

Use any future expiration date, any 3-digit CVC, and any ZIP code.

### Test Flow

1. Log in to the application
2. Navigate to `/payment?amount=50&bookingId=1`
3. Enter test card: 4242 4242 4242 4242
4. Enter any future date and CVC
5. Submit payment
6. Verify success message
7. Check database for Payment record with Stripe IDs

## Integration with Booking Flow

To integrate payment into your booking creation:

```typescript
// 1. Create the booking
const booking = await createBookingAdmin.mutateAsync({
  authToken,
  // ... booking details
});

// 2. Calculate the price
const price = await calculateBookingPrice.mutateAsync({
  authToken,
  // ... pricing parameters
});

// 3. Redirect to payment page
navigate({
  to: "/payment",
  search: {
    amount: price.totalPrice,
    bookingId: booking.booking.id,
  },
});
```

## Security Best Practices

1. **Never log Stripe secret keys** - they're loaded from environment variables only
2. **Validate amounts server-side** - the frontend amount is just for display
3. **Verify payment status** - always check with Stripe before marking as paid
4. **Use HTTPS** - Stripe requires HTTPS in production
5. **Rotate keys regularly** - especially if compromised

## Error Handling

The system handles common errors:

- **Authentication errors** - Redirects to login
- **Stripe API errors** - Displays user-friendly messages
- **Network errors** - Shows retry option
- **Invalid card** - Shows Stripe's validation messages

## Webhooks (Future Enhancement)

For production, you should implement Stripe webhooks to handle:

- Payment success/failure notifications
- Disputed charges
- Refunds
- Subscription events (if using subscriptions)

Create an endpoint at `/api/webhooks/stripe` to receive these events.

## Production Checklist

Before going live:

- [ ] Replace test keys with live Stripe keys
- [ ] Set up Stripe webhooks
- [ ] Implement proper error logging
- [ ] Add payment receipt emails
- [ ] Test with real cards in test mode
- [ ] Review Stripe's compliance requirements
- [ ] Set up proper refund procedures
- [ ] Implement capture procedure for manual capture flow
- [ ] Add payment history views for customers
- [ ] Set up Stripe Dashboard monitoring

## Extending the System

### Adding Refunds

Create a new procedure:

```typescript
// src/server/trpc/procedures/payment/refundPayment.ts
export const refundPayment = baseProcedure
  .input(z.object({
    authToken: z.string(),
    paymentIntentId: z.string(),
    amount: z.number().optional(), // Partial refund
  }))
  .mutation(async ({ input }) => {
    // Verify authorization
    // Call stripe.refunds.create()
    // Update database
  });
```

### Adding Subscriptions

For recurring payments, implement:

1. Subscription creation procedure
2. Subscription management UI
3. Webhook handling for subscription events
4. Billing portal integration

### Adding Payment Methods

To support more payment methods (ACH, Apple Pay, etc.):

1. Enable them in Stripe Dashboard
2. They'll automatically appear in the Payment Element
3. No code changes needed (Stripe handles it)

## Support

For Stripe-specific issues, refer to:
- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Testing: https://stripe.com/docs/testing
