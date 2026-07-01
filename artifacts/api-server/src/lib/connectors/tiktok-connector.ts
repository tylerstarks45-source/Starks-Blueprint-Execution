import { BaseConnector, TestResult, ExecResult } from "./base";

// TikTok Content Posting API (Direct Post). Requires an OAuth2 access token
// with video.publish / video.upload scope, obtained externally and pasted
// into Connections Hub as TIKTOK_ACCESS_TOKEN.
export class TikTokConnector extends BaseConnector {
  readonly id = "tiktok";
  readonly displayName = "TikTok";
  readonly category = "social_media";
  readonly authType = "oauth2" as const;
  readonly requiredCredentials = ["TIKTOK_ACCESS_TOKEN"];
  readonly actions = ["getProfile", "createPost", "getAnalytics"];

  private headers() {
    return {
      Authorization: `Bearer ${this.creds["TIKTOK_ACCESS_TOKEN"]}`,
      "Content-Type": "application/json; charset=UTF-8",
    };
  }

  async testConnection(): Promise<TestResult> {
    const token = this.creds["TIKTOK_ACCESS_TOKEN"];
    if (!token) return { ok: false, latencyMs: 0, message: "TIKTOK_ACCESS_TOKEN required" };

    const start = Date.now();
    try {
      const res = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,username",
        { headers: this.headers() },
      );
      const latencyMs = Date.now() - start;
      const body = await res.json() as { data?: { user?: { display_name?: string; username?: string } }; error?: { message?: string } };
      if (res.ok && !body.error?.message) {
        const user = body.data?.user;
        return { ok: true, latencyMs, message: `Connected as ${user?.display_name ?? user?.username ?? "TikTok user"}` };
      }
      return { ok: false, latencyMs, message: body.error?.message ?? `TikTok returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const token = this.creds["TIKTOK_ACCESS_TOKEN"];
    if (!token) return { ok: false, error: "TIKTOK_ACCESS_TOKEN required" };

    try {
      if (action === "getProfile") {
        const res = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,username,follower_count",
          { headers: this.headers() },
        );
        const body = await res.json() as { data?: { user?: Record<string, unknown> }; error?: { message?: string } };
        if (!res.ok || body.error?.message) return { ok: false, error: body.error?.message ?? `TikTok ${res.status}` };
        return { ok: true, data: { ...body.data?.user, message: `Profile: ${body.data?.user?.display_name ?? "TikTok user"}` } };
      }

      if (action === "createPost") {
        const videoUrl = (params["videoUrl"] as string) ?? (params["mediaUrl"] as string) ?? "";
        const caption = (params["caption"] as string) ?? (params["text"] as string) ?? (params["content"] as string) ?? "";
        if (!videoUrl) return { ok: false, error: "videoUrl parameter required for TikTok createPost" };

        // Direct Post via PULL_FROM_URL — TikTok fetches the hosted video itself.
        const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            post_info: {
              title: caption.slice(0, 2200),
              privacy_level: "SELF_ONLY",
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: "PULL_FROM_URL",
              video_url: videoUrl,
            },
          }),
        });
        const body = await res.json() as { data?: { publish_id?: string }; error?: { code?: string; message?: string } };
        if (!res.ok || (body.error && body.error.code !== "ok")) {
          return { ok: false, error: body.error?.message ?? `TikTok publish ${res.status}` };
        }
        const publishId = body.data?.publish_id ?? "unknown";
        return { ok: true, data: { publishId, message: `TikTok post submitted (ID: ${publishId})`, url: "https://www.tiktok.com/" } };
      }

      if (action === "getAnalytics") {
        const res = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count",
          { headers: this.headers() },
        );
        const body = await res.json() as { data?: { user?: Record<string, unknown> }; error?: { message?: string } };
        if (!res.ok || body.error?.message) return { ok: false, error: body.error?.message ?? `TikTok ${res.status}` };
        return { ok: true, data: { ...body.data?.user, message: "Retrieved TikTok analytics" } };
      }

      return { ok: false, error: `Unknown TikTok action: ${action}. Available: getProfile, createPost, getAnalytics` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
