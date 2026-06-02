---
name: Affiliate link field naming
description: Two different field shapes for tool affiliate links — config vs API — and how to read each correctly
---

There are TWO distinct shapes for a tool's affiliate link, and mixing them silently drops links (falls back to `"#"` placeholder):

1. **Config objects** (`toolAffiliateLinks` in `artifacts/web/src/config/toolAffiliateLinks.js`): canonical field is `cta_link`, with optional `affiliate_link` override. Read as `obj.affiliate_link || obj.cta_link`, or use the `getAffiliateLink(toolName)` helper which does exactly that.
2. **API tools** (from `/api/tools` via the shim): camelCase `affiliateLink`. The shim does NO field mapping, so DB/API rows are camelCase.

**Why:** A recurring bug — several pages read `configMatch.affiliateLink` (undefined on config objects, which use `cta_link`) or `pbTool.affiliate_link` (undefined on API rows, which use `affiliateLink`). Both resolve to undefined → `"#"` placeholder, defeating the "real links everywhere" requirement.

**How to apply:** When consuming a config object use `affiliate_link || cta_link` (or `getAffiliateLink`); when consuming an API/DB tool use `affiliateLink` (optionally `|| affiliate_link` for safety). MarketplacePage is DB-authoritative for existence+link but enriches presentation from `productsData` (config-derived) by name match. The tool catalog single source is the config file; `scripts/src/seed-tools.ts` bootstraps the DB `tools` + `affiliate_links` from it (run via tsx; excluded from scripts typecheck because it imports cross-package).
