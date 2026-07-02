---
name: Orphaned blueprint/system marketing pages
description: Several *SystemPage.jsx / SystemDetailPage.jsx / AIAffiliateBlueprintPage.jsx files exist but are not routed anywhere.
---

`AIAppointmentSetterEmpireSystemPage.jsx`, `AIAutomationAgencySystemPage.jsx`, `AIChatbotSalesFunnelSystemPage.jsx`, `AIPersonalBrandAuthoritySystemPage.jsx`, `AIVideoContentSystemPage.jsx`, `AIYouTubeCashCowSystemPage.jsx`, `ContentTrafficSalesSystemPage.jsx`, `FunnelEmailAutomationSystemPage.jsx`, `SocialGrowthAutomationSystemPage.jsx`, `SystemDetailPage.jsx`, and `AIAffiliateBlueprintPage.jsx` (all in `artifacts/web/src/pages/`) are **not referenced by any `<Route>` in `App.jsx`** and are not dynamically imported anywhere else. They are dead code / legacy per-blueprint marketing templates.

**Why:** `BlueprintDetailPage.jsx` (routed at `/blueprints/:slug`) is the actual generic template every blueprint uses today — there is no per-blueprint custom page mechanism. Confirmed via full-repo grep for each component name outside its own definition file (zero other references).

**How to apply:** Before spending time auditing/fixing responsiveness, styling, or bugs in one of these files, grep `App.jsx` (and any lazy-import maps) to confirm it's actually routed — otherwise the work has no user-visible effect. If the product intends to bring per-blueprint custom marketing pages back, that requires wiring a route/registry, not just editing these files.
