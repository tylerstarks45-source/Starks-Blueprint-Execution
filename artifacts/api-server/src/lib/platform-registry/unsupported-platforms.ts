import type { PlatformDefinition } from "./types";

// ─── Configuration: platforms ASH does not support yet ─────────────────────
// This is pure data — extend ASH's "known unsupported" coverage by adding an
// entry here. No other file needs to change (see integration-rule.ts, which
// reads this list through the registry rather than keeping its own copy).
export const UNSUPPORTED_PLATFORMS: PlatformDefinition[] = [
  { id: "etsy", displayName: "Etsy", aliases: ["etsy"], supported: false, category: "ecommerce" },
  { id: "amazon_seller", displayName: "Amazon Seller", aliases: ["amazon seller", "amazon seller central"], supported: false, category: "ecommerce" },
  { id: "tiktok_shop", displayName: "TikTok Shop", aliases: ["tiktok shop"], supported: false, category: "ecommerce" },
  { id: "pinterest", displayName: "Pinterest", aliases: ["pinterest"], supported: false, category: "social" },
  { id: "whatsapp_business", displayName: "WhatsApp Business", aliases: ["whatsapp business", "whatsapp"], supported: false, category: "messaging" },
  { id: "salesforce", displayName: "Salesforce", aliases: ["salesforce"], supported: false, category: "crm" },
  { id: "hubspot", displayName: "HubSpot", aliases: ["hubspot"], supported: false, category: "crm" },
  { id: "quickbooks", displayName: "QuickBooks", aliases: ["quickbooks"], supported: false, category: "accounting" },
  { id: "square", displayName: "Square", aliases: ["square"], supported: false, category: "payments" },
  { id: "instagram_shopping", displayName: "Instagram Shopping", aliases: ["instagram shopping"], supported: false, category: "ecommerce" },
];
