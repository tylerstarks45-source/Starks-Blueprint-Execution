# Backend launch checklist

Status of each launch area, which PR covers it, and what only the owner can do.
"Open PR" means the fix exists and is tested but is **not on `main` or the live site** until merged.

## 1. Areas

| Area | Status | Covered by |
|---|---|---|
| Secrets removed from repo, security headers, AI rate limits, error redaction, parameterized SQL, dependency patches | Open PR | #1 |
| Launch-hardening admin routes callable anonymously (unawaited admin check) | Open PR | #10 |
| Authorization on every mutating route; tenant isolation on engine routes | Open PR | #6 → #8 |
| Scheduler / revenue sync run on one instance at a time (Replit autoscale) | Open PR | #5 |
| Startup config validation, `/api/readyz`, JSON 404/500 errors, graceful shutdown | Open PR | #24 |
| Stripe webhook: verified, idempotent, atomic (credits + payouts commit together, retries re-apply) | Open PR | #25 |
| Database backup / restore scripts + CI restore drill | Open PR | #7 |
| Versioned migrations + CI with Postgres | Merged | #3 |
| Generated API clients reproducible, CI drift check | Open PR | #9 |
| Current OpenRouter model IDs (research was broken) | Open PR | #16 |
| Voice / transcription / images via OpenRouter with credit billing | Open PR | #11 → #14 |
| Memory add / system launch / credential save 400s | Open PR | #23 |

## 2. Merge order

Merge top to bottom. An arrow means the second PR is built on the first.

1. #1 security hardening
2. #10 admin check
3. #5 single-runner locks
4. #6 auth sweep → #8 tenant isolation
5. #7 backup / restore
6. #9 API client drift check
7. #24 launch readiness, #25 Stripe webhook
8. #23 numeric user id
9. #16 model IDs (required by #15 and #18)
10. #11 OpenRouter media → #14 media store
11. #12 ASH tools → #13 Unreal command center (also needs #11)
12. #12 → #20 specialists → #21 ASH dock / Brain / Stats → #26 ASH Guide (and #22 audit doc)
13. #15 weekly research → #18 daily online-income research
14. #17 measured outcomes → #19 confidence calibration
15. #4 engineering docs (any time)

Later PRs may need a rebase after earlier ones merge; ask Devin to resolve conflicts.

## 3. Owner-only actions before launch

- Rotate `ADMIN_BOOTSTRAP_TOKEN` (it is committed in `.replit` on `main` until #1 merges), admin passwords, and the OpenRouter key that was shared in chat.
- Make the repositories private.
- Replit Secrets (production): `DATABASE_URL`, `SESSION_SECRET` (≥32 chars), `CREDENTIAL_ENCRYPTION_KEY` (64 hex), `OPENROUTER_API_KEY` are **required** — after #24 the server refuses to start without them. Also set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `APP_URL=https://starksglobalgroup.net`.
- Database: back up production, follow the baseline steps in `database-migrations.md` (`pnpm --filter @workspace/scripts run db:baseline`), then switch `scripts/post-merge.sh` from `pnpm --filter db push` to `pnpm --filter @workspace/scripts run db:migrate` (see `database-migrations.md`). Do not switch before the baseline.
- Run one real backup + restore drill against a copy of production (#7).
- Point an uptime monitor at `https://starksglobalgroup.net/api/readyz` (503 = database unreachable).
- In Stripe, confirm the webhook endpoint and signing secret match `STRIPE_WEBHOOK_SECRET`. Subscribe it to the events listed in `REPLIT-HANDOFF.md` (including refunds, disputes and failed invoices) and enable Connect for creator payouts.
