# Replit handoff: merging this work back into the Replit platform

Read this first if you are the Replit AI (or a developer) picking up this repository after it comes back from GitHub. It says what changed, what the owner must configure, how to update the database safely, and what not to touch.

## 0. Start here (Replit AI): bring GitHub `main` into Replit, in this order

The Replit project already has a production database with real users. Nothing below deletes data. Do the steps in order and stop to ask the owner if a step doesn't behave as described.

1. **Save Replit-side work first.** If the Replit workspace has changes that never went to GitHub, commit them on a branch (for example `replit-local`) before pulling. Don't discard them.
2. **Pull GitHub `main`.** `git fetch origin && git merge origin/main` (or Replit's Git pane "Pull"). If the Replit branch also had changes, resolve conflicts by keeping both sides' features. Don't revert files to an older Replit copy: `main` contains PRs #1–#32 (section 1), and an older copy of a file silently removes their fixes.
3. **Back up the database:** `pnpm --filter @workspace/scripts run db:backup`.
4. **Install and update the schema.** Replit runs `scripts/post-merge.sh` after a merge: `pnpm install --frozen-lockfile`, then `pnpm --filter db push`. The new schema is only additive (new tables and one column made nullable), so push applies it without prompting. If push asks to **drop or rename** anything, answer no and ask the owner; it usually means the Replit database has a table the GitHub schema doesn't know about, and the fix is to add that table to `lib/db/src/schema/`, not to drop it.
5. **Switch to versioned migrations (one time).** `pnpm --filter @workspace/scripts run db:baseline` records every migration in `lib/db/drizzle/` whose tables already exist; then `pnpm --filter @workspace/scripts run db:migrate` should print `Migrations applied.` with nothing left to do. After that, change the last line of `scripts/post-merge.sh` to `pnpm --filter @workspace/scripts run db:migrate`.
6. **Set the Secrets** in section 2 (the server refuses to start without the required ones), restart, and run the checks in section 4.
7. **Hand the owner the owner-only list** in section 2. Don't do those steps yourself.

Where to find things: section 1 maps every feature to its files; section 5 lists the rules that keep the codebase consistent. Engineering docs live in `docs/engineering/` (architecture map, migrations, backups, launch checklist, security runbook).

## 1. What is in `main`

Everything from the GitHub work is merged into `main` in this order: integration branch (#29, which contains #1 and #4–#28), Empire structure (#30), ASH Control and Missions (#31), and launch completion (#32: refunds, payouts, abuse limits, alerts). Highlights:

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
4. Database: back up production before the first deploy of this code (section 0, step 3).
5. Run one real backup and restore drill (`docs/engineering/backup-restore.md`).
6. Point an uptime monitor at `https://starksglobalgroup.net/api/readyz` (503 means the database is unreachable).

## 3. Database update procedure

Section 0 has the exact order. Background:

- The schema source of truth is `lib/db/src/schema/*.ts`. Versioned migrations are in `lib/db/drizzle/` (`0000_baseline` through `0004_creator_payouts`), applied by `db:migrate` and recorded in `drizzle.__drizzle_migrations`.
- The Replit database was created with `drizzle-kit push`, so it has no migration history yet. `db:migrate` refuses to run on such a database until `db:baseline` has been run, so it can never try to re-create existing tables.
- `db:baseline` walks the migrations in order and records each one whose tables already exist, stopping at the first one whose tables are missing; `db:migrate` then applies only the rest. This works whether or not `push` ran first. (Both cases were tested on copies: a database at the original baseline, and one updated by `push`.)
- New tables in this release: `media_blobs`, `asset_business_shares`, `custom_business_types`, `ash_control_settings`, `ash_missions`, `ash_spend_events`, `creator_earnings`, `creator_payout_accounts`, `creator_payouts`. Changed: `businesses.type_key` added; `pending_approvals.business_id` made nullable.
- Optional: `lib/db/manual-migrations/0001_health_unmeasured_and_signal_index.sql` (idempotent) is only needed if the database is not updated with `push`.

Fresh databases: `pnpm --filter @workspace/scripts run db:migrate` then `pnpm --filter @workspace/scripts run seed`.

Schema changes from now on: edit `lib/db/src/schema/*.ts`, run `cd lib/db && DATABASE_URL=unused pnpm exec drizzle-kit generate --name <change>`, commit the SQL and `meta/`. CI fails if schema and migrations disagree. Never edit or delete a migration that has shipped.

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
