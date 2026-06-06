import { BaseConnector, TestResult, ExecResult } from "./base";
import { getUncachableStripeClient } from "../stripe";

export class StripeConnector extends BaseConnector {
  readonly id = "stripe";
  readonly displayName = "Stripe Payments";
  readonly category = "payments";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = [];
  readonly actions = ["getBalance", "listPayments", "createCheckout", "getSubscriptions"];

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      const stripe = await getUncachableStripeClient();
      const balance = await stripe.balance.retrieve();
      const latencyMs = Date.now() - start;
      const available = balance.available.reduce((s, a) => s + a.amount, 0) / 100;
      return {
        ok: true,
        latencyMs,
        message: "Stripe connected",
        details: { availableUsd: available, currency: balance.available[0]?.currency ?? "usd" },
      };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, _params: Record<string, unknown>): Promise<ExecResult> {
    if (action === "getBalance") {
      try {
        const stripe = await getUncachableStripeClient();
        const balance = await stripe.balance.retrieve();
        return { ok: true, data: balance };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }
    if (action === "listPayments") {
      try {
        const stripe = await getUncachableStripeClient();
        const charges = await stripe.charges.list({ limit: 20 });
        return { ok: true, data: charges.data };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }
    return { ok: false, error: `Unknown action: ${action}` };
  }
}
