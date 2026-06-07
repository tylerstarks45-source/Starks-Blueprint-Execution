// Stripe client — prefers direct env-var keys (sk_live_* / sk_test_*) when set.
// Falls back to the Replit Connector, which routes to "development" (test) keys
// in the Replit IDE and "production" (live) keys only when REPLIT_DEPLOYMENT=1.
//
// IMPORTANT: Never cache this client — short-lived Replit identity tokens expire.
import Stripe from "stripe";

async function getCredentialsFromConnector(): Promise<{ secretKey: string; publishableKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Stripe connector environment variables not available");
  }

  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", connectorName);
  url.searchParams.set("environment", targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken,
    },
  });

  const data = await response.json() as any;
  const settings = data.items?.[0]?.settings;

  if (!settings?.publishable || !settings?.secret) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    secretKey: settings.secret as string,
    publishableKey: settings.publishable as string,
  };
}

async function getCredentials(): Promise<{ secretKey: string; publishableKey: string }> {
  // Prefer explicitly-set env vars (supports both STRIPE_PUBLISHABLE_KEY and
  // the legacy lowercase stripe_publishable_key secret name).
  const envSecretKey     = process.env.STRIPE_SECRET_KEY;
  const envPublishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.stripe_publishable_key;

  if (envSecretKey && envPublishableKey) {
    return { secretKey: envSecretKey, publishableKey: envPublishableKey };
  }

  // Fall back to the Replit Connector.
  return getCredentialsFromConnector();
}

// WARNING: Never cache this client — tokens expire
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: "2026-05-27.dahlia" });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}
