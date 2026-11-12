// Startup configuration check. In production a missing required variable
// stops the server before it accepts traffic; elsewhere it only warns.
const REQUIRED: Array<{ name: string; valid?: (v: string) => boolean; hint: string }> = [
  { name: "DATABASE_URL", hint: "Postgres connection string" },
  { name: "SESSION_SECRET", valid: (v) => v.length >= 32, hint: "at least 32 characters (signs login tokens)" },
  { name: "CREDENTIAL_ENCRYPTION_KEY", valid: (v) => /^[0-9a-fA-F]{64}$/.test(v), hint: "64 hex characters (encrypts stored credentials)" },
  { name: "OPENROUTER_API_KEY", hint: "all AI features route through OpenRouter" },
];

const RECOMMENDED: Array<{ name: string; hint: string }> = [
  { name: "STRIPE_SECRET_KEY", hint: "payments and subscriptions" },
  { name: "STRIPE_WEBHOOK_SECRET", hint: "verifies Stripe webhooks" },
  { name: "RESEND_API_KEY", hint: "transactional email" },
  { name: "APP_URL", hint: "public base URL for links and media (e.g. https://starksglobalgroup.net)" },
];

export interface EnvReport {
  errors: string[];
  warnings: string[];
}

export function checkEnv(env: NodeJS.ProcessEnv = process.env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const { name, valid, hint } of REQUIRED) {
    const v = env[name];
    if (!v) errors.push(`${name} is not set (${hint})`);
    else if (valid && !valid(v)) errors.push(`${name} is invalid: ${hint}`);
  }
  for (const { name, hint } of RECOMMENDED) {
    if (!env[name]) warnings.push(`${name} is not set (${hint})`);
  }
  return { errors, warnings };
}
