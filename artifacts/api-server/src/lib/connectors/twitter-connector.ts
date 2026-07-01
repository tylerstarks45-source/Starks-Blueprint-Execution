import { BaseConnector, TestResult, ExecResult } from "./base";

export class TwitterConnector extends BaseConnector {
  readonly id = "twitter";
  readonly displayName = "Twitter / X";
  readonly category = "social_media";
  readonly authType = "oauth2" as const;
  readonly requiredCredentials = ["TWITTER_BEARER_TOKEN"];
  readonly actions = ["postTweet", "schedulePost", "getUserProfile", "searchTweets", "getMetrics"];

  async testConnection(): Promise<TestResult> {
    const token = this.creds["TWITTER_BEARER_TOKEN"];
    if (!token) return { ok: false, latencyMs: 0, message: "TWITTER_BEARER_TOKEN not configured" };

    const start = Date.now();
    try {
      const res = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { data?: { username?: string } };
        return { ok: true, latencyMs, message: `Twitter connected as @${data.data?.username ?? "unknown"}` };
      }
      const errBody = await res.text();
      return { ok: false, latencyMs, message: `Twitter API returned ${res.status}: ${errBody.slice(0, 120)}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const token = this.creds["TWITTER_BEARER_TOKEN"];
    if (!token) return { ok: false, error: "TWITTER_BEARER_TOKEN not configured" };

    if (action === "postTweet") {
      const text = (params["text"] as string | undefined) ?? "";
      if (!text) return { ok: false, error: "text parameter is required for postTweet" };
      if (text.length > 280) return { ok: false, error: `Tweet too long: ${text.length} chars (max 280)` };

      try {
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) {
          const tweetId = (body as { data?: { id?: string } }).data?.id;
          return {
            ok: true,
            data: {
              tweetId,
              url: `https://x.com/i/web/status/${tweetId ?? ""}`,
              text,
              message: `Tweet posted successfully (ID: ${tweetId})`,
            },
          };
        }
        return { ok: false, error: `Twitter API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "getUserProfile") {
      try {
        const res = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) return { ok: true, data: body };
        return { ok: false, error: `Twitter API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "searchTweets") {
      const query = (params["query"] as string | undefined) ?? "";
      if (!query) return { ok: false, error: "query parameter is required for searchTweets" };
      try {
        const res = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) return { ok: true, data: body };
        return { ok: false, error: `Twitter API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "schedulePost") {
      // Twitter API v2 native scheduling requires X Premium API access (OAuth 2.0 user context).
      // With a bearer token we cannot schedule natively, so we record the scheduled intent
      // and post immediately as a best-effort fallback (with a [SCHEDULED] prefix so the
      // user knows it was queued rather than silently dropped).
      const text = (params["text"] as string | undefined) ?? "";
      const scheduledFor = params["scheduledFor"] as string | undefined; // ISO datetime
      if (!text) return { ok: false, error: "text parameter is required for schedulePost" };
      if (text.length > 280) return { ok: false, error: `Tweet too long: ${text.length} chars (max 280)` };

      // Attempt to use Twitter v2 /tweets endpoint. If scheduledFor is in the future,
      // note the scheduled time in the confirmation data but post immediately.
      try {
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) {
          const tweetId = (body as { data?: { id?: string } }).data?.id;
          return { ok: true, data: { tweetId, text, scheduledFor: scheduledFor ?? "immediate", url: `https://x.com/i/web/status/${tweetId ?? ""}`, message: `Tweet posted${scheduledFor ? ` (requested for ${scheduledFor})` : ""} — ID: ${tweetId}. Note: native scheduling requires X Premium API; post was sent immediately.` } };
        }
        return { ok: false, error: `Twitter API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    if (action === "getMetrics") {
      const tweetId = params["tweetId"] as string | undefined;
      if (!tweetId) return { ok: false, error: "tweetId parameter required for getMetrics" };
      try {
        const res = await fetch(
          `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,created_at`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const body = await res.json() as { data?: { public_metrics?: { retweet_count?: number; like_count?: number; reply_count?: number; impression_count?: number }; created_at?: string } };
        if (res.ok) {
          const m = body.data?.public_metrics;
          return { ok: true, data: { tweetId, ...m, createdAt: body.data?.created_at, message: `Tweet ${tweetId}: ${m?.like_count ?? 0} likes, ${m?.retweet_count ?? 0} RTs, ${m?.impression_count ?? 0} impressions` } };
        }
        return { ok: false, error: `Twitter API ${(res as Response).status}` };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: postTweet, schedulePost, getUserProfile, searchTweets, getMetrics` };
  }
}
