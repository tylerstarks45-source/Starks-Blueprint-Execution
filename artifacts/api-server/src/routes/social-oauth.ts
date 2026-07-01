import { Router, type IRouter } from "express";
import { db, userCredentialsTable, SOCIAL_PLATFORMS, type SocialPlatform } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUserId } from "../lib/auth";
import { encrypt } from "../lib/crypto";
import { getBaseUrl } from "../lib/sendgrid";
import {
  SOCIAL_OAUTH_CONFIGS,
  isOAuthConfigured,
  generatePkce,
  signOAuthState,
  verifyOAuthState,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchMetaPageCredentials,
} from "../lib/social-oauth";

const router: IRouter = Router();

// The authorize route is a top-level browser navigation, not a fetch call,
// so the caller's JWT can't ride in an Authorization header — it's passed
// via `?token=` instead and verified the same way getUserId() would.
function resolveUserId(req: Parameters<typeof getUserId>[0] & { query: Record<string, unknown> }): number | null {
  const tokenParam = req.query["token"];
  if (typeof tokenParam === "string" && tokenParam) {
    return getUserId({ headers: { authorization: `Bearer ${tokenParam}` } } as Parameters<typeof getUserId>[0]);
  }
  return getUserId(req);
}

function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

function redirectUriFor(platform: string): string {
  return `${getBaseUrl()}/api/social/oauth/${platform}/callback`;
}

async function upsertCredential(userId: number, credentialKey: string, plaintext: string): Promise<void> {
  const [existing] = await db
    .select({ id: userCredentialsTable.id })
    .from(userCredentialsTable)
    .where(and(eq(userCredentialsTable.userId, userId), eq(userCredentialsTable.credentialKey, credentialKey)));

  const encryptedValue = encrypt(plaintext);
  if (existing) {
    await db.update(userCredentialsTable)
      .set({ encryptedValue, status: "connected", connectedAt: new Date(), updatedAt: new Date() })
      .where(eq(userCredentialsTable.id, existing.id));
  } else {
    await db.insert(userCredentialsTable).values({
      userId,
      credentialKey,
      encryptedValue,
      status: "connected",
      connectedAt: new Date(),
    });
  }
}

// ─── GET /api/social/oauth/:platform/authorize ────────────────────────────────
// Kicks off the OAuth 2.0 flow for a social platform. Since this is a top-level
// browser navigation (not a fetch call), the caller's JWT is passed as a query
// param rather than an Authorization header; it's verified the same way.

router.get("/social/oauth/:platform/authorize", async (req, res): Promise<void> => {
  const platform = req.params.platform;
  if (!isSocialPlatform(platform)) {
    res.status(400).json({ error: `Unknown platform: ${platform}` });
    return;
  }
  const cfg = SOCIAL_OAUTH_CONFIGS[platform];
  if (!cfg) {
    res.status(400).json({ error: `${platform} does not support OAuth connection.` });
    return;
  }
  if (!isOAuthConfigured(platform)) {
    res.status(501).json({
      error: `${platform} OAuth is not configured on this platform yet. An admin needs to add ${cfg.clientIdEnv} and ${cfg.clientSecretEnv} to Secrets (from a developer app registered on ${platform}).`,
    });
    return;
  }

  const userId = resolveUserId(req);
  if (userId === null) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const redirectUri = redirectUriFor(platform);
  const { verifier, challenge } = cfg.usesPkce ? generatePkce() : { verifier: undefined, challenge: undefined };
  const state = signOAuthState({ userId, platform, codeVerifier: verifier, redirectUri });

  try {
    const url = buildAuthorizeUrl(platform, cfg, redirectUri, state, challenge);
    res.redirect(url);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /api/social/oauth/:platform/callback ─────────────────────────────────
// Public redirect target from the provider. Validates the signed state (issued
// by the /authorize route above), exchanges the code for an access token, and
// stores it in the user credential vault under the key the platform's
// connector already expects (e.g. LINKEDIN_ACCESS_TOKEN).

router.get("/social/oauth/:platform/callback", async (req, res): Promise<void> => {
  const platform = req.params.platform;
  const webBase = getBaseUrl();
  const failRedirect = (message: string) =>
    res.redirect(`${webBase}/connections?oauth=error&platform=${encodeURIComponent(platform)}&message=${encodeURIComponent(message)}`);

  if (!isSocialPlatform(platform)) {
    failRedirect(`Unknown platform: ${platform}`);
    return;
  }
  const cfg = SOCIAL_OAUTH_CONFIGS[platform];
  if (!cfg) {
    failRedirect(`${platform} does not support OAuth connection.`);
    return;
  }

  const providerError = req.query["error_description"] ?? req.query["error"];
  if (typeof providerError === "string" && providerError) {
    failRedirect(providerError);
    return;
  }

  const code = req.query["code"];
  const state = req.query["state"];
  if (typeof code !== "string" || typeof state !== "string") {
    failRedirect("Missing authorization code or state from provider.");
    return;
  }

  let statePayload: ReturnType<typeof verifyOAuthState>;
  try {
    statePayload = verifyOAuthState(state);
  } catch {
    failRedirect("OAuth session expired or invalid — please try connecting again.");
    return;
  }
  if (statePayload.platform !== platform) {
    failRedirect("OAuth state platform mismatch.");
    return;
  }

  try {
    const result = await exchangeCodeForToken(platform, cfg, code, statePayload.redirectUri, statePayload.codeVerifier);

    if (platform === "facebook" || platform === "instagram") {
      const page = await fetchMetaPageCredentials(result.accessToken);
      if (!page) {
        failRedirect("Connected, but no Facebook Page was found on this account. Create/admin a Page first, then reconnect.");
        return;
      }
      await Promise.all([
        upsertCredential(statePayload.userId, "META_ACCESS_TOKEN", page.pageAccessToken),
        upsertCredential(statePayload.userId, "META_PAGE_ID", page.pageId),
      ]);
    } else {
      await upsertCredential(statePayload.userId, cfg.credentialKey, result.accessToken);
    }

    res.redirect(`${webBase}/connections?oauth=success&platform=${encodeURIComponent(platform)}`);
  } catch (err: unknown) {
    failRedirect(err instanceof Error ? err.message : String(err));
  }
});

export default router;
