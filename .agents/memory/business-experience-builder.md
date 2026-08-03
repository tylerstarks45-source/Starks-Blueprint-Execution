---
name: Business Experience Builder
description: Build 053 — BEB; 10 tables, 8 EPs, total 398 EPs; 20 experience types; experience_registry only mutable; 4 platform themes; 8 templates; BEB_THROTTLE_CYCLES=390; Unified Business Experience Law.
---

# Business Experience Builder (BEB) — Build 053

**Why:** First business application on the Unified Platform. Every customer-facing digital experience is created here — not just websites. ASH constructs complete journeys (funnels, portals, knowledge centers) not isolated pages.

## Key Numbers
- 10 tables: `business_experiences`, `experience_pages`, `experience_sections`, `experience_themes`, `experience_navigation`, `experience_seo`, `experience_registry`, `experience_snapshots`, `experience_templates`, `experience_diagnostics`
- 8 extension points declared by `declareBEBExtensionPoints()`
- Cumulative EPs after this build: **398**
- `BEB_THROTTLE_CYCLES = 390` (EB fires maintenance every 390 cycles)
- Route prefix: `/api/experiences/*` (13 endpoints)

## Mutable Table
`experience_registry` — UNIQUE on `experience_id`; all other tables are append-only.

## Experience Types (20)
`business_website`, `landing_page`, `sales_funnel`, `product_page`, `checkout_flow`, `customer_portal`, `member_portal`, `knowledge_center`, `documentation_site`, `help_center`, `blog_system`, `resource_library`, `booking_page`, `contact_experience`, `lead_generation_page`, `event_page`, `waitlist`, `coming_soon_page`, `community_portal`, `future_experience`

## Platform Themes (4 seeded)
`platform_default`, `platform_dark`, `platform_minimal`, `platform_bold` — all in `experience_themes` with `is_platform=true`.

## Platform Templates (8 seeded)
`blank-page`, `home-hero`, `landing-lead`, `pricing-page`, `contact-page`, `knowledge-home`, `portal-dashboard`, `blog-index`.

## Architecture Notes
- **Publishing Preparation Engine** is validation-only — no deployment; records diagnostic on block.
- **Section types map to UVCF component keys** via `SECTION_COMPONENT_MAP` — no bespoke widgets allowed.
- **SEO audit** is a pure in-memory function — 0–100 scoring with issue/warning/pass breakdown.
- **Theme generates CSS variables** at runtime via `generateCssVariables()`.
- **IDs use crypto.randomUUID()** with prefixes: `exp_`, `page_`, `sec_`, `theme_`, `seo_`, `nav_`.

## How to Apply
- Create experience: `POST /api/experiences` → creates registry row atomically
- Page count update: executed via raw SQL `UPDATE experience_registry SET page_count = page_count + 1`
- SEO audit: `runSeoAudit(input)` — pure function, no DB needed
- Publish check: `runPublishingPreparation(experienceId)` — 5 DB queries
