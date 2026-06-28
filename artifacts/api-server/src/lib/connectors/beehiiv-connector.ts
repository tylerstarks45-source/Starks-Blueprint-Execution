import { BaseConnector, TestResult, ExecResult } from "./base";

// Beehiiv v2 API connector.
// Required credentials:
//   BEEHIIV_API_KEY         — API key from beehiiv.com/settings/api
//   BEEHIIV_PUBLICATION_ID  — Publication ID (pub_xxxxxxxx)

const BASE = "https://api.beehiiv.com/v2";

export class BeehiivConnector extends BaseConnector {
  readonly id = "beehiiv";
  readonly displayName = "Beehiiv";
  readonly category = "email";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["BEEHIIV_API_KEY", "BEEHIIV_PUBLICATION_ID"];
  readonly actions = ["getPublication", "listSubscribers", "createSubscriber", "createPost", "sendPost", "getPostStats"];

  private headers() {
    return {
      Authorization: `Bearer ${this.creds["BEEHIIV_API_KEY"]}`,
      "Content-Type": "application/json",
    };
  }
  private pubId() { return this.creds["BEEHIIV_PUBLICATION_ID"]; }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["BEEHIIV_API_KEY"] || !this.pubId()) {
      return { ok: false, latencyMs: 0, message: "BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${BASE}/publications/${this.pubId()}`, { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { data?: { name?: string; active_subscriber_count?: number } };
        return { ok: true, latencyMs, message: `Connected to "${data.data?.name}" (${data.data?.active_subscriber_count ?? 0} subscribers)` };
      }
      return { ok: false, latencyMs, message: `Beehiiv returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const key = this.creds["BEEHIIV_API_KEY"];
    const pubId = this.pubId();
    if (!key || !pubId) return { ok: false, error: "BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID required" };

    try {
      if (action === "getPublication") {
        const res = await fetch(`${BASE}/publications/${pubId}`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Beehiiv ${res.status}` };
        const data = await res.json() as { data?: { name?: string; active_subscriber_count?: number; created_at?: string } };
        return { ok: true, data: { name: data.data?.name, subscribers: data.data?.active_subscriber_count, message: `Publication: "${data.data?.name}" with ${data.data?.active_subscriber_count ?? 0} subscribers` } };
      }

      if (action === "listSubscribers") {
        const limit = Math.min((params["limit"] as number) ?? 20, 100);
        const res = await fetch(`${BASE}/publications/${pubId}/subscriptions?limit=${limit}`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Beehiiv ${res.status}` };
        const data = await res.json() as { data?: Array<{ id?: string; email?: string; status?: string }>; total_results?: number };
        return { ok: true, data: { total: data.total_results, count: data.data?.length ?? 0, subscribers: data.data?.slice(0, 5).map(s => ({ id: s.id, email: s.email, status: s.status })), message: `${data.total_results ?? data.data?.length ?? 0} total subscribers found` } };
      }

      if (action === "createSubscriber") {
        const email = params["email"] as string;
        if (!email) return { ok: false, error: "email required" };
        const body: Record<string, unknown> = {
          email,
          reactivate_existing: (params["reactivate"] as boolean) ?? false,
          send_welcome_email: (params["sendWelcome"] as boolean) ?? true,
        };
        if (params["firstName"]) body["first_name"] = params["firstName"];
        if (params["lastName"]) body["last_name"] = params["lastName"];
        if (params["customFields"]) body["custom_fields"] = params["customFields"];
        const res = await fetch(`${BASE}/publications/${pubId}/subscriptions`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `Beehiiv ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { data?: { id?: string; email?: string; status?: string; created?: boolean } };
        return { ok: true, data: { id: data.data?.id, email: data.data?.email, status: data.data?.status, created: data.data?.created, message: `Subscriber ${email} ${data.data?.created ? "created" : "already existed"} (${data.data?.status})` } };
      }

      if (action === "createPost") {
        const title = (params["title"] as string) ?? "New Post";
        const subtitle = (params["subtitle"] as string) ?? "";
        const contentJson = params["contentJson"] as string | undefined;
        const body: Record<string, unknown> = {
          publication_id: pubId,
          title,
          subtitle,
          status: "draft",
          content_type: contentJson ? "json" : "free",
          ...(contentJson ? { content_json: contentJson } : {}),
        };
        const res = await fetch(`${BASE}/publications/${pubId}/posts`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `Beehiiv ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { data?: { id?: string; title?: string; status?: string; web_url?: string } };
        return { ok: true, data: { id: data.data?.id, title: data.data?.title, status: data.data?.status, url: data.data?.web_url, message: `Post "${data.data?.title}" created as draft (ID: ${data.data?.id})` } };
      }

      if (action === "sendPost") {
        const postId = params["postId"] as string;
        if (!postId) return { ok: false, error: "postId required" };
        const res = await fetch(`${BASE}/publications/${pubId}/posts/${postId}`, {
          method: "PATCH", headers: this.headers(), body: JSON.stringify({ status: "confirmed" }),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `Beehiiv ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { data?: { id?: string; status?: string } };
        return { ok: true, data: { id: data.data?.id, status: data.data?.status, message: `Post ${postId} status set to "${data.data?.status}"` } };
      }

      if (action === "getPostStats") {
        const postId = params["postId"] as string;
        if (!postId) return { ok: false, error: "postId required" };
        const res = await fetch(`${BASE}/publications/${pubId}/posts/${postId}?expand[]=stats`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Beehiiv ${res.status}` };
        const data = await res.json() as { data?: { stats?: { email_delivered?: number; email_opens?: number; email_clicks?: number; web_views?: number } } };
        const stats = data.data?.stats;
        return { ok: true, data: { ...stats, message: `Post stats: ${stats?.email_delivered ?? 0} delivered, ${stats?.email_opens ?? 0} opens, ${stats?.email_clicks ?? 0} clicks` } };
      }

      return { ok: false, error: `Unknown Beehiiv action: ${action}. Available: getPublication, listSubscribers, createSubscriber, createPost, sendPost, getPostStats` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
