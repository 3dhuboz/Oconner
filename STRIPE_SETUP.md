# Stripe Payment Setup Guide

## Pricing Structure

Your application uses the following pricing model:

- **$1,500** - One-time setup fee (paid at signup)
- **$79/month** - Base subscription (includes 1 admin license + 1 tech license)
- **$10/month** - Per additional technician license

## Stripe Product Configuration

You need to create the following products in your Stripe Dashboard:

### 1. Setup Fee Product

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → Products
2. Click "Add product"
3. Configure:
   - **Name**: "Wirez R Us - Setup Fee"
   - **Description**: "One-time setup and onboarding fee"
   - **Pricing**: One-time payment
   - **Price**: $1,500.00 USD
4. Click "Save product"
5. **Copy the Price ID** (starts with `price_...`)

### 2. Base Subscription Product

1. In Products, click "Add product"
2. Configure:
   - **Name**: "Wirez R Us - Base Subscription"
   - **Description**: "Monthly subscription (includes 1 admin + 1 tech license)"
   - **Pricing**: Recurring
   - **Billing period**: Monthly
   - **Price**: $79.00 USD
3. Click "Save product"
4. **Copy the Price ID** (starts with `price_...`)

### 3. Additional Tech License Product

1. In Products, click "Add product"
2. Configure:
   - **Name**: "Wirez R Us - Additional Tech License"
   - **Description**: "Additional technician license (per month)"
   - **Pricing**: Recurring
   - **Billing period**: Monthly
   - **Price**: $10.00 USD
3. Click "Save product"
4. **Copy the Price ID** (starts with `price_...`)

## Environment Variables

Add these to your `.env` file and Vercel environment variables:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from products created above)
STRIPE_SETUP_FEE_PRICE_ID=price_...
STRIPE_BASE_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_ADDITIONAL_TECH_PRICE_ID=price_...
```

## Checkout Flow

### New Customer Signup

When a new customer signs up, create a checkout session with:

1. **Setup fee** (one-time): `STRIPE_SETUP_FEE_PRICE_ID` × 1
2. **Base subscription** (recurring): `STRIPE_BASE_SUBSCRIPTION_PRICE_ID` × 1

```javascript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [
    {
      price: process.env.STRIPE_SETUP_FEE_PRICE_ID,
      quantity: 1,
    },
    {
      price: process.env.STRIPE_BASE_SUBSCRIPTION_PRICE_ID,
      quantity: 1,
    },
  ],
  mode: 'subscription', // Handles both one-time and recurring
  success_url: `${process.env.APP_URL}/billing?success=true`,
  cancel_url: `${process.env.APP_URL}/billing?canceled=true`,
  customer_email: userEmail,
  metadata: {
    tenantId: tenantId,
    adminLicenses: 1,
    techLicenses: 1,
  },
});
```

### Adding Additional Tech Licenses

When a customer wants to add more tech licenses:

```javascript
// Get their existing subscription
const subscription = await stripe.subscriptions.retrieve(subscriptionId);

// Add additional tech license items
await stripe.subscriptionItems.create({
  subscription: subscriptionId,
  price: process.env.STRIPE_ADDITIONAL_TECH_PRICE_ID,
  quantity: numberOfAdditionalTechs,
});
```

## Webhook Handling

Set up a webhook endpoint to handle these events:

### Important Events

1. **`checkout.session.completed`**
   - Customer completed payment
   - Create tenant record in Firestore
   - Activate licenses (1 admin + 1 tech)
   - Send welcome email

2. **`customer.subscription.updated`**
   - Subscription modified (licenses added/removed)
   - Update tenant record in Firestore
   - Update license counts

3. **`customer.subscription.deleted`**
   - Subscription cancelled
   - Suspend tenant account
   - Notify admin

4. **`invoice.payment_failed`**
   - Payment failed
   - Send payment reminder
   - Suspend account after grace period

### Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for (listed above)
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to environment variables as `STRIPE_WEBHOOK_SECRET`

## Testing

### Test Mode

Use Stripe test mode for development:

- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any postal code

### Test Scenarios

1. **New signup**: Should charge $1,579 ($1,500 setup + $79 first month)
2. **Add 2 techs**: Should add $20/month to subscription
3. **Cancel subscription**: Should suspend account but keep data
4. **Payment failure**: Should notify and give grace period

## Security Notes

- Never expose `STRIPE_SECRET_KEY` in client-side code
- Always verify webhook signatures using `STRIPE_WEBHOOK_SECRET`
- Use `VITE_STRIPE_PUBLISHABLE_KEY` for client-side Stripe.js
- Store Stripe customer IDs and subscription IDs in Firestore for reference

## Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

For application issues:
- Contact Penny Wise I.T: [Facebook](https://www.facebook.com/pennywiseitoz)
