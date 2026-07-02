import { BaseConnector, TestResult, ExecResult } from "./base";
import { getGoogleAccessToken } from "./google-oauth-helper";
import { validateExternalUrl } from "./ssrf-guard";

// YouTube Data API v3 connector. Requires a Google OAuth 2.0 app + refresh
// token (with youtube.force-ssl / youtube.upload scope) pasted into
// Connections Hub as YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN.
export class YouTubeConnector extends BaseConnector {
  readonly id = "youtube";
  readonly displayName = "YouTube";
  readonly category = "social_media";
  readonly authType = "oauth2" as const;
  readonly requiredCredentials = ["YOUTUBE_REFRESH_TOKEN", "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"];
  readonly actions = ["getChannelInfo", "getAnalytics", "getSubscribers", "updateVideoMetadata", "uploadVideo"];

  private token(): Promise<string> {
    return getGoogleAccessToken(this.creds, "YOUTUBE");
  }

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      const token = await this.token();
      const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const latencyMs = Date.now() - start;
      const data = await res.json() as { items?: Array<{ snippet?: { title?: string }; statistics?: { subscriberCount?: string } }> };
      if (res.ok && data.items?.length) {
        const ch = data.items[0]!;
        return { ok: true, latencyMs, message: `Connected to channel "${ch.snippet?.title ?? "unknown"}" (${ch.statistics?.subscriberCount ?? 0} subscribers)` };
      }
      return { ok: false, latencyMs, message: res.ok ? "No YouTube channel found for this account" : `YouTube API returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    let token: string;
    try {
      token = await this.token();
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    try {
      if (action === "getChannelInfo") {
        const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json() as { items?: Array<Record<string, unknown>> };
        if (!res.ok) return { ok: false, error: `YouTube API ${res.status}` };
        if (!data.items?.length) return { ok: false, error: "No YouTube channel found for this account" };
        return { ok: true, data: { ...data.items[0], message: "Channel info retrieved" } };
      }

      if (action === "getAnalytics" || action === "getSubscribers") {
        const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json() as { items?: Array<{ statistics?: Record<string, string> }> };
        if (!res.ok) return { ok: false, error: `YouTube API ${res.status}` };
        const stats = data.items?.[0]?.statistics ?? {};
        return { ok: true, data: { ...stats, message: `Channel statistics: ${stats["subscriberCount"] ?? 0} subscribers, ${stats["viewCount"] ?? 0} views, ${stats["videoCount"] ?? 0} videos` } };
      }

      if (action === "updateVideoMetadata" || action === "updateDescription") {
        const videoId = params["videoId"] as string | undefined;
        if (!videoId) return { ok: false, error: "videoId is required" };
        const title = params["title"] as string | undefined;
        const description = params["description"] as string | undefined;
        const tags = params["tags"] as string[] | undefined;

        const getRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, { headers: { Authorization: `Bearer ${token}` } });
        const getData = await getRes.json() as { items?: Array<{ snippet?: Record<string, unknown> }> };
        if (!getRes.ok || !getData.items?.length) return { ok: false, error: `Video ${videoId} not found or not accessible` };
        const existingSnippet = getData.items[0]!.snippet ?? {};

        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: videoId,
            snippet: {
              ...existingSnippet,
              ...(title ? { title } : {}),
              ...(description ? { description } : {}),
              ...(tags ? { tags } : {}),
              categoryId: (existingSnippet["categoryId"] as string) ?? "22",
            },
          }),
        });
        const data = await res.json() as Record<string, unknown>;
        if (res.ok) return { ok: true, data: { videoId, message: `Video ${videoId} metadata updated`, url: `https://www.youtube.com/watch?v=${videoId}` } };
        return { ok: false, error: `YouTube API ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };
      }

      if (action === "uploadVideo") {
        const videoUrl = params["videoUrl"] as string | undefined;
        const title = (params["title"] as string | undefined) ?? "Untitled";
        const description = (params["description"] as string | undefined) ?? "";
        const tags = (params["tags"] as string[] | undefined) ?? [];
        const privacyStatus = (params["privacyStatus"] as string | undefined) ?? "private";
        if (!videoUrl) return { ok: false, error: "videoUrl (a public URL to the video file) is required for uploadVideo" };
        const ssrfErr = validateExternalUrl(videoUrl, "videoUrl");
        if (ssrfErr) return { ok: false, error: ssrfErr };

        const videoRes = await fetch(videoUrl);
        if (!videoRes.ok) return { ok: false, error: `Could not fetch video from videoUrl (${videoRes.status})` };
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        if (videoBuffer.byteLength > 100 * 1024 * 1024) {
          return { ok: false, error: "Video is larger than 100MB — this connector supports direct multipart upload only. Use a smaller file." };
        }

        const boundary = `sbep_boundary_${Date.now()}`;
        const metadata = JSON.stringify({ snippet: { title, description, tags, categoryId: "22" }, status: { privacyStatus } });
        const multipartBody = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: video/*\r\n\r\n`),
          videoBuffer,
          Buffer.from(`\r\n--${boundary}--`),
        ]);

        const res = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
          body: multipartBody,
        });
        const data = await res.json() as { id?: string; error?: { message?: string } };
        if (res.ok && data.id) {
          return { ok: true, data: { videoId: data.id, url: `https://www.youtube.com/watch?v=${data.id}`, message: `Video uploaded (ID: ${data.id}, status: ${privacyStatus})` } };
        }
        return { ok: false, error: data.error?.message ?? `YouTube upload failed (${res.status})` };
      }

      return { ok: false, error: `Unknown YouTube action: ${action}. Available: ${this.actions.join(", ")}` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
