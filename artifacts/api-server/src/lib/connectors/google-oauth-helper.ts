// Shared OAuth2 refresh-token exchange for Google API connectors (Gmail, YouTube).
// These connectors use a "bring your own OAuth app" model: the user creates an
// OAuth 2.0 Client ID in Google Cloud Console, completes the consent flow once
// (e.g. via OAuth Playground) to obtain a long-lived refresh token, then pastes
// {PREFIX}_CLIENT_ID / {PREFIX}_CLIENT_SECRET / {PREFIX}_REFRESH_TOKEN into
// Connections Hub. Every call exchanges the refresh token for a fresh
// short-lived access token — no access token is ever persisted, so there is
// nothing to go stale between calls.
export async function getGoogleAccessToken(
  creds: Record<string, string>,
  prefix: "GMAIL" | "YOUTUBE",
): Promise<string> {
  const clientId = creds[`${prefix}_CLIENT_ID`];
  const clientSecret = creds[`${prefix}_CLIENT_SECRET`];
  const refreshToken = creds[`${prefix}_REFRESH_TOKEN`];

  if (!refreshToken) {
    throw new Error(`${prefix}_REFRESH_TOKEN is required. Complete the Google OAuth consent flow once to obtain one.`);
  }
  if (!clientId || !clientSecret) {
    throw new Error(`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET are required (create an OAuth 2.0 Client in Google Cloud Console).`);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (data["error_description"] as string) ?? (data["error"] as string) ?? `Google token refresh failed (${res.status})`;
    throw new Error(message);
  }

  const accessToken = data["access_token"] as string | undefined;
  if (!accessToken) throw new Error("Google token refresh response did not include an access_token");
  return accessToken;
}
