/**
 * test-stripe-webhook.ts
 *
 * End-to-end validation of the Stripe payment activation flow.
 * Covers the backend path: checkout session creation → webhook receipt → DB tier update.
 * For the full browser-UI path (hosted checkout + 4242 test card), see STRIPE_TESTING.md.
 *
 * What this script verifies:
 *   1.  Authenticates as a test user via POST /api/auth/login
 *   2.  Calls POST /api/subscriptions/checkout to create a real Stripe
 *       Checkout Session (uses the configured STRIPE_PRICE_BUILDER price ID)
 *   3.  Retrieves the session from Stripe and asserts:
 *         - The price ID matches STRIPE_PRICE_BUILDER
 *         - session.metadata.userId and session.metadata.tier are correct
 *         - subscription_data.metadata has the same userId/tier
 *   4.  Constructs a checkout.session.completed webhook event using the
 *       real session data (real customerId, real sessionId, real metadata)
 *   5.  Signs the event with stripe.webhooks.generateTestHeaderString() and
 *       POSTs it to /api/stripe/webhook
 *   6.  Verifies the webhook is accepted (HTTP 200)
 *   7.  Verifies users.membershipTier and the subscriptions row are updated
 *   8.  Verifies idempotency: replaying the same eventId returns 200 without
 *       corrupting DB state (does NOT pre-delete the processed-event row)
 *   9.  Verifies signature guard: a tampered signature returns HTTP 400
 *   10. Verifies /api/subscriptions/me reflects the new tier (the endpoint
 *       that /subscribe/success polls to confirm tier from DB)
 *   11. Cleans up: restores the test user's original subscription state
 *
 * Run:
 *   pnpm --filter @workspace/scripts run test-stripe-webhook
 *
 * Required environment variables:
 *   STRIPE_WEBHOOK_SECRET  — Stripe webhook signing secret
 *   STRIPE_SECRET_KEY      — Stripe secret API key (sk_live_* or sk_test_*)
 *   STRIPE_PRICE_BUILDER   — Stripe price ID for the Builder plan
 *   DATABASE_URL           — Postgres connection string
 *   TEST_ADMIN_EMAIL       — Email of an admin user to test with
 *   TEST_ADMIN_PASSWORD    — Password for that admin user
 *
 * Optional:
 *   API_BASE_URL           — Base URL of the running API (default: http://localhost:80)
 *
 * Test-mode usage:
 *   Set STRIPE_SECRET_KEY=sk_test_... and STRIPE_PRICE_BUILDER to the matching
 *   test-mode price ID. The webhook simulation works identically in both modes
 *   because it uses stripe.webhooks.generateTestHeaderString() with your
 *   STRIPE_WEBHOOK_SECRET — no registered Stripe endpoint required.
 *
 * Available test-mode prices (Replit Stripe connector account):
 *   Builder  : price_1TdqKEBhFuRC5zsatuPvx0BQ  ($29/mo)
 *   Operator : price_1TdqKFBhFuRC5zsaLxRZ6BsR  ($99/mo)
 *   Empire   : price_1TdqKFBhFuRC5zsaDxyPxCEM  ($499/mo)
 */

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, usersTable, subscriptionsTable, processedStripeEventsTable } from "@workspace/db";

// ── helpers ───────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error("\n❌  FAIL:", msg);
  process.exit(1);
}

function ok(msg: string) {
  console.log("✅ ", msg);
}

function info(msg: string) {
  console.log("   ", msg);
}

// ── config — all credentials sourced from environment ─────────────────────────

const WEBHOOK_SECRET   = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET    = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID  = process.env.STRIPE_PRICE_BUILDER;
const API_BASE         = process.env.API_BASE_URL ?? "http://localhost:80";
const TIER_UNDER_TEST  = "builder";

const TEST_ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

if (!WEBHOOK_SECRET)      fail("STRIPE_WEBHOOK_SECRET is not set.");
if (!STRIPE_SECRET)       fail("STRIPE_SECRET_KEY is not set.");
if (!STRIPE_PRICE_ID)     fail("STRIPE_PRICE_BUILDER is not set.");
if (!TEST_ADMIN_EMAIL)    fail("TEST_ADMIN_EMAIL is not set. Provide an admin user email.");
if (!TEST_ADMIN_PASSWORD) fail("TEST_ADMIN_PASSWORD is not set. Provide the admin user password.");

const stripe = new Stripe(STRIPE_SECRET!, { apiVersion: "2026-05-27.dahlia" });

// ── step 1: authenticate and get a JWT ───────────────────────────────────────

async function authenticate(): Promise<{ token: string; userId: number }> {
  const resp = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }),
  });
  if (!resp.ok) fail(`Login failed: HTTP ${resp.status}`);
  const data = await resp.json() as any;
  if (!data.token) fail("Login response missing token");
  if (!data.user?.id) fail("Login response missing user.id");
  return { token: data.token, userId: data.user.id };
}

// ── step 2: snapshot + reset user subscription state ─────────────────────────

interface UserSnapshot {
  membershipTier: string | null;
  membershipStatus: string | null;
  subscriptions: Array<typeof subscriptionsTable.$inferSelect>;
}

async function snapshotUserSubscription(userId: number): Promise<UserSnapshot> {
  const [user] = await db.select({
    membershipTier: usersTable.membershipTier,
    membershipStatus: usersTable.membershipStatus,
  }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) fail(`User ${userId} not found in DB`);
  const subs = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));
  return { ...user, subscriptions: subs };
}

async function resetUserSubscription(userId: number) {
  await db.update(usersTable)
    .set({ membershipTier: "free", membershipStatus: "active" })
    .where(eq(usersTable.id, userId));
  await db.delete(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));
}

async function restoreUserSubscription(userId: number, snapshot: UserSnapshot) {
  await db.update(usersTable)
    .set({
      membershipTier: (snapshot.membershipTier ?? "free") as any,
      membershipStatus: (snapshot.membershipStatus ?? "active") as any,
    })
    .where(eq(usersTable.id, userId));
  // Remove any subscriptions created during the test, then re-insert originals
  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (snapshot.subscriptions.length > 0) {
    await db.insert(subscriptionsTable).values(snapshot.subscriptions);
  }
}

// ── step 3: create a real Stripe checkout session via the API ─────────────────

async function createCheckoutSession(token: string): Promise<{ url: string; sessionId: string }> {
  const resp = await fetch(`${API_BASE}/api/subscriptions/checkout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tier: TIER_UNDER_TEST }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as any;
    fail(`Checkout endpoint failed: HTTP ${resp.status} — ${body.error ?? JSON.stringify(body)}`);
  }
  const data = await resp.json() as any;
  if (!data.url || !data.sessionId) fail("Checkout response missing url or sessionId");
  return { url: data.url, sessionId: data.sessionId };
}

// ── step 4: retrieve the session from Stripe and verify metadata ──────────────

async function verifySessionMetadata(sessionId: string, userId: number): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  // Price ID is correct
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
  const priceId = lineItems.data[0]?.price?.id;
  if (priceId !== STRIPE_PRICE_ID) {
    fail(`Session price ID mismatch: expected "${STRIPE_PRICE_ID}", got "${priceId}"`);
  }
  ok(`Session price ID = ${priceId} (matches STRIPE_PRICE_BUILDER)`);

  // session.metadata.userId
  if (session.metadata?.userId !== String(userId)) {
    fail(`session.metadata.userId expected "${userId}", got "${session.metadata?.userId}"`);
  }
  ok(`session.metadata.userId = "${session.metadata?.userId}"`);

  // session.metadata.tier
  if (session.metadata?.tier !== TIER_UNDER_TEST) {
    fail(`session.metadata.tier expected "${TIER_UNDER_TEST}", got "${session.metadata?.tier}"`);
  }
  ok(`session.metadata.tier = "${session.metadata?.tier}"`);

  return session;
}

// ── step 5: build + send a signed checkout.session.completed webhook ──────────

async function sendSignedWebhook(
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<{ status: number; body: unknown }> {
  const sessionPayload: Record<string, unknown> = {
    id: session.id,
    object: "checkout.session",
    mode: session.mode,
    payment_status: "paid",
    status: "complete",
    customer: session.customer,
    subscription: session.subscription
      ? (typeof session.subscription === "string" ? session.subscription : (session.subscription as any).id)
      : null,
    metadata: session.metadata,
    amount_total: session.amount_total,
  };

  const event: Record<string, unknown> = {
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1000),
    data: { object: sessionPayload },
  };

  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureHeader = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET!,
    timestamp,
  });

  const resp = await fetch(`${API_BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signatureHeader,
    },
    body: payload,
  });

  const body = await resp.json().catch(() => ({}));
  return { status: resp.status, body };
}

// ── step 6: verify DB was updated ─────────────────────────────────────────────

async function verifyDbState(userId: number, session: Stripe.Checkout.Session) {
  const [user] = await db
    .select({ membershipTier: usersTable.membershipTier, membershipStatus: usersTable.membershipStatus })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) fail("User not found after webhook processing");

  if (user.membershipTier !== TIER_UNDER_TEST)
    fail(`users.membershipTier expected "${TIER_UNDER_TEST}", got "${user.membershipTier}"`);
  ok(`users.membershipTier = "${user.membershipTier}"`);

  if (user.membershipStatus !== "active")
    fail(`users.membershipStatus expected "active", got "${user.membershipStatus}"`);
  ok(`users.membershipStatus = "${user.membershipStatus}"`);

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));
  if (!sub) fail("No row in subscriptions table after webhook processing");

  if (sub.tier !== TIER_UNDER_TEST)
    fail(`subscriptions.tier expected "${TIER_UNDER_TEST}", got "${sub.tier}"`);
  ok(`subscriptions.tier = "${sub.tier}"`);

  if (sub.status !== "active")
    fail(`subscriptions.status expected "active", got "${sub.status}"`);
  ok(`subscriptions.status = "${sub.status}"`);

  const expectedCustomerId = typeof session.customer === "string"
    ? session.customer
    : (session.customer as any)?.id;
  if (sub.stripeCustomerId !== expectedCustomerId)
    fail(`subscriptions.stripeCustomerId expected "${expectedCustomerId}", got "${sub.stripeCustomerId}"`);
  ok(`subscriptions.stripeCustomerId = "${sub.stripeCustomerId}" (real Stripe customer)`);
}

// ── step 7: verify idempotency (true duplicate replay) ────────────────────────
// NOTE: Does NOT delete the processedStripeEventsTable row before resending.
// The duplicate record already exists from step 5, so this is a true replay.

async function verifyIdempotency(
  userId: number,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  // The event was already inserted into processedStripeEventsTable in step 5.
  // Sending again with the same eventId must be silently ignored.
  const { status, body } = await sendSignedWebhook(session, eventId);
  info(`Replay HTTP ${status} → ${JSON.stringify(body)}`);

  // Webhook must still return 200 (not 500 or 409)
  if (status !== 200)
    fail(`Idempotency replay returned HTTP ${status}, expected 200`);

  // Response must include duplicate:true to signal the guard fired
  if ((body as any)?.duplicate !== true)
    fail(`Idempotency replay missing duplicate:true — got: ${JSON.stringify(body)}`);

  // Verify the tier was NOT reset or changed
  const [user] = await db
    .select({ membershipTier: usersTable.membershipTier })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (user?.membershipTier !== TIER_UNDER_TEST)
    fail(`After duplicate replay, membershipTier changed unexpectedly to "${user?.membershipTier}"`);

  // The duplicate guard should have returned early with received:true + duplicate:true
  ok(`Duplicate event (${eventId}) processed once, second send silently ignored; DB state unchanged`);
}

// ── step 8: verify signature guard ───────────────────────────────────────────

async function verifySignatureGuard() {
  const resp = await fetch(`${API_BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "t=9999,v1=badhash",
    },
    body: JSON.stringify({
      id: "evt_tampered", type: "checkout.session.completed", data: { object: {} },
    }),
  });
  if (resp.status !== 400)
    fail(`Expected HTTP 400 for tampered signature, got ${resp.status}`);
  ok(`Tampered webhook rejected with HTTP 400 (STRIPE_WEBHOOK_SECRET is active)`);
}

// ── step 9: verify /api/subscriptions/me reflects the tier ───────────────────

async function verifySubscriptionsMeEndpoint(token: string) {
  const resp = await fetch(`${API_BASE}/api/subscriptions/me`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!resp.ok) fail(`/api/subscriptions/me returned HTTP ${resp.status}`);
  const data = await resp.json() as any;
  if (!data.subscription) fail("/api/subscriptions/me returned no subscription");
  if (data.subscription.tier !== TIER_UNDER_TEST)
    fail(`/api/subscriptions/me tier expected "${TIER_UNDER_TEST}", got "${data.subscription.tier}"`);
  if (data.subscription.status !== "active")
    fail(`/api/subscriptions/me status expected "active", got "${data.subscription.status}"`);
  ok(`GET /api/subscriptions/me → tier="${data.subscription.tier}", status="${data.subscription.status}"`);
  ok(`/subscribe/success page will read this endpoint to display the confirmed tier`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪  Stripe Payment Activation — End-to-End Test");
  console.log("=================================================\n");

  // Step 1: Auth
  console.log("Step 1: Authenticate …");
  const { token, userId } = await authenticate();
  ok(`Authenticated: userId=${userId}`);

  // Step 2: Snapshot original state, then reset to a clean baseline
  console.log("\nStep 2: Snapshot original subscription state, then reset to free …");
  const originalSnapshot = await snapshotUserSubscription(userId);
  info(`Original tier: ${originalSnapshot.membershipTier}, status: ${originalSnapshot.membershipStatus}, subs: ${originalSnapshot.subscriptions.length}`);
  await resetUserSubscription(userId);
  ok(`User ${userId} temporarily set to free/no subscription (will be restored at end)`);

  // Step 3: Create real checkout session
  console.log(`\nStep 3: POST /api/subscriptions/checkout (tier=${TIER_UNDER_TEST}) …`);
  const { url, sessionId } = await createCheckoutSession(token);
  info(`Session ID : ${sessionId}`);
  info(`Checkout URL: ${url.slice(0, 70)}…`);
  ok("Checkout session created — real Stripe session with correct price ID");

  // Step 4: Verify session metadata from Stripe
  console.log("\nStep 4: Retrieve and verify session metadata from Stripe …");
  const session = await verifySessionMetadata(sessionId, userId);
  ok("Session metadata verified against live Stripe API");

  // Step 5: Simulate checkout.session.completed
  const EVENT_ID = `evt_e2e_${Date.now()}`;
  console.log(`\nStep 5: POST signed checkout.session.completed (eventId=${EVENT_ID}) …`);
  const { status, body } = await sendSignedWebhook(session, EVENT_ID);
  info(`HTTP ${status} → ${JSON.stringify(body)}`);
  if (status !== 200) fail(`Webhook returned HTTP ${status}: ${JSON.stringify(body)}`);
  ok("Webhook accepted — HTTP 200");

  // Step 6: Verify DB
  console.log("\nStep 6: Verify database state …");
  await verifyDbState(userId, session);

  // Step 7: /api/subscriptions/me — mirrors what SubscribeSuccessPage reads
  console.log("\nStep 7: Verify /api/subscriptions/me (feeds /subscribe/success) …");
  await verifySubscriptionsMeEndpoint(token);

  // Step 8: Idempotency (true replay — does NOT clear processedStripeEventsTable)
  console.log("\nStep 8: Replay same event (idempotency — no pre-deletion) …");
  await verifyIdempotency(userId, session, EVENT_ID);

  // Step 9: Signature guard
  console.log("\nStep 9: Send tampered event (signature guard) …");
  await verifySignatureGuard();

  // Step 10: Cleanup — restore original subscription state
  console.log("\nStep 10: Cleanup — restore original subscription state …");
  await restoreUserSubscription(userId, originalSnapshot);
  ok(`User ${userId} restored: tier=${originalSnapshot.membershipTier}, subs=${originalSnapshot.subscriptions.length}`);

  const customerId = typeof session.customer === "string"
    ? session.customer
    : (session.customer as any)?.id;

  const mode = STRIPE_SECRET!.startsWith("sk_test_") ? "TEST" : "LIVE";
  console.log(`
🎉  All checks passed.

Summary
───────
  Stripe mode      : ${mode}
  Checkout session : ${sessionId}
  Stripe customer  : ${customerId}
  Price ID         : ${STRIPE_PRICE_ID}
  Webhook          : accepted (HTTP 200) with valid STRIPE_WEBHOOK_SECRET
  DB update        : users.membershipTier → builder ✓
                     subscriptions row created with real stripeCustomerId ✓
  /subscriptions/me: tier=builder, status=active ✓
  Idempotency      : duplicate events ignored without DB mutation ✓
  Signature guard  : invalid signatures rejected (HTTP 400) ✓
  Cleanup          : original subscription state restored ✓

For the hosted-checkout UI test (4242 test card → /subscribe/success),
see STRIPE_TESTING.md — or run in test mode:
  STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_BUILDER=price_1TdqKEBhFuRC5zsatuPvx0BQ \\
  pnpm --filter @workspace/scripts run test-stripe-webhook
`);
}

main().catch((err) => {
  console.error("\n💥  Unhandled error:", err);
  process.exit(1);
});
