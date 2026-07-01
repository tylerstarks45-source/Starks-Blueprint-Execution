import { randomBytes, createHash } from "crypto";
import jwt from "jsonwebtoken";
import type { SocialPlatform } from "@workspace/db";

if (!process.env["SESSION_SECRET"]) {
  throw new Error("SESSION_SECRET environment variable must be set.");
}
const JWT_SECRET = process.env["SESSION_SECRET"];

export interface OAuthPlatformConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  usesPkce: boolean;
  // Credential key(s) the resulting access token is stored under, reusing the
  // exact keys the platform's connector already reads via `this.creds[...]`
  // so no connector code changes are needed once OAuth is wired up.
  credentialKey: string;
}

// OAuth 2.0 configs for the four social platforms required by the content
// calendar. Client ID/secret are supplied per-platform via Replit secrets —
// each is a developer app registered on that platform's developer portal.
export const SOCIAL_OAUTH_CONFIGS: Partial<Record<SocialPlatform, OAuthPlatformConfig>> = {
  twitter: {
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
    clientIdEnv: "TWITTER_CLIENT_ID",
    clientSecretEnv: "TWITTER_CLIENT_SECRET",
    usesPkce: true,
    credentialKey: "TWITTER_BEARER_TOKEN",
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "openid profile email w_member_social",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    usesPkce: false,
    credentialKey: "LINKEDIN_ACCESS_TOKEN",
  },
  facebook: {
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish",
    clientIdEnv: "META_CLIENT_ID",
    clientSecretEnv: "META_CLIENT_SECRET",
    usesPkce: false,
    credentialKey: "META_ACCESS_TOKEN",
  },
  instagram: {
    // Instagram Business publishing rides on the same Meta Graph API app/token as Facebook.
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish",
    clientIdEnv: "META_CLIENT_ID",
    clientSecretEnv: "META_CLIENT_SECRET",
    usesPkce: false,
    credentialKey: "META_ACCESS_TOKEN",
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token",
    scope: "user.info.basic,video.publish,video.upload",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
    usesPkce: true,
    credentialKey: "TIKTOK_ACCESS_TOKEN",
  },
};

export function isOAuthConfigured(platform: SocialPlatform): boolean {
  const cfg = SOCIAL_OAUTH_CONFIGS[platform];
  if (!cfg) return false;
  return !!process.env[cfg.clientIdEnv];
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

interface OAuthStatePayload {
  userId: number;
  platform: SocialPlatform;
  codeVerifier?: string;
  redirectUri: string;
}

// Short-lived (10 min) signed state token — carries the PKCE verifier and
// target user across the redirect to the provider and back, since we have
// no server-side session store to stash it in.
export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  return jwt.verify(token, JWT_SECRET) as unknown as OAuthStatePayload;
}

export function buildAuthorizeUrl(
  platform: SocialPlatform,
  cfg: OAuthPlatformConfig,
  redirectUri: string,
  state: string,
  pkceChallenge?: string,
): string {
  const clientId = process.env[cfg.clientIdEnv];
  if (!clientId) {
    throw new Error(`${cfg.clientIdEnv} is not configured — cannot start ${platform} OAuth flow.`);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: cfg.scope,
    response_type: "code",
    state,
  });
  if (platform === "tiktok") {
    // TikTok uses `client_key` instead of `client_id`.
    params.delete("client_id");
    params.set("client_key", clientId);
  }
  if (cfg.usesPkce && pkceChallenge) {
    params.set("code_challenge", pkceChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  expiresInSeconds?: number;
  extra?: Record<string, unknown>;
}

export async function exchangeCodeForToken(
  platform: SocialPlatform,
  cfg: OAuthPlatformConfig,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<TokenExchangeResult> {
  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId) {
    throw new Error(`${cfg.clientIdEnv} is not configured.`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  if (platform === "tiktok") {
    body.set("client_key", clientId);
    if (clientSecret) body.set("client_secret", clientSecret);
  } else {
    body.set("client_id", clientId);
    if (clientSecret) body.set("client_secret", clientSecret);
  }
  if (cfg.usesPkce && codeVerifier) body.set("code_verifier", codeVerifier);

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (data["error_description"] as string) ?? (data["error"] as string) ?? `${platform} token exchange failed (${res.status})`;
    throw new Error(message);
  }

  const accessToken = (data["access_token"] as string) ?? "";
  if (!accessToken) throw new Error(`${platform} token response did not include an access_token`);

  return {
    accessToken,
    expiresInSeconds: typeof data["expires_in"] === "number" ? (data["expires_in"] as number) : undefined,
    extra: data,
  };
}

// Meta's user access token can't post to a Page directly — look up the
// user's first managed Page (and its Page access token) via the Graph API.
export async function fetchMetaPageCredentials(userAccessToken: string): Promise<{ pageId: string; pageAccessToken: string } | null> {
  const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: Array<{ id?: string; access_token?: string }> };
  const first = data.data?.[0];
  if (!first?.id || !first.access_token) return null;
  return { pageId: first.id, pageAccessToken: first.access_token };
}
