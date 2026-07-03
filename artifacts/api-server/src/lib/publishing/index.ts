/**
 * Autonomous Publishing Engine
 * Dispatches publish_content actions to the correct channel adapter.
 * Channels: twitter, instagram, mailchimp, convertkit, wordpress, ghost, youtube
 */

export interface PublishParams {
  channel: string;
  contentType: string;
  title?: string;
  content: string;
  imageUrl?: string;
  listId?: string;
  siteUrl?: string;
  videoId?: string;           // YouTube: ID of the video to update metadata on
  tags?: string[];            // YouTube: tags array
  categoryId?: string;        // YouTube: category numeric ID
  extraParams?: Record<string, unknown>;
}

/**
 * SSRF guard — blocks requests to localhost/private IP ranges to prevent
 * server-side request forgery via user-controlled siteUrl (WordPress/Ghost).
 * Returns an error string if the URL is dangerous, undefined if safe.
 */
async function validateSiteUrl(rawUrl: string | undefined): Promise<string | undefined> {
  if (!rawUrl) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "siteUrl is not a valid URL.";
  }
  const { hostname, protocol } = parsed;
  if (protocol !== "https:" && protocol !== "http:") {
    return "siteUrl must use http or https protocol.";
  }
  // Block localhost and loopback
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  ) {
    return "siteUrl must not point to localhost.";
  }
  // Block raw IPv4 literals in private/loopback/link-local/shared ranges
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) // RFC 6598 shared address space
    ) {
      return "siteUrl must not point to a private or internal IP address.";
    }
  }

  // Block raw IPv6 literals — loopback, link-local, unique-local, and embedded private IPv4
  // Strip surrounding brackets if present (URL parser includes them for IPv6)
  const h6 = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  // Detect IPv6 by presence of colon
  if (h6.includes(":")) {
    const lower = h6.toLowerCase();
    if (
      lower === "::1" ||                          // loopback
      lower.startsWith("fe80:")  ||               // link-local fe80::/10
      lower.startsWith("fc00:")  ||               // unique-local fc00::/7 (fc/fd)
      lower.startsWith("fd")     ||               // unique-local fd00::/8
      lower.startsWith("::ffff:") ||              // IPv4-mapped — check embedded IP below
      lower === "::" ||                           // unspecified
      lower.startsWith("100::")                   // Teredo (may embed private)
    ) {
      return "siteUrl must not point to a private or internal IP address.";
    }
    // For ::ffff: mapped addresses, extract and check the embedded IPv4
    if (lower.startsWith("::ffff:")) {
      const embedded = lower.slice(7);
      const embV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(embedded);
      if (embV4) {
        const [, ea, eb] = embV4.map(Number);
        if (
          ea === 10 || ea === 127 ||
          (ea === 172 && eb >= 16 && eb <= 31) ||
          (ea === 192 && eb === 168) ||
          (ea === 169 && eb === 254)
        ) {
          return "siteUrl must not point to a private or internal IP address.";
        }
      }
    }
  }

  // Block hostnames that resolve to private IPs via DNS
  // We do a best-effort check using Node's dns.lookup
  try {
    const { lookup } = await import("node:dns/promises");
    const resolved = await lookup(hostname, { family: 4 });
    const [ra, rb] = resolved.address.split(".").map(Number);
    if (
      ra === 10 || ra === 127 ||
      (ra === 172 && rb >= 16 && rb <= 31) ||
      (ra === 192 && rb === 168) ||
      (ra === 169 && rb === 254) ||
      (ra === 100 && rb >= 64 && rb <= 127)
    ) {
      return "siteUrl resolves to a private or internal IP address.";
    }
  } catch {
    // DNS lookup failed — not blocking; let the outbound fetch fail naturally
  }

  return undefined; // safe
}

export interface PublishResult {
  ok: boolean;
  publishedUrl?: string;
  externalId?: string;
  error?: string;
  data?: Record<string, unknown>;
}

// ── Twitter ────────────────────────────────────────────────────────────────────
async function publishTwitter(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const token = creds["TWITTER_BEARER_TOKEN"];
  if (!token) return { ok: false, error: "TWITTER_BEARER_TOKEN credential not found. Add it in Connections Hub." };

  const text = params.content.slice(0, 280);
  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = await res.json() as Record<string, unknown>;
    if (res.ok) {
      const tweetId = (body as { data?: { id?: string } }).data?.id;
      return {
        ok: true,
        publishedUrl: `https://x.com/i/web/status/${tweetId ?? ""}`,
        externalId: tweetId,
        data: { tweetId, text },
      };
    }
    return { ok: false, error: `Twitter API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── Instagram ──────────────────────────────────────────────────────────────────
// Resolves the Instagram Business Account ID linked to a Facebook Page, so
// OAuth-connected users (who only have META_ACCESS_TOKEN + META_PAGE_ID)
// don't need to separately supply an Instagram User ID.
async function resolveInstagramUserId(pageId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = await res.json() as { instagram_business_account?: { id?: string } };
    return data.instagram_business_account?.id ?? null;
  } catch {
    return null;
  }
}

async function publishInstagram(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const token = creds["INSTAGRAM_ACCESS_TOKEN"] ?? creds["META_ACCESS_TOKEN"];
  if (!token) return { ok: false, error: "INSTAGRAM_ACCESS_TOKEN credential not found. Add it in Connections Hub." };

  let igUserId: string | undefined = creds["INSTAGRAM_USER_ID"] ?? creds["IG_USER_ID"];
  if (!igUserId && creds["META_PAGE_ID"]) {
    igUserId = (await resolveInstagramUserId(creds["META_PAGE_ID"], token)) ?? undefined;
  }
  if (!igUserId) {
    return {
      ok: false,
      error: "Could not determine your Instagram Business Account. Make sure an Instagram Professional account is linked to your connected Facebook Page, or add INSTAGRAM_USER_ID manually in Connections Hub.",
    };
  }

  try {
    const caption = params.content.slice(0, 2200);

    // Step 1: Create media container
    const containerBody: Record<string, string> = {
      caption,
      access_token: token,
    };
    if (!params.imageUrl) {
      // Instagram's Graph API cannot publish text-only feed posts — an image
      // is mandatory. Fail explicitly instead of silently substituting a
      // third-party placeholder image.
      return {
        ok: false,
        error: "Instagram requires an image to publish — text-only posts aren't supported. Attach an image and try again.",
      };
    }
    containerBody["image_url"] = params.imageUrl;
    containerBody["media_type"] = "IMAGE";

    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      }
    );
    const createBody = await createRes.json() as Record<string, unknown>;
    if (!createRes.ok) return { ok: false, error: `Instagram create container ${createRes.status}: ${JSON.stringify(createBody).slice(0, 200)}` };

    const containerId = createBody["id"] as string;

    // Step 2: Publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: containerId, access_token: token }),
      }
    );
    const publishBody = await publishRes.json() as Record<string, unknown>;
    if (!publishRes.ok) return { ok: false, error: `Instagram publish ${publishRes.status}: ${JSON.stringify(publishBody).slice(0, 200)}` };

    const mediaId = publishBody["id"] as string;
    return {
      ok: true,
      publishedUrl: `https://www.instagram.com/`,
      externalId: mediaId,
      data: { mediaId, caption },
    };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── LinkedIn ───────────────────────────────────────────────────────────────────
async function publishLinkedIn(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const token = creds["LINKEDIN_ACCESS_TOKEN"];
  if (!token) return { ok: false, error: "LINKEDIN_ACCESS_TOKEN credential not found. Add it in Connections Hub." };

  try {
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!profileRes.ok) return { ok: false, error: `LinkedIn profile fetch failed: ${profileRes.status}` };
    const profile = await profileRes.json() as { sub?: string };
    const authorUrn = `urn:li:person:${profile.sub}`;
    const text = params.content.slice(0, 3000);

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `LinkedIn API ${res.status}: ${err.slice(0, 200)}` };
    }
    const postId = res.headers.get("x-restli-id") ?? "unknown";
    return { ok: true, publishedUrl: "https://www.linkedin.com/feed/", externalId: postId, data: { postId, text } };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── TikTok ─────────────────────────────────────────────────────────────────────
async function publishTikTok(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const token = creds["TIKTOK_ACCESS_TOKEN"];
  if (!token) return { ok: false, error: "TIKTOK_ACCESS_TOKEN credential not found. Add it in Connections Hub." };
  const videoUrl = params.imageUrl ?? (params.extraParams?.["videoUrl"] as string | undefined);
  if (!videoUrl) return { ok: false, error: "A video URL is required to publish to TikTok (attach media)." };

  try {
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        post_info: {
          title: params.content.slice(0, 2200),
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
      }),
    });
    const body = await res.json() as { data?: { publish_id?: string }; error?: { code?: string; message?: string } };
    if (!res.ok || (body.error && body.error.code !== "ok")) {
      return { ok: false, error: body.error?.message ?? `TikTok API ${res.status}` };
    }
    const publishId = body.data?.publish_id ?? "unknown";
    return { ok: true, publishedUrl: "https://www.tiktok.com/", externalId: publishId, data: { publishId } };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── Facebook Page ────────────────────────────────────────────────────────────────
async function publishFacebook(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const token = creds["FACEBOOK_PAGE_ACCESS_TOKEN"] ?? creds["META_ACCESS_TOKEN"];
  const pageId = creds["FACEBOOK_PAGE_ID"] ?? creds["META_PAGE_ID"];
  if (!token) return { ok: false, error: "FACEBOOK_PAGE_ACCESS_TOKEN credential not found. Add it in Connections Hub." };
  if (!pageId) return { ok: false, error: "FACEBOOK_PAGE_ID credential not found. Add it in Connections Hub." };

  try {
    const message = params.content.slice(0, 63206);
    const body: Record<string, string> = { message, access_token: token };
    if (params.imageUrl) body["link"] = params.imageUrl;

    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const resBody = await res.json() as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: `Facebook API ${res.status}: ${JSON.stringify(resBody).slice(0, 200)}` };
    const postId = resBody["id"] as string;
    return { ok: true, publishedUrl: `https://www.facebook.com/${postId}`, externalId: postId, data: { postId, message } };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── Mailchimp ──────────────────────────────────────────────────────────────────
async function publishMailchimp(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const apiKey = creds["MAILCHIMP_API_KEY"];
  if (!apiKey) return { ok: false, error: "MAILCHIMP_API_KEY credential not found. Add it in Connections Hub." };

  const dc = apiKey.split("-").pop() ?? "us1";
  const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;
  const listId = params.listId ?? creds["MAILCHIMP_LIST_ID"];
  if (!listId) return { ok: false, error: "listId parameter or MAILCHIMP_LIST_ID credential required for Mailchimp broadcast." };

  const subject = params.title ?? params.content.slice(0, 100);
  const htmlContent = `<html><body><p>${params.content.replace(/\n/g, "<br/>")}</p></body></html>`;

  try {
    // Create campaign
    const createRes = await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "regular",
        recipients: { list_id: listId },
        settings: { subject_line: subject, from_name: "Your System", reply_to: "noreply@example.com" },
      }),
    });
    const createBody = await createRes.json() as Record<string, unknown>;
    if (!createRes.ok) return { ok: false, error: `Mailchimp create campaign ${createRes.status}: ${JSON.stringify(createBody).slice(0, 200)}` };

    const campaignId = createBody["id"] as string;
    const archiveUrl = (createBody["archive_url"] as string | undefined) ?? "";

    // Set content
    await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns/${campaignId}/content`, {
      method: "PUT",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ html: htmlContent }),
    });

    // Send
    const sendRes = await fetch(`https://${dc}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`, {
      method: "POST",
      headers: { Authorization: authHeader },
    });

    if (sendRes.ok || sendRes.status === 204) {
      return { ok: true, publishedUrl: archiveUrl, externalId: campaignId, data: { campaignId, subject } };
    }
    const sendBody = await sendRes.text();
    return { ok: false, error: `Mailchimp send ${sendRes.status}: ${sendBody.slice(0, 200)}` };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── ConvertKit ─────────────────────────────────────────────────────────────────
async function publishConvertKit(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const apiKey = creds["CONVERTKIT_API_KEY"];
  if (!apiKey) return { ok: false, error: "CONVERTKIT_API_KEY credential not found. Add it in Connections Hub." };

  const subject = params.title ?? params.content.slice(0, 100);

  try {
    // Create broadcast
    const createRes = await fetch("https://api.convertkit.com/v3/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_secret: apiKey,
        subject,
        content: params.content,
        description: subject,
        public: true,
        published_at: new Date().toISOString(),
      }),
    });
    const createBody = await createRes.json() as Record<string, unknown>;
    if (!createRes.ok) return { ok: false, error: `ConvertKit ${createRes.status}: ${JSON.stringify(createBody).slice(0, 200)}` };

    const broadcast = (createBody["broadcast"] as Record<string, unknown>) ?? createBody;
    const broadcastId = broadcast["id"] as string | number;
    const url = (broadcast["url"] as string | undefined) ?? "";

    return { ok: true, publishedUrl: url, externalId: String(broadcastId), data: { broadcastId, subject } };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── WordPress ──────────────────────────────────────────────────────────────────
async function publishWordPress(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const wpUrl = params.siteUrl ?? creds["WORDPRESS_SITE_URL"];
  const wpUser = creds["WORDPRESS_USERNAME"];
  const wpAppPw = creds["WORDPRESS_APP_PASSWORD"];

  if (!wpUrl) return { ok: false, error: "WORDPRESS_SITE_URL credential not found. Add it in Connections Hub." };
  if (!wpUser || !wpAppPw) return { ok: false, error: "WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD credentials required." };

  const ssrfErr = await validateSiteUrl(wpUrl);
  if (ssrfErr) return { ok: false, error: ssrfErr };

  const authHeader = `Basic ${Buffer.from(`${wpUser}:${wpAppPw}`).toString("base64")}`;
  const apiBase = wpUrl.replace(/\/$/, "") + "/wp-json/wp/v2";

  try {
    const res = await fetch(`${apiBase}/posts`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: params.title ?? params.content.slice(0, 80),
        content: params.content,
        status: "publish",
      }),
    });
    const body = await res.json() as Record<string, unknown>;
    if (res.ok) {
      const postId = body["id"] as number;
      const link = body["link"] as string;
      return { ok: true, publishedUrl: link, externalId: String(postId), data: { postId, link } };
    }
    return { ok: false, error: `WordPress API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── Ghost ──────────────────────────────────────────────────────────────────────
async function publishGhost(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const ghostUrl = params.siteUrl ?? creds["GHOST_SITE_URL"];
  const adminKey = creds["GHOST_ADMIN_API_KEY"];

  if (!ghostUrl) return { ok: false, error: "GHOST_SITE_URL credential not found. Add it in Connections Hub." };
  if (!adminKey) return { ok: false, error: "GHOST_ADMIN_API_KEY credential not found. Add it in Connections Hub." };

  const ssrfErr = await validateSiteUrl(ghostUrl);
  if (ssrfErr) return { ok: false, error: ssrfErr };

  // Ghost Admin API Key is in the format id:secret
  const [keyId, keySecret] = adminKey.split(":");
  if (!keyId || !keySecret) return { ok: false, error: "GHOST_ADMIN_API_KEY must be in format id:secret" };

  // Sign a JWT for Ghost Admin API
  const { createHmac } = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: keyId })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })).toString("base64url");
  const signature = createHmac("sha256", Buffer.from(keySecret, "hex"))
    .update(`${header}.${payload}`)
    .digest("base64url");
  const jwt = `${header}.${payload}.${signature}`;

  const apiBase = ghostUrl.replace(/\/$/, "") + "/ghost/api/admin";

  try {
    const res = await fetch(`${apiBase}/posts/`, {
      method: "POST",
      headers: { Authorization: `Ghost ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        posts: [{
          title: params.title ?? params.content.slice(0, 80),
          html: `<p>${params.content.replace(/\n/g, "</p><p>")}</p>`,
          status: "published",
        }],
      }),
    });
    const body = await res.json() as Record<string, unknown>;
    if (res.ok) {
      const post = ((body["posts"] as Record<string, unknown>[] | undefined) ?? [])[0] ?? {};
      const url = post["url"] as string | undefined;
      const postId = post["id"] as string | undefined;
      return { ok: true, publishedUrl: url ?? ghostUrl, externalId: postId, data: { postId, url } };
    }
    return { ok: false, error: `Ghost API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── YouTube ────────────────────────────────────────────────────────────────────
// Updates an existing YouTube video's metadata (title, description, tags, categoryId).
// Requires YOUTUBE_OAUTH_TOKEN (an OAuth 2.0 access token with youtube.force-ssl scope).
// The videoId of the target video must be provided in params.extraParams.videoId or params.videoId.
async function publishYouTube(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const oauthToken = creds["YOUTUBE_OAUTH_TOKEN"] ?? creds["YOUTUBE_ACCESS_TOKEN"];
  if (!oauthToken) {
    return { ok: false, error: "YOUTUBE_OAUTH_TOKEN credential not found. Add your YouTube OAuth 2.0 access token in Connections Hub." };
  }

  const videoId = params.videoId ?? (params.extraParams?.["videoId"] as string | undefined);
  if (!videoId) {
    return { ok: false, error: "videoId is required for YouTube metadata update. Provide it as params.videoId." };
  }

  const title       = (params.title ?? params.content.slice(0, 100)).slice(0, 100);
  const description = params.content.slice(0, 5000);
  const tags        = params.tags ?? [];
  const categoryId  = params.categoryId ?? (params.extraParams?.["categoryId"] as string | undefined) ?? "22"; // 22 = People & Blogs

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${oauthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: videoId,
          snippet: { title, description, tags, categoryId },
        }),
      }
    );
    const body = await res.json() as Record<string, unknown>;
    if (res.ok) {
      const snippet = (body["snippet"] as Record<string, unknown> | undefined) ?? {};
      const channelId = snippet["channelId"] as string | undefined;
      const publishedUrl = channelId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      return {
        ok: true,
        publishedUrl,
        externalId: videoId,
        data: { videoId, title, description, channelId },
      };
    }
    const errBody = (body["error"] as Record<string, unknown> | undefined) ?? body;
    return { ok: false, error: `YouTube API ${res.status}: ${JSON.stringify(errBody).slice(0, 300)}` };
  } catch (err: unknown) {
    return { ok: false, error: String(err) };
  }
}

// ── Main dispatcher ────────────────────────────────────────────────────────────

export const PUBLISHING_CHANNELS: Record<string, {
  displayName: string;
  icon: string;
  credentialKeys: string[];
  contentTypes: string[];
}> = {
  twitter:    { displayName: "X (Twitter)",  icon: "𝕏",  credentialKeys: ["TWITTER_BEARER_TOKEN"],    contentTypes: ["tweet"] },
  instagram:  { displayName: "Instagram",    icon: "📸", credentialKeys: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_USER_ID"], contentTypes: ["post"] },
  linkedin:   { displayName: "LinkedIn",     icon: "in", credentialKeys: ["LINKEDIN_ACCESS_TOKEN"],    contentTypes: ["post"] },
  tiktok:     { displayName: "TikTok",       icon: "🎵", credentialKeys: ["TIKTOK_ACCESS_TOKEN"],      contentTypes: ["video"] },
  facebook:   { displayName: "Facebook",     icon: "📘", credentialKeys: ["FACEBOOK_PAGE_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"], contentTypes: ["post"] },
  mailchimp:  { displayName: "Mailchimp",    icon: "🐒", credentialKeys: ["MAILCHIMP_API_KEY"],        contentTypes: ["email"] },
  convertkit: { displayName: "ConvertKit",   icon: "✉",  credentialKeys: ["CONVERTKIT_API_KEY"],      contentTypes: ["email"] },
  wordpress:  { displayName: "WordPress",    icon: "🌐", credentialKeys: ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"], contentTypes: ["blog_post"] },
  ghost:      { displayName: "Ghost",        icon: "👻", credentialKeys: ["GHOST_SITE_URL", "GHOST_ADMIN_API_KEY"], contentTypes: ["blog_post"] },
  youtube:    { displayName: "YouTube",      icon: "▶",  credentialKeys: ["YOUTUBE_OAUTH_TOKEN"],     contentTypes: ["video_metadata"] },
};

export async function publish(
  channel: string,
  creds: Record<string, string>,
  params: PublishParams,
): Promise<PublishResult> {
  switch (channel) {
    case "twitter":    return publishTwitter(creds, params);
    case "instagram":  return publishInstagram(creds, params);
    case "linkedin":   return publishLinkedIn(creds, params);
    case "tiktok":     return publishTikTok(creds, params);
    case "facebook":   return publishFacebook(creds, params);
    case "mailchimp":  return publishMailchimp(creds, params);
    case "convertkit": return publishConvertKit(creds, params);
    case "wordpress":  return publishWordPress(creds, params);
    case "ghost":      return publishGhost(creds, params);
    case "youtube":    return publishYouTube(creds, params);
    default:           return { ok: false, error: `Unknown channel: ${channel}. Supported: ${Object.keys(PUBLISHING_CHANNELS).join(", ")}` };
  }
}
