/**
 * Autonomous Publishing Engine
 * Dispatches publish_content actions to the correct channel adapter.
 * Channels: twitter, instagram, mailchimp, convertkit, wordpress, ghost, email
 */

export interface PublishParams {
  channel: string;
  contentType: string;
  title?: string;
  content: string;
  imageUrl?: string;
  listId?: string;
  siteUrl?: string;
  extraParams?: Record<string, unknown>;
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
async function publishInstagram(creds: Record<string, string>, params: PublishParams): Promise<PublishResult> {
  const token = creds["INSTAGRAM_ACCESS_TOKEN"] ?? creds["META_ACCESS_TOKEN"];
  const igUserId = creds["INSTAGRAM_USER_ID"] ?? creds["IG_USER_ID"];
  if (!token) return { ok: false, error: "INSTAGRAM_ACCESS_TOKEN credential not found. Add it in Connections Hub." };
  if (!igUserId) return { ok: false, error: "INSTAGRAM_USER_ID credential not found. Add your Instagram User ID in Connections Hub." };

  try {
    const caption = params.content.slice(0, 2200);

    // Step 1: Create media container
    const containerBody: Record<string, string> = {
      caption,
      access_token: token,
    };
    if (params.imageUrl) {
      containerBody["image_url"] = params.imageUrl;
      containerBody["media_type"] = "IMAGE";
    } else {
      // Text-only via carousel
      containerBody["media_type"] = "IMAGE";
      containerBody["image_url"] = "https://via.placeholder.com/1080x1080.png?text=Post";
    }

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

// ── Main dispatcher ────────────────────────────────────────────────────────────

export const PUBLISHING_CHANNELS: Record<string, {
  displayName: string;
  icon: string;
  credentialKeys: string[];
  contentTypes: string[];
}> = {
  twitter:    { displayName: "X (Twitter)",  icon: "𝕏",  credentialKeys: ["TWITTER_BEARER_TOKEN"], contentTypes: ["tweet"] },
  instagram:  { displayName: "Instagram",    icon: "📸", credentialKeys: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_USER_ID"], contentTypes: ["post"] },
  mailchimp:  { displayName: "Mailchimp",    icon: "🐒", credentialKeys: ["MAILCHIMP_API_KEY"],     contentTypes: ["email"] },
  convertkit: { displayName: "ConvertKit",   icon: "✉",  credentialKeys: ["CONVERTKIT_API_KEY"],   contentTypes: ["email"] },
  wordpress:  { displayName: "WordPress",    icon: "🌐", credentialKeys: ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"], contentTypes: ["blog_post"] },
  ghost:      { displayName: "Ghost",        icon: "👻", credentialKeys: ["GHOST_SITE_URL", "GHOST_ADMIN_API_KEY"], contentTypes: ["blog_post"] },
};

export async function publish(
  channel: string,
  creds: Record<string, string>,
  params: PublishParams,
): Promise<PublishResult> {
  switch (channel) {
    case "twitter":    return publishTwitter(creds, params);
    case "instagram":  return publishInstagram(creds, params);
    case "mailchimp":  return publishMailchimp(creds, params);
    case "convertkit": return publishConvertKit(creds, params);
    case "wordpress":  return publishWordPress(creds, params);
    case "ghost":      return publishGhost(creds, params);
    default:           return { ok: false, error: `Unknown channel: ${channel}. Supported: ${Object.keys(PUBLISHING_CHANNELS).join(", ")}` };
  }
}
