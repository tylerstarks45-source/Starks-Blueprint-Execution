---
name: Stripe Integration
description: How Stripe is wired in SBEP — Replit connector pattern, price IDs, webhook setup
---

# Stripe Integration

**Why:** Replit Stripe connector manages OAuth and key rotation automatically. Using raw `STRIPE_SECRET_KEY` env var would break on key rotation and misses dev/prod environment switching.

**How to apply:** Always use `getUncachableStripeClient()` from `artifacts/api-server/src/lib/stripe.ts`. Never cache the returned client — call the function fresh on every request.

## Price IDs (already created in Stripe sandbox)
- Builder $29/mo: `STRIPE_PRICE_BUILDER` env var set → `price_1TdqKEBhFuRC5zsatuPvx0BQ`
- Operator $99/mo: `STRIPE_PRICE_OPERATOR` env var set → `price_1TdqKFBhFuRC5zsaLxRZ6BsR`
- Empire $499/mo: `STRIPE_PRICE_EMPIRE` env var set → `price_1TdqKFBhFuRC5zsaDxyPxCEM`

## Webhook
- Route: `POST /api/stripe/webhook`
- Raw body captured in `app.ts` before JSON parser (checks `req.path === "/api/stripe/webhook"`)
- Webhook secret: set `STRIPE_WEBHOOK_SECRET` env var from Stripe Dashboard → Webhooks
- Events handled: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_succeeded`
- On success: updates `subscriptions` table + sets `users.membershipTier` + `users.membershipStatus`

## Flow
1. User clicks upgrade → `POST /api/subscriptions/checkout` → returns Stripe hosted checkout URL
2. User completes payment on Stripe → webhook fires → `membershipTier` updated in DB
3. Frontend reads `membershipTier` from auth context to gate features

## Gating
- `starter` tier → blocked from AI Build Agent, redirected to `/pricing`
- Check: `currentUser?.membershipTier === 'starter'` in BuildPage.jsx
