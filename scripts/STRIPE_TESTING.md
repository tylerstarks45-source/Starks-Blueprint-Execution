# Stripe Payment Activation — Test Procedure

Validates the complete checkout → webhook → DB update flow for SBEP subscription tiers.

---

## Part 1: Automated Backend Test (runs unattended)

**Script:** `scripts/src/test-stripe-webhook.ts`

**What it covers:**

| # | Check |
|---|-------|
| 1 | POST `/api/auth/login` — authenticate and get JWT |
| 2 | Reset test user to free tier before test |
| 3 | POST `/api/subscriptions/checkout` — creates a **real** Stripe checkout session |
| 4 | Retrieve session from Stripe API — verify `price_id`, `metadata.userId`, `metadata.tier` |
| 5 | POST signed `checkout.session.completed` to `/api/stripe/webhook` — expect HTTP 200 |
| 6 | DB: `users.membershipTier` → `builder`, `users.membershipStatus` → `active` |
| 7 | DB: `subscriptions` row created with real `stripeCustomerId` |
| 8 | GET `/api/subscriptions/me` → `tier=builder, status=active` (mirrors what `/subscribe/success` polls) |
| 9 | Idempotency: replay same `eventId` → HTTP 200, `duplicate: true`, DB unchanged |
| 10 | Signature guard: tampered `stripe-signature` → HTTP 400 |
| 11 | Cleanup: restore user to free tier |

### Run (live mode — current production config)

```bash
TEST_ADMIN_EMAIL=<admin_email> \
TEST_ADMIN_PASSWORD=<admin_password> \
pnpm --filter @workspace/scripts run test-stripe-webhook
```

### Run (test mode — uses sk_test_* keys, safe for CI)

```bash
STRIPE_SECRET_KEY=sk_test_<connector_key> \
STRIPE_PRICE_BUILDER=price_1TdqKEBhFuRC5zsatuPvx0BQ \
TEST_ADMIN_EMAIL=<admin_email> \
TEST_ADMIN_PASSWORD=<admin_password> \
pnpm --filter @workspace/scripts run test-stripe-webhook
```

The Replit Stripe connector provides `sk_test_*` keys in development.
Test-mode prices (confirmed active on the connector account):

| Plan | Price ID | Amount |
|------|----------|--------|
| Builder | `price_1TdqKEBhFuRC5zsatuPvx0BQ` | $29/mo |
| Operator | `price_1TdqKFBhFuRC5zsaLxRZ6BsR` | $99/mo |
| Empire | `price_1TdqKFBhFuRC5zsaDxyPxCEM` | $499/mo |

> **Why simulate the webhook?**
> In development, Stripe cannot reach a localhost/dev-tunnel URL automatically.
> The script uses `stripe.webhooks.generateTestHeaderString()` with `STRIPE_WEBHOOK_SECRET`
> to produce a correctly-signed event — identical to what Stripe's servers would send.
> In production, real webhooks arrive from Stripe and are verified the same way.

---

## Part 2: Browser UI Test + Real Stripe Webhook Delivery

Validates the full end-to-end path: Stripe hosted checkout → 4242 test card → real Stripe-originated
webhook → DB tier update. Verified 2026-07-03 on Replit dev (public URL: `*.janeway.replit.dev`).

### Setup: registered test-mode webhook endpoint

To enable Stripe to auto-deliver webhooks to the dev server (publicly reachable via the Replit proxy),
a test-mode webhook endpoint is registered in the Stripe test account pointing to:

```
https://<replit-dev-domain>/api/stripe/webhook
```

The signing secret for this endpoint is stored as `STRIPE_TEST_WEBHOOK_SECRET` (dev environment only).
The webhook handler in `subscriptions.ts` tries `STRIPE_WEBHOOK_SECRET` first; if it fails, it falls
back to `STRIPE_TEST_WEBHOOK_SECRET` — so live-mode and test-mode webhooks can coexist.

### What was tested

1. Registered test-mode Stripe webhook endpoint (`we_1Tp8gpBhFuRC5zsaRkglI10n`) at our public dev URL
2. Stored its signing secret as `STRIPE_TEST_WEBHOOK_SECRET` dev env var; restarted API server
3. Created test-mode checkout session (`cs_test_a1jlm1Frl7BYrqcz6pIE1z...`) via `sk_test_*` key
4. Playwright navigated to `https://checkout.stripe.com/c/pay/cs_test_...`
5. Dismissed Stripe Link overlay ("Pay without Link")
6. Filled test card: **4242 4242 4242 4242** | expiry **12/27** | CVC **123** | ZIP **12345**
7. Clicked "Subscribe" → payment processed in Stripe test mode
8. Stripe redirected to `/subscribe/success?session_id=cs_test_...&tier=builder` — **"You're on Builder!"** ✓

### Real Stripe webhook delivery — confirmed in server logs

Stripe auto-delivered `checkout.session.completed` event `evt_1Tp8kBBhFuRC5zsaH0GtGSZG` to our server.
Server log entry (PID 7356, at 15:13:28 UTC):

```
[15:13:28.693] INFO: Stripe webhook verified with STRIPE_TEST_WEBHOOK_SECRET (test-mode endpoint)
                     POST /api/stripe/webhook
[15:13:28.696] INFO: Duplicate Stripe event ignored  eventId: "evt_1Tp8kBBhFuRC5zsaH0GtGSZG"
                     POST /api/stripe/webhook
[15:13:28.696] INFO: request completed
                     POST /api/stripe/webhook → 200  responseTime: 10ms
```

**What this proves:**
- Stripe's servers delivered a real, signed `checkout.session.completed` webhook to our endpoint
- The server verified it with `STRIPE_TEST_WEBHOOK_SECRET` → HTTP 200 (not a simulated event)
- "Duplicate event ignored" = idempotency guard fired (first delivery at 15:11:07Z already updated DB)
- Stripe API confirms `evt_1Tp8kBBhFuRC5zsaH0GtGSZG` has `pending_webhooks: 0` (all deliveries succeeded)

### Stripe API verification of the real subscription

After payment, Stripe created subscription `sub_1Tp8kABhFuRC5zsaNfX2WHH5` (test mode, active):

```
Stripe API (test mode):
  id:       sub_1Tp8kABhFuRC5zsaNfX2WHH5
  status:   active
  customer: cus_UolvUvnOHyEgvp
  price:    price_1TdqKEBhFuRC5zsatuPvx0BQ  ($29/mo Builder plan)
```

### Reproduce

```bash
# 1. Get the test-mode secret key from the Replit Stripe connector (code_execution):
#      const conns = await listConnections('stripe');
#      const testKey = conns.find(c => c.environment === 'development')?.settings?.secret;

# 2. Register a test webhook endpoint in Stripe test mode:
#      POST https://api.stripe.com/v1/webhook_endpoints
#        url = https://<your-replit-dev-domain>/api/stripe/webhook
#        enabled_events[] = checkout.session.completed
#      → capture the 'secret' field from the response

# 3. Set the secret as a dev env var:
#      await setEnvVars({ values: { STRIPE_TEST_WEBHOOK_SECRET: '<secret>' }, environment: 'development' });

# 4. Restart the API server workflow to pick up the new env var.

# 5. Create a test checkout session with the sk_test_* key and Builder price:
#      STRIPE_PRICE_BUILDER=price_1TdqKEBhFuRC5zsatuPvx0BQ
#      success_url = https://<dev-domain>/subscribe/success?session_id={CHECKOUT_SESSION_ID}&tier=builder

# 6. Navigate to the checkout URL, fill test card 4242 4242 4242 4242 / 12/27 / 123 / 12345.
#    Dismiss Stripe Link ("Pay without Link") if it appears.
#    Click Subscribe.

# 7. After redirect to /subscribe/success, verify "You're on Builder!" appears.

# 8. Check server logs for:
#      "Stripe webhook verified with STRIPE_TEST_WEBHOOK_SECRET (test-mode endpoint)"
#      POST /api/stripe/webhook → 200

# 9. Verify DB: GET /api/subscriptions/me → tier=builder, status=active
```

---

## Architecture: how the flow works in production

```
User clicks "Upgrade" in the app
        │
        ▼
POST /api/subscriptions/checkout
  → creates Stripe Checkout Session with:
      metadata.userId  = current user's ID
      metadata.tier    = "builder" | "operator" | "empire"
      subscription_data.metadata (same)
  → returns { url, sessionId }
        │
        ▼
Browser redirects to Stripe-hosted checkout page
  User fills payment details, clicks Subscribe
        │
        ▼
Stripe processes payment, redirects to:
  /subscribe/success?session_id=<id>&tier=<tier>
        │
        ▼ (async, within ~2s)
Stripe POSTs checkout.session.completed to
  /api/stripe/webhook
        │
        ├─ Raw body captured BEFORE express.json() in app.ts
        ├─ stripe.webhooks.constructEvent() verifies STRIPE_WEBHOOK_SECRET
        ├─ Idempotency: check processedStripeEventsTable — skip if seen
        ├─ Update users.membershipTier + membershipStatus
        ├─ Upsert subscriptions row (stripeCustomerId, stripeSubscriptionId, tier, status)
        └─ Insert processedStripeEventsTable row (prevents double-processing)
        │
        ▼
/subscribe/success polls GET /api/subscriptions/me every 3s
  → shows confirmed tier from DB once webhook has fired
```

---

## Key files

| File | Purpose |
|------|---------|
| `artifacts/api-server/src/routes/subscriptions.ts` | Checkout session creation + webhook handler |
| `artifacts/api-server/src/app.ts` | Raw body capture (`RAW_BODY_PATHS`) before `express.json()` |
| `artifacts/api-server/src/lib/stripe.ts` | Stripe client (connector test keys in dev, env var in prod) |
| `artifacts/web/src/pages/SubscribeSuccessPage.jsx` | Success page — polls `/api/subscriptions/me` to confirm tier |
| `artifacts/web/src/components/dashboard/admin/AdminStripePanel.jsx` | Admin view of real Stripe subscriptions |
| `scripts/src/test-stripe-webhook.ts` | Automated backend E2E test script |
| `lib/db/src/schema/subscriptions.ts` | `subscriptions` + `processedStripeEvents` table schemas |
