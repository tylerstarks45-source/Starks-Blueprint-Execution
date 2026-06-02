---
name: Credit enforcement model
description: How AI credit billing is enforced in SBEP (auth source, concurrency stance, webhook idempotency) and why.
---

# Credit enforcement model

## Billing identity comes from the JWT, never the request body
All AI-consuming endpoints (`/openrouter/complete`, `/build-engine/*`) derive the
billed `userId` from `requireAuth` (`artifacts/api-server/src/lib/auth.ts`) and
ignore any client-supplied `userId`. Build-engine also verifies instance ownership.

**Why:** `/openrouter/complete` originally trusted `body.userId`, so a caller could
omit it (no deduction) or set someone else's id (charge another account). Enforcement
is only real if identity is server-derived.
**How to apply:** Any new endpoint that calls `complete()` must `requireAuth` and pass
the JWT user id; never accept a userId from the client for billing.

## Usage deduction may transiently go negative — this is intentional
`complete()` does a best-effort precheck (`balance > 0`) then deducts the actual token
cost after the call succeeds. Concurrent requests can each pass the precheck and push a
balance slightly negative. We do NOT reserve credits up front.

**Why:** Token cost is unknown until after the AI call, so a strict atomic
reserve-then-spend isn't possible without estimating. A small transient negative is
acceptable accounting — the next precheck blocks the user, and they "owe" the overage.
**How to apply:** Don't add a non-negative guard that would drop already-incurred usage.
`adjustCredits` is atomic per-row (`balance + delta` in SQL); keep it that way.

## Stripe webhook: idempotent + signature-enforced in prod
The webhook inserts each `event.id` into `processed_stripe_events` with
`onConflictDoNothing()`; a duplicate short-circuits before any credit/subscription
mutation. In production (`REPLIT_DEPLOYMENT==="1"` or `NODE_ENV==="production"`) a
missing `STRIPE_WEBHOOK_SECRET` rejects the request (503) instead of processing unsigned.

**Why:** Stripe retries/replays events; without dedupe a single purchase could grant
credits multiple times. Unsigned webhooks in prod could be forged to mint credits.
**How to apply:** Do any new webhook side effect AFTER the idempotency insert guard.
