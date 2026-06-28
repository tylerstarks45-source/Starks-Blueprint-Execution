import { BaseConnector, TestResult, ExecResult } from "./base";

export class LinkedInConnector extends BaseConnector {
  readonly id = "linkedin";
  readonly displayName = "LinkedIn";
  readonly category = "social_media";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["LINKEDIN_ACCESS_TOKEN"];
  readonly actions = ["getProfile", "createPost", "getCompanyUpdates", "shareContent"];

  private headers() {
    return {
      Authorization: `Bearer ${this.creds["LINKEDIN_ACCESS_TOKEN"]}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["LINKEDIN_ACCESS_TOKEN"]) {
      return { ok: false, latencyMs: 0, message: "LINKEDIN_ACCESS_TOKEN required" };
    }
    const start = Date.now();
    try {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { name?: string; email?: string; sub?: string };
        return { ok: true, latencyMs, message: `Connected as ${data.name ?? data.email ?? data.sub ?? "LinkedIn user"}` };
      }
      return { ok: false, latencyMs, message: `LinkedIn returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const token = this.creds["LINKEDIN_ACCESS_TOKEN"];
    if (!token) return { ok: false, error: "LINKEDIN_ACCESS_TOKEN required" };

    try {
      if (action === "getProfile") {
        const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `LinkedIn ${res.status}` };
        const data = await res.json() as { name?: string; email?: string; sub?: string; picture?: string };
        return { ok: true, data: { name: data.name, email: data.email, id: data.sub, picture: data.picture, message: `Profile: ${data.name ?? "LinkedIn user"}` } };
      }
      if (action === "createPost" || action === "shareContent") {
        // Get author URN from userinfo first
        const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: this.headers() });
        if (!profileRes.ok) return { ok: false, error: `LinkedIn profile fetch failed: ${profileRes.status}` };
        const profile = await profileRes.json() as { sub?: string };
        const authorUrn = `urn:li:person:${profile.sub}`;

        const text = (params["text"] as string) ?? (params["content"] as string) ?? "";
        if (!text) return { ok: false, error: "text or content parameter required for createPost" };

        const body = {
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        };
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.text();
          return { ok: false, error: `LinkedIn ${res.status}: ${err.slice(0, 200)}` };
        }
        const postId = res.headers.get("x-restli-id") ?? "unknown";
        return { ok: true, data: { postId, authorUrn, text: text.slice(0, 100), message: `LinkedIn post published (ID: ${postId})`, url: `https://www.linkedin.com/feed/` } };
      }
      if (action === "getCompanyUpdates") {
        const orgId = (params["organizationId"] as string) ?? this.creds["LINKEDIN_ORG_ID"];
        if (!orgId) return { ok: false, error: "organizationId or LINKEDIN_ORG_ID required" };
        const res = await fetch(
          `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`,
          { headers: this.headers() },
        );
        if (!res.ok) return { ok: false, error: `LinkedIn ${res.status}` };
        const data = await res.json() as { elements?: unknown[] };
        return { ok: true, data: { count: data.elements?.length ?? 0, message: `Retrieved ${data.elements?.length ?? 0} company update stats` } };
      }
      return { ok: false, error: `Unknown LinkedIn action: ${action}. Available: getProfile, createPost, shareContent, getCompanyUpdates` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
