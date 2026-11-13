# Replit handoff: merging this work back into the Replit platform

Read this first if you are the Replit AI (or a developer) picking up this repository after it comes back from GitHub. It says what changed, what the owner must configure, how to update the database safely, and what not to touch.

## 1. What is in `main`

Everything from the GitHub work is merged into `main` in this order: integration branch (#29, which contains #1 and #4–#28), Empire structure (#30), ASH Control and Missions (#31), and the launch-completion PR (refunds, payouts, abuse limits, alerts). Highlights:

| Area | Where |
| --- | --- |
| Security hardening, rate limits, startup env check, `/readyz`, graceful shutdown | `artifacts/api-server/src/app.ts`, `middlewares/security.ts`, `lib/env-check.ts`, `index.ts` |
| Background jobs run on one replica (Postgres advisory locks) | `lib/runtime/scheduler.ts`, `lib/runtime/worker.ts`, `lib/revenue/sync.ts` |
| ASH tool-calling agent (dock, dashboard panel, Builder, Unreal API) | `lib/ash-agent/`, `routes/ash-tools.ts` (`POST /api/ash/agent`) |
| Empire: businesses, income streams, Asset Vault, business types | `lib/db/src/schema/empire.ts`, `routes/empire*.ts`, web `pages/Empire*`, `components/empire/` |
| ASH Control levels, Approvals inbox, background Missions | `lib/ash-control/`, `lib/ash-missions/`, `routes/ash-control.ts`, `routes/approvals.ts`, web `AshControlPage`, `MissionsPage`, `ApprovalsPage` |
| Stripe: idempotent webhook, refunds, chargebacks, failed renewals | `routes/subscriptions.ts` (`POST /api/stripe/webhook`) |
| Creator payouts (Stripe Connect Express) | `lib/creator-payouts.ts`, `routes/creator-payouts.ts`, web `CreatorPayoutsPage` |
| Admin alerts (failed payments, jobs, missions, payouts) | `lib/admin-alerts.ts` (in-app notifications to every `SUPER_ADMIN`) |
| Abuse limits on public forms, beacons and webhooks | `middlewares/security.ts` (`createPublicFormRateLimiter`, `createGlobalRateLimiter`) |

Every backend feature also has a page in the web app, a sidebar link, a link in the Builder's Empire tab or the dashboard, and an entry in the ASH Guide (`artifacts/web/src/lib/ashGuide.js`). Keep that parity when adding features.

## 2. Owner-only steps (the Replit AI must not do these itself)

1. Rotate the OpenRouter key that was shared in chat, `ADMIN_BOOTSTRAP_TOKEN` and the admin passwords. Make the GitHub repositories private.
2. Set Replit Secrets (production). The server refuses to start without the first four:
   - `DATABASE_URL`
   - `SESSION_SECRET` (at least 32 characters)
   - `CREDENTIAL_ENCRYPTION_KEY` (64 hex characters; generate with `openssl rand -hex 32`, and never change it after users have saved credentials)
   - `OPENROUTER_API_KEY`
   - `APP_URL=https://starksglobalgroup.net`, `STRIPE_SECRET_KEY` (or the Replit Stripe connector), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`
3. Stripe dashboard:
   - Webhook endpoint `https://starksglobalgroup.net/api/stripe/webhook` with these events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Its signing secret goes in `STRIPE_WEBHOOK_SECRET`.
   - Enable **Connect** (Express accounts) for creator payouts, and add `account.updated` to the webhook (as a Connect event). Payouts are transfers from the platform balance, so the platform needs available funds.
4. Database: back up production before the first deploy of this code (section 3).
5. Run one real backup and restore drill (`docs/engineering/backup-restore.md`).
6. Point an uptime monitor at `https://starksglobalgroup.net/api/readyz` (503 means the database is unreachable).

## 3. Database update procedure

`scripts/post-merge.sh` currently runs `pnpm --filter db push` (Drizzle schema push). The new schema is **additive**: new tables (`income_streams`, `business_types`, `vault_assets`, `ash_control_settings`, `ash_spend_events`, `ash_missions`, `media_blobs`, `scheduler_state`, `creator_payout_accounts`, `creator_earnings`, `creator_payouts`, …) and `pending_approvals.business_id` becoming nullable. Push applies this without data loss and should not prompt. If push ever asks about renaming or dropping a column or table, stop and ask the owner; do not answer "yes" to a drop.

Recommended once, after a backup (details in `database-migrations.md`):

1. `pnpm --filter @workspace/scripts run db:backup`
2. Apply `lib/db/manual-migrations/0001_health_unmeasured_and_signal_index.sql`.
3. `pnpm --filter @workspace/scripts run db:baseline`, then `pnpm --filter @workspace/scripts run db:migrate`.
4. Only then change `scripts/post-merge.sh` to `pnpm --filter @workspace/scripts run db:migrate`.

Fresh databases: `pnpm --filter @workspace/scripts run db:migrate` then `pnpm --filter @workspace/scripts run seed`.

Schema changes from now on: edit `lib/db/src/schema/*.ts`, run `cd lib/db && DATABASE_URL=unused pnpm exec drizzle-kit generate --name <change>`, commit the SQL and `meta/`. CI fails if schema and migrations disagree.

## 4. Run and verify

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm --filter @workspace/api-server exec vitest run     # needs DATABASE_URL with the schema applied
pnpm --filter @workspace/web run build
pnpm --filter @workspace/api-server run dev            # API on 8080
pnpm --filter @workspace/web run dev                   # web app
```

After deploy, check: `GET /api/healthz` and `/api/readyz` return 200; sign-up and log-in work; the ASH dock answers on any page; `/empire`, `/missions`, `/approvals`, `/ash-control`, `/creator-payouts` load; a Stripe test-mode checkout grants the plan, and a test refund moves the user back to free.

If browsers get `Origin not allowed`, add the site origin to `ALLOWED_ORIGINS` (comma-separated).

Optional tuning variables: `API_RATE_LIMIT_PER_MINUTE` (600), `PUBLIC_FORM_RATE_LIMIT_PER_MINUTE` (30), `AI_RATE_LIMIT_PER_MINUTE` (20), `CREATOR_PAYOUT_HOLD_DAYS` (14), `CREATOR_MIN_PAYOUT_CENTS` (1000).

## 5. Rules for further changes

- **Money is real only when a provider says so.** Verified revenue comes only from connected payment providers (Stripe, Gumroad, PayPal). Projections stay labelled as estimates. Never show made-up ratings, user counts or random chart data.
- **ASH acts through allow-listed tools** in `lib/ash-agent/tools.ts`, gated by `lib/ash-control/policy.ts` (`decide`). New tools default to the `build` action kind, so they are gated. Don't add a path that runs actions without going through `decide` and, where required, the Approvals inbox.
- **Owner-only actions** (identity checks, accepting terms, linking a bank or card, CAPTCHAs, Stripe Connect onboarding) are always handed to the user with `request_owner_action` or a Stripe-hosted link.
- **ASH does not change platform code at runtime.** She can add connections, settings and automations to a user's account.
- **Every user-owned row is filtered by `userId`.** Tests in `artifacts/api-server/src/__tests__/` check cross-user isolation; add one for each new route.
- **Stripe webhook handlers run inside one transaction** together with the event claim in `processed_stripe_events`. Throw to make Stripe retry; put notifications and other side effects in `afterCommit`.
- **Background work** goes through the scheduler or worker (single-runner locks), not ad-hoc `setInterval`s.
- Don't delete or rewrite `lib/db/drizzle/` migrations that have shipped. Add new ones.
