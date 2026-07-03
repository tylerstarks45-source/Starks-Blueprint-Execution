import { getConnector } from "./registry";

// ─── Authoritative catalog credential-key → connector map ────────────────────
//
// This is the single source of truth linking a credential key the user pastes
// in the Connections Hub to the real connector that operates it. It is used
// both to route "Test" clicks through the actual connector implementation
// (user-credentials.ts) and to compute honest per-integration functional
// status for the frontend catalog (GET /api/connectors/catalog-status).
//
// `keyMap` remaps a catalog credential key to the exact key name the connector
// constructor reads, for the rare cases they differ (e.g. OpenRouter's
// connector reads `api_key`, LinkedIn's reads LINKEDIN_ACCESS_TOKEN). Sibling
// keys for multi-credential connectors (e.g. SHOPIFY_SHOP_DOMAIN alongside
// SHOPIFY_ACCESS_TOKEN) use their natural names the connector already reads, so
// they need no keyMap.
export const CATALOG_CONNECTOR_MAP: Record<
  string,
  { connectorId: string; keyMap?: Record<string, string> }
> = {
  // AI / LLM
  OPENROUTER_API_KEY: { connectorId: "openrouter", keyMap: { OPENROUTER_API_KEY: "api_key" } },
  // Payments
  STRIPE_SECRET_KEY: { connectorId: "stripe" },
  // Social
  TWITTER_BEARER_TOKEN: { connectorId: "twitter" },
  META_ACCESS_TOKEN: { connectorId: "meta" },
  TIKTOK_ACCESS_TOKEN: { connectorId: "tiktok" },
  LINKEDIN_API_KEY: { connectorId: "linkedin", keyMap: { LINKEDIN_API_KEY: "LINKEDIN_ACCESS_TOKEN" } },
  LINKEDIN_ACCESS_TOKEN: { connectorId: "linkedin" },
  GMAIL_REFRESH_TOKEN: { connectorId: "gmail" },
  YOUTUBE_REFRESH_TOKEN: { connectorId: "youtube" },
  // Email / marketing
  MAILCHIMP_API_KEY: { connectorId: "mailchimp" },
  CONVERTKIT_API_KEY: { connectorId: "convertkit" },
  BEEHIIV_API_KEY: { connectorId: "beehiiv" },
  SENDGRID_API_KEY: { connectorId: "sendgrid" },
  GOHIGHLEVEL_API_KEY: { connectorId: "gohighlevel" },
  // Publishing / CMS / courses / funnels
  WORDPRESS_APP_PASSWORD: { connectorId: "wordpress" },
  TEACHABLE_API_KEY: { connectorId: "teachable" },
  CLICKFUNNELS_API_SECRET: { connectorId: "clickfunnels" },
  // Data / productivity
  NOTION_API_KEY: { connectorId: "notion" },
  AIRTABLE_API_KEY: { connectorId: "airtable" },
  GOOGLE_SHEETS_SERVICE_ACCOUNT: { connectorId: "google_sheets", keyMap: { GOOGLE_SHEETS_SERVICE_ACCOUNT: "GOOGLE_SHEETS_SERVICE_ACCOUNT" } },
  // Commerce / infra
  SHOPIFY_ACCESS_TOKEN: { connectorId: "shopify" },
  CLOUDFLARE_API_TOKEN: { connectorId: "cloudflare" },
  // Messaging / automation (webhook-based)
  SLACK_WEBHOOK_URL: { connectorId: "slack" },
  ZAPIER_WEBHOOK_URL: { connectorId: "zapier" },
  WEBHOOK_URL: { connectorId: "webhook" },
};

// Credential keys that ASH can genuinely use even though they are NOT backed by
// a BaseConnector — e.g. ElevenLabs is consumed directly by the media-gen TTS
// route. Listed here so the catalog can honestly mark them functional (with
// their real capability) instead of demoting them to "affiliate only".
export const PLATFORM_FUNCTIONAL_KEYS: Record<string, { actions: string[] }> = {
  ELEVENLABS_API_KEY: { actions: ["textToSpeech"] },
};

export interface CatalogKeyStatus {
  functional: boolean;
  connectorId?: string;
  available: boolean;
  stubOnly: boolean;
  actions: string[];
}

// Builds the honest per-credential-key status map served to the frontend.
// The set of genuinely automated actions is derived from each connector's own
// `actionMeta` (declared via the `actionSupport` property on the connector
// class), so the catalog stays honest as connectors evolve — no separate
// exclusion list to keep in sync.
export function buildCatalogStatus(): Record<string, CatalogKeyStatus> {
  const out: Record<string, CatalogKeyStatus> = {};

  for (const [key, { connectorId }] of Object.entries(CATALOG_CONNECTOR_MAP)) {
    const connector = getConnector(connectorId, {});
    if (!connector) continue;
    const meta = connector.describe();
    const automatedActions = meta.actions.filter(
      (a) => (meta.actionMeta[a] ?? "automated") === "automated",
    );
    out[key] = {
      functional: automatedActions.length > 0,
      connectorId,
      available: meta.available,
      stubOnly: !!meta.stubOnly,
      actions: automatedActions,
    };
  }

  for (const [key, info] of Object.entries(PLATFORM_FUNCTIONAL_KEYS)) {
    out[key] = { functional: true, available: true, stubOnly: false, actions: info.actions };
  }

  return out;
}

// Human-readable name for a credential key, resolved via its connector when one
// exists, else a best-effort title-cased fallback. Used in expiry warnings.
export function credentialDisplayName(credentialKey: string): string {
  const mapping = CATALOG_CONNECTOR_MAP[credentialKey];
  if (mapping) {
    const connector = getConnector(mapping.connectorId, {});
    if (connector) return connector.displayName;
  }
  const base = credentialKey
    .replace(/_(API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|SECRET|TOKEN|WEBHOOK_URL|APP_PASSWORD|SERVICE_ACCOUNT|BEARER_TOKEN)$/i, "")
    .replace(/_/g, " ")
    .trim();
  return base ? base.replace(/\b\w/g, (c) => c.toUpperCase()) : credentialKey;
}
