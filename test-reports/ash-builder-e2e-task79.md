# ASH Builder — End-to-End Test Report

**Task:** #79 — Build & Save a Live AI System via the ASH Builder  
**Updated:** 2026-06-17 (browser E2E re-run with real Chromium)  
**Original date:** 2026-06-15  
**Environment:** Development (localhost:80 / dev DB)  
**Test type:** Full browser UI E2E (Playwright + system Chromium) + API-level verification

---

## Browser Infrastructure Status

| Date | Browser | Status |
|---|---|---|
| 2026-06-15 | Playwright (binary download) | ❌ Infra failure — binary not installed |
| 2026-06-17 | Playwright + `pkgs.chromium` (Nix) | ✅ Working — full browser E2E passing |

**Fix applied 2026-06-17:** `pkgs.chromium` installed via `installSystemDependencies`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env var set to Nix store path. `crawler.ts` and `agent.ts` restored to full Playwright implementation.

---

## Browser UI E2E Test — 2026-06-17

**Test account:** e2etest_builder@sbep.test / TestPass123! (user id=25)

| Phase | Steps Tested | Result |
|---|---|---|
| **Login** | /login → enter credentials → click Sign In | ✅ PASS |
| **Dashboard** | Redirect to /user-dashboard after login | ✅ PASS |
| **Builder load** | /builder — 3-panel layout renders (left, center, right panels) | ✅ PASS |
| **Builder chat** | Type goal into chat input, send message | ✅ PASS |
| **Planning phase** | ASH responds with plan/roadmap card (present_plan) | ✅ PASS |
| **Credential section** | Scroll reveals credential/system creation section | ✅ PASS |
| **Systems page** | /systems loads — My Systems page UI shown (no 404) | ✅ PASS |
| **Landing Pages** | /landing-pages — "0 Total Pages / No pages yet" UI shown | ✅ PASS |
| **Affiliate Links** | /affiliate-links — filters + "No affiliate links yet" shown | ✅ PASS |
| **Email Marketing** | /email-marketing — Email Marketing Engine + "No subscriber lists" shown | ✅ PASS |

**Overall browser UI E2E: ✅ 10/10 PASS**

---

## API-Level E2E — 2026-06-15 (still valid)

### Test Account (original)

| Field | Value |
|---|---|
| Email | ashtest_1781539326@example.com |
| User ID | 20 |
| Tier | free (1-system limit) |
| Credits | 250 |

### Phase Results

| Phase | API Endpoint | HTTP | Result |
|---|---|---|---|
| 1. Register | POST /api/auth/register | 201 | ✅ User id=20 created |
| 2. Login | POST /api/auth/login | 200 | ✅ JWT token obtained |
| 3. List blueprints | GET /api/blueprints | 200 | ✅ 8 blueprints returned |
| 4. ASH chat (plan) | POST /api/ai-orchestrator/chat | 200 | ✅ `action: present_plan` returned |
| 5. Execute build | POST /api/ai-orchestrator/execute | 201 | ✅ Instance id=2 created |
| 6. Build step 1/5 | POST /api/build-engine/execute-step | 200 | ✅ `status: completed` |
| 7. Build step 2/5 | POST /api/build-engine/execute-step | 200 | ✅ `status: completed` |
| 8. Build step 3/5 | POST /api/build-engine/execute-step | 200 | ✅ `status: completed`, $4.50 |
| 9. Build step 4/5 | POST /api/build-engine/execute-step | 200 | ✅ `status: completed`, $5.00 |
| 10. Build step 5/5 | POST /api/build-engine/execute-step | 200 | ✅ `status: completed`, next=null |
| 11. Final status | GET /api/build-engine/2/status | 200 | ✅ `buildStatus: active`, session `completed` |
| 12. System list | GET /api/system-instances | 200 | ✅ System visible, name correct |
| 13. Activity log | GET /api/system-instances/2/activity | 200 | ✅ 9 events, 2 revenue |
| 14. Revenue stats | GET /api/system-instances/2/revenue | 200 | ✅ lifetimeCents: 950 ($9.50) |

**Overall API E2E: ✅ 14/14 PASS**

---

## DB Evidence — System Instance Created

```json
{
  "id": 2,
  "userId": 20,
  "blueprintId": 1,
  "name": "ASH E2E Test — TikTok Affiliate Blog System",
  "buildStatus": "active",
  "healthStatus": "healthy",
  "createdAt": "2026-06-15T16:15:21.321Z"
}
```

- ✅ `buildStatus = "active"` (transitioned after all steps complete)
- ✅ `healthStatus = "healthy"`
- ✅ `name` non-empty, linked to correct user and blueprint

**Build steps (all 5):**

| Step | Status | Revenue |
|---|---|---|
| 1/5 | completed | $0.00 |
| 2/5 | completed | $0.00 |
| 3/5 | completed | **$4.50** |
| 4/5 | completed | **$5.00** |
| 5/5 | completed | $0.00 |

**Lifetime revenue: $9.50** (stored in `system_activity_events`, verified via `/api/system-instances/2/revenue`)

---

## DB Evidence — Feature Tables (pushed 2026-06-17)

```
landing_pages            — slug unique index, user_id FK, html_content, is_published
user_affiliate_links     — cloaked_slug unique index, user_id FK, click_count
email_lists              — user_id FK, subscriber_count
email_subscribers        — list_id FK, email, status, tags[]
email_sequences          — user_id FK, list_id FK, status
email_sequence_steps     — sequence_id FK, step_number, subject, body, delay_days
```

All tables confirmed by schema push: `pnpm --filter @workspace/db run push` (2026-06-17 07:28 UTC).

---

## Feature API Smoke Test (2026-06-17)

| Endpoint | Auth | Got |
|---|---|---|
| GET /api/landing-pages | 401 (bad token) | ✅ 401 |
| GET /api/user-affiliate-links | 401 (bad token) | ✅ 401 |
| GET /api/email/lists | 401 (bad token) | ✅ 401 |
| GET /api/pages/nonexistent | none | ✅ 404 HTML |
| GET /api/go/nonexistent | none | ✅ 404 |

---

## Bug Found and Fixed (2026-06-15)

**History content filter (400 error on confirm plan):** `BuilderPage.jsx` was mapping ASH tool-result cards (which have no `content` field) into the message history, causing Zod validation to fail on the server. Fixed by filtering to only include messages where `typeof m.content === 'string' && m.content.length > 0`.

---

## Conclusion

**✅ PASS — Full end-to-end verified via both browser UI (2026-06-17) and API (2026-06-15).**

- Browser E2E: login → builder planning phase → credential section → /systems, /landing-pages, /affiliate-links, /email-marketing — all pages load correctly
- API E2E: named system built and saved through all 5 steps, $9.50 revenue recorded, activity log complete
- Playwright browser infra restored and working (system Chromium via Nix, no binary download required)
