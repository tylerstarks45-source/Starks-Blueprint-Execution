# Security runbook

## Incident: secrets committed to a public repository (found 2026-11-11)

Two credentials were committed in plain text and are still in git history:

| Credential | Where it was | Impact |
|---|---|---|
| `ADMIN_BOOTSTRAP_TOKEN` | `.replit` (`[userenv.shared]`) | Calls `POST /api/auth/admin-bootstrap`, which can reset any user's password and assign `FOUNDER_ADMIN` |
| Seeded SUPER_ADMIN password | `replit.md`, `.agents/memory/auth-arch.md`, `artifacts/mobile/app/login.tsx` | Direct admin login |

The current tree no longer contains either value. **They remain valid until the owner rotates them.** Removing them from the files does not invalidate them, and neither does making the repo private.

### Owner actions (in order)

1. **Rotate the bootstrap token.** In Replit, go to Secrets (or Deployments, then Secrets) and either delete `ADMIN_BOOTSTRAP_TOKEN` or replace it with a new random value (`openssl rand -hex 32`). When the variable is unset, the endpoint returns 404. Also remove any copy from the `.replit` `[userenv]` sections in the Replit workspace.
2. **Reset the SUPER_ADMIN password** on every environment (dev and prod databases). Log in and change it, or use the bootstrap endpoint once with the *new* token, then unset the token.
3. **Invalidate existing sessions.** Bump `tokenVersion` for admin users, or rotate `SESSION_SECRET`. Rotating `SESSION_SECRET` logs out every user.
4. **Restrict repository access.** Make `Starks-Blueprint-Execution` and `starks-global-group` private: GitHub, then Settings, then General, then Danger Zone, then Change visibility.
5. **Purge history (optional, after steps 1 to 3).** Use `git filter-repo --replace-text` with the two old values, force-push all branches, and ask GitHub Support to clear cached views. Every clone and the Replit workspace must then re-clone. The values are already public, so rotation (steps 1 to 3) is the actual fix and history purging is hygiene.
6. **Review logs** for any `POST /api/auth/admin-bootstrap` calls and unexpected role changes in `users`.

## Request-level protections (`artifacts/api-server/src/middlewares/security.ts`)

- **Security headers** (helmet): HSTS, `nosniff`, `X-Frame-Options: SAMEORIGIN`, referrer policy, no `X-Powered-By`. CSP and COOP are disabled because the API serves user-generated landing pages and OAuth popup callbacks; add a CSP for those pages separately.
- **AI rate limit:** a per-user limit (per-IP for anonymous callers) on non-GET AI and provider endpoints: `/ai-orchestrator/*`, `/executive-brain/stream`, `/dashboard/chat`, `/build-engine/*`, `/browser-agent/*`, `/research/*`, `/media-gen/*`, `/openrouter/complete`, `*/generate`. The default is 20 per minute, configurable with `AI_RATE_LIMIT_PER_MINUTE`. Over the limit, the response is `429 {code:"rate_limited"}`. This sits on top of credit checks and the existing per-API-key limits.
- **Error redaction:** 5xx JSON bodies whose `error` reveals env var names, SQL, connection errors, file paths or stack frames are replaced with a generic message and logged server-side. A missing `OPENROUTER_API_KEY` returns `503 {code:"ai_unavailable"}`. A final JSON error handler replaces Express's default HTML error page.
- **SQL:** all former `sql.raw()` interpolations now use parameterized `sql` templates or `sql.identifier()`.

## Known remaining items

- `zod@3.25.x` (GHSA-mrhx-c7xc-m3w5, memory exhaustion on oversized constrained collections) is fixed only in zod 4. Upgrading requires migrating the shared `catalog:` zod plus the Orval-generated schemas, and will be a separate PR. It is mitigated by the 100 KB `express.json` body limit.
- Remaining moderate and low advisories are in transitive dev or build tooling.
