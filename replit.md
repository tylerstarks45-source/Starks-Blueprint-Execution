# SBEP — Starks Blueprint Execution Platform

An AI-powered automation platform for starksglobalgroup.net. Users select blueprints, connect their tools via credential input, and an AI agent builds/runs automated income systems on their behalf. Revenue via subscription tiers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api/*`)
- `pnpm --filter @workspace/web run dev` — run the React frontend (port 22333, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `DATABASE_URL` — Postgres connection string (auto-provisioned)
- `SESSION_SECRET` — JWT signing secret (provisioned)
- `OPENROUTER_API_KEY` — OpenRouter API key for AI agent features
- `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit-managed OpenAI AI integration (provisioned). Powers the platform-level TTS fallback in `POST /api/media-gen/tts` when a user has no ElevenLabs key.

### Optional — Namecheap domain registration

- `NAMECHEAP_API_KEY`, `NAMECHEAP_API_USER`, `NAMECHEAP_CLIENT_IP` — enable live domain search/purchase via Namecheap. Without these, `/api/domains/*` routes degrade gracefully (HTTP 200 with `configured: false` / `success: false`) instead of failing — the Domains page (`/domains`) still renders and explains that registration isn't activated yet.
- `NAMECHEAP_SANDBOX` — set to `"true"` to hit Namecheap's sandbox API instead of live.
- `GET /api/domains/status` — health check endpoint reporting `{configured, mode, reachable, message}`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080)
- DB: PostgreSQL + Drizzle ORM (18 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React 18 + Vite 7 + Tailwind CSS v3 + shadcn/ui
- AI: OpenRouter (gpt-4o-mini default, configurable per request)
- Auth: JWT (bcryptjs + jsonwebtoken), 7-day expiry

## Where things live

- `artifacts/api-server/src/routes/` — all 19 route groups (auth, blueprints, tools, system-instances, openrouter, etc.)
- `artifacts/api-server/src/lib/openrouter.ts` — OpenRouter completion helper + usage logging
- `artifacts/api-server/src/lib/serialize.ts` — DB→JSON date serializer
- `artifacts/web/src/lib/pocketbaseClient.js` — PocketBase-compatible shim routing to SBEP REST API
- `artifacts/web/src/contexts/AuthContext.jsx` — auth state, login/signup/logout
- `artifacts/web/src/hooks/useSystemGenerator.js` — AI-powered blueprint matching
- `lib/db/src/schema/` — all 18 Drizzle table schemas
- `lib/api-spec/` — OpenAPI spec (source of truth for codegen)

## Architecture decisions

- **PocketBase shim**: All Horizons JSX uses `pb.collection('x').getList()` etc. Rather than rewriting 300+ files, a drop-in shim (`pocketbaseClient.js`) translates PocketBase API calls to SBEP REST endpoints. Field mapping is snake_case→camelCase handled per collection.
- **Tailwind v3**: Catalog has v4 but frontend uses v3 (`tailwindcss@^3.4.17`) due to Horizons source compatibility. Do NOT upgrade to v4 without a full migration.
- **Zod date serialization**: Drizzle returns JS `Date` objects; the generated Zod schemas expect strings. The `serialize()` helper does `JSON.parse(JSON.stringify(data))` before every `.parse()` call to coerce dates.
- **JWT auth**: bcryptjs + jsonwebtoken, tokens stored in localStorage as `sbep_auth_token`. Session secret from `SESSION_SECRET` env var.

## Product

- **Blueprints**: Pre-built AI system architectures (8 live). Each has steps, difficulty, cost/time estimates.
- **Marketplace**: Curated tool directory (17 tools across 8 categories). Affiliate links.
- **System Builder**: AI agent (powered by OpenRouter) matches user goals to blueprints, creates system instances.
- **Dashboard**: Per-user command center showing active systems, credits, subscription tier.
- **Admin Dashboard**: Platform analytics, user management, AI/OpenRouter health monitoring.

## Seeded Data

- 1 SUPER_ADMIN: `admin@starksglobalgroup.net` / `Starks@Admin2024!`
- 8 blueprints across 6 categories
- 17 tools across 8 categories
- 6 blueprint categories, 8 tool categories

## User preferences

- Horizons design must be preserved exactly — dark cinematic theme, Space Mono + Outfit fonts, glassmorphism cards
- Backend: PostgreSQL only, PocketBase fully replaced
- AI: OpenRouter is the only AI provider

## Gotchas

- Never use `pnpm dev` at workspace root — use per-artifact workflows
- After DB schema changes: run `pnpm --filter @workspace/db run push` then restart API workflow
- After OpenAPI spec changes: run `pnpm --filter @workspace/api-spec run codegen` then restart API
- Tailwind v3 config uses `tailwind.config.js` (not `tailwind.config.ts`) — Horizons uses CJS
- The `serialize()` wrapper MUST be used before all `.parse(rows)` calls in route handlers

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
