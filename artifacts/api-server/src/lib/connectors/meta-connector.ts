import { BaseConnector, TestResult, ExecResult } from "./base";

// Meta Graph API connector (Facebook Pages + Instagram Business).
// Required credentials:
//   META_ACCESS_TOKEN  — Page access token (long-lived, from Meta Developer console)
//   META_PAGE_ID       — Facebook Page ID (also used as Instagram business account target)

const GRAPH = "https://graph.facebook.com/v19.0";

export class MetaConnector extends BaseConnector {
  readonly id = "meta";
  readonly displayName = "Meta (Facebook/Instagram)";
  readonly category = "social_media";
  readonly authType = "oauth2" as const;
  readonly requiredCredentials = ["META_ACCESS_TOKEN", "META_PAGE_ID"];
  readonly actions = ["publishPost", "publishInstagramPost", "getPageInsights", "getPageAnalytics", "createAd", "getAdAccounts"];
  // createAd returns ad-account setup guidance rather than placing a real ad;
  // it cannot be fully automated by ASH without manual campaign setup first.
  readonly actionSupport = { createAd: "manual_required" } as const;

  private token() { return this.creds["META_ACCESS_TOKEN"]; }
  private pageId() { return this.creds["META_PAGE_ID"]; }

  async testConnection(): Promise<TestResult> {
    const token = this.token();
    const pageId = this.pageId();
    if (!token || !pageId) {
      return { ok: false, latencyMs: 0, message: "META_ACCESS_TOKEN and META_PAGE_ID required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${GRAPH}/${pageId}?fields=name,category,fan_count&access_token=${token}`);
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { name?: string; category?: string; fan_count?: number };
        return { ok: true, latencyMs, message: `Connected to page "${data.name}" (${data.fan_count ?? 0} followers)` };
      }
      const err = await res.json() as { error?: { message?: string } };
      return { ok: false, latencyMs, message: err.error?.message ?? `Meta returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const token = this.token();
    const pageId = this.pageId();
    if (!token || !pageId) return { ok: false, error: "META_ACCESS_TOKEN and META_PAGE_ID required" };

    try {
      if (action === "publishPost") {
        const message = (params["message"] as string) ?? (params["text"] as string) ?? "";
        const link = params["link"] as string | undefined;
        if (!message && !link) return { ok: false, error: "message or link required" };
        const body: Record<string, string> = { access_token: token };
        if (message) body["message"] = message;
        if (link) body["link"] = link;
        const res = await fetch(`${GRAPH}/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json() as { error?: { message?: string } }; return { ok: false, error: e.error?.message ?? `Meta ${res.status}` }; }
        const data = await res.json() as { id?: string };
        return { ok: true, data: { postId: data.id, pageId, message: `Facebook post published (${data.id})`, url: `https://facebook.com/${data.id?.split("_")[0]}` } };
      }

      if (action === "publishInstagramPost") {
        // Step 1: create media container
        const igAccountId = (params["igAccountId"] as string) ?? this.creds["META_IG_ACCOUNT_ID"] ?? pageId;
        const imageUrl = params["imageUrl"] as string | undefined;
        const caption = (params["caption"] as string) ?? "";
        if (!imageUrl) return { ok: false, error: "imageUrl required for Instagram post" };

        const containerRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
        });
        if (!containerRes.ok) { const e = await containerRes.json() as { error?: { message?: string } }; return { ok: false, error: e.error?.message ?? `Meta IG container ${containerRes.status}` }; }
        const container = await containerRes.json() as { id?: string };
        if (!container.id) return { ok: false, error: "No container ID returned from Meta" };

        // Step 2: publish the container
        const publishRes = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: container.id, access_token: token }),
        });
        if (!publishRes.ok) { const e = await publishRes.json() as { error?: { message?: string } }; return { ok: false, error: e.error?.message ?? `Meta IG publish ${publishRes.status}` }; }
        const pub = await publishRes.json() as { id?: string };
        return { ok: true, data: { mediaId: pub.id, containerId: container.id, caption: caption.slice(0, 80), message: `Instagram post published (media ID: ${pub.id})` } };
      }

      if (action === "getPageInsights" || action === "getPageAnalytics") {
        const metric = (params["metric"] as string) ?? "page_impressions,page_engaged_users,page_fans";
        const period = (params["period"] as string) ?? "week";
        const res = await fetch(`${GRAPH}/${pageId}/insights?metric=${metric}&period=${period}&access_token=${token}`);
        if (!res.ok) { const e = await res.json() as { error?: { message?: string } }; return { ok: false, error: e.error?.message ?? `Meta ${res.status}` }; }
        const data = await res.json() as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> };
        const summary: Record<string, number | undefined> = {};
        for (const item of data.data ?? []) {
          const latest = item.values?.at(-1)?.value;
          if (item.name) summary[item.name] = latest;
        }
        return { ok: true, data: { ...summary, period, message: `Page insights retrieved (period: ${period})` } };
      }

      if (action === "getAdAccounts") {
        const res = await fetch(`${GRAPH}/me/adaccounts?fields=name,account_status,currency,balance&access_token=${token}`);
        if (!res.ok) { const e = await res.json() as { error?: { message?: string } }; return { ok: false, error: e.error?.message ?? `Meta ${res.status}` }; }
        const data = await res.json() as { data?: Array<{ id?: string; name?: string; account_status?: number; currency?: string }> };
        return { ok: true, data: { count: data.data?.length ?? 0, accounts: data.data?.slice(0, 5), message: `Found ${data.data?.length ?? 0} ad account(s)` } };
      }

      if (action === "createAd") {
        return { ok: false, error: "createAd requires Facebook Ad Account ID and campaign setup. Use getAdAccounts first to retrieve your ad account IDs, then use Facebook Ads Manager API directly." };
      }

      return { ok: false, error: `Unknown Meta action: ${action}. Available: publishPost, publishInstagramPost, getPageInsights, getPageAnalytics, getAdAccounts` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
