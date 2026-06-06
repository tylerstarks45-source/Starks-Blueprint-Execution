import { BaseConnector, TestResult, ExecResult } from "./base";

abstract class OAuthStub extends BaseConnector {
  readonly stubOnly = true;
  readonly authType = "oauth2" as const;

  async testConnection(): Promise<TestResult> {
    return {
      ok: false,
      latencyMs: 0,
      message: `${this.displayName} requires OAuth2 authorization. This connector is coming soon.`,
      details: { stubOnly: true },
    };
  }

  async execute(_action: string, _params: Record<string, unknown>): Promise<ExecResult> {
    return { ok: false, error: `${this.displayName} connector is not yet available. OAuth2 setup required.` };
  }
}

export class GmailStub extends OAuthStub {
  readonly id = "gmail";
  readonly displayName = "Gmail";
  readonly category = "communication";
  readonly requiredCredentials = ["client_id", "client_secret", "refresh_token"];
  readonly actions = ["sendEmail", "readInbox", "createDraft", "searchEmails"];
}

export class GoogleSheetsStub extends OAuthStub {
  readonly id = "google_sheets";
  readonly displayName = "Google Sheets";
  readonly category = "data";
  readonly requiredCredentials = ["client_id", "client_secret", "refresh_token"];
  readonly actions = ["readSheet", "appendRow", "updateCell", "createSheet"];
}

export class TikTokStub extends OAuthStub {
  readonly id = "tiktok";
  readonly displayName = "TikTok";
  readonly category = "social_media";
  readonly requiredCredentials = ["access_token"];
  readonly actions = ["uploadVideo", "getAnalytics", "schedulePost", "getFollowers"];
}

export class MetaStub extends OAuthStub {
  readonly id = "meta";
  readonly displayName = "Meta (Facebook/Instagram)";
  readonly category = "social_media";
  readonly requiredCredentials = ["access_token", "page_id"];
  readonly actions = ["createAd", "getInsights", "publishPost", "getPageAnalytics"];
}

export class YouTubeStub extends OAuthStub {
  readonly id = "youtube";
  readonly displayName = "YouTube";
  readonly category = "social_media";
  readonly requiredCredentials = ["client_id", "client_secret", "refresh_token"];
  readonly actions = ["uploadVideo", "getAnalytics", "updateDescription", "getSubscribers"];
}

export class ShopifyStub extends BaseConnector {
  readonly id = "shopify";
  readonly displayName = "Shopify";
  readonly category = "ecommerce";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["shop_domain", "access_token"];
  readonly actions = ["createProduct", "getOrders", "syncInventory", "updateProduct"];
  readonly stubOnly = true;

  async testConnection(): Promise<TestResult> {
    if (!this.creds["shop_domain"] || !this.creds["access_token"]) {
      return { ok: false, latencyMs: 0, message: "Shopify credentials not configured" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`https://${this.creds["shop_domain"]}/admin/api/2024-01/shop.json`, {
        headers: { "X-Shopify-Access-Token": this.creds["access_token"] },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { ok: true, latencyMs, message: "Shopify store connected" };
      return { ok: false, latencyMs, message: `Shopify returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(_action: string, _params: Record<string, unknown>): Promise<ExecResult> {
    return { ok: false, error: "Shopify connector coming soon — full CRUD support in Phase 6" };
  }
}

export class CloudflareStub extends BaseConnector {
  readonly id = "cloudflare";
  readonly displayName = "Cloudflare";
  readonly category = "infrastructure";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["api_token", "account_id"];
  readonly actions = ["deploySite", "purgeCache", "getDNS", "listWorkers"];
  readonly stubOnly = true;

  async testConnection(): Promise<TestResult> {
    if (!this.creds["api_token"]) {
      return { ok: false, latencyMs: 0, message: "Cloudflare API token not configured" };
    }
    const start = Date.now();
    try {
      const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: { Authorization: `Bearer ${this.creds["api_token"]}` },
      });
      const latencyMs = Date.now() - start;
      const data = await res.json() as { success: boolean };
      if (data.success) return { ok: true, latencyMs, message: "Cloudflare token valid" };
      return { ok: false, latencyMs, message: "Invalid Cloudflare API token" };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(_action: string, _params: Record<string, unknown>): Promise<ExecResult> {
    return { ok: false, error: "Cloudflare connector coming soon — deployment support in Phase 7" };
  }
}
