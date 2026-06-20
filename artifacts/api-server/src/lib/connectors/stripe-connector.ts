import { BaseConnector, TestResult, ExecResult } from "./base";
import { getUncachableStripeClient } from "../stripe";

export class StripeConnector extends BaseConnector {
  readonly id = "stripe";
  readonly displayName = "Stripe Payments";
  readonly category = "payments";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = [];
  readonly actions = ["getBalance", "listPayments", "createCheckout", "createPaymentLink", "getSubscriptions"];

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

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    if (action === "getBalance") {
      try {
        const stripe = await getUncachableStripeClient();
        const balance = await stripe.balance.retrieve();
        const available = balance.available.reduce((s, a) => s + a.amount, 0) / 100;
        return {
          ok: true,
          data: {
            message: `Stripe balance: $${available.toFixed(2)} ${balance.available[0]?.currency?.toUpperCase() ?? "USD"}`,
            availableUsd: available,
            currency: balance.available[0]?.currency ?? "usd",
          },
        };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "listPayments") {
      try {
        const stripe = await getUncachableStripeClient();
        const limit = Math.min(Number(params["limit"] ?? 20), 100);
        const charges = await stripe.charges.list({ limit });
        const payments = charges.data.map(c => ({
          id: c.id,
          amount: (c.amount / 100).toFixed(2),
          currency: c.currency.toUpperCase(),
          status: c.status,
          description: c.description ?? "",
          created: new Date(c.created * 1000).toISOString(),
        }));
        return {
          ok: true,
          data: {
            message: `Retrieved ${payments.length} recent payments`,
            count: payments.length,
            payments,
          },
        };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "createCheckout" || action === "createPaymentLink") {
      try {
        const stripe = await getUncachableStripeClient();
        const productName = (params["productName"] as string | undefined) ?? "SBEP Product";
        const amountCents = Math.round(Number(params["amountCents"] ?? params["amount"] ?? 1000));
        const currency = ((params["currency"] as string | undefined) ?? "usd").toLowerCase();
        const successUrl = (params["successUrl"] as string | undefined) ?? "https://starksglobalgroup.net/dashboard";
        const cancelUrl = (params["cancelUrl"] as string | undefined) ?? "https://starksglobalgroup.net";

        if (amountCents < 50) {
          return { ok: false, error: "Minimum charge amount is 50 cents" };
        }

        // Create an inline price on a new product
        const product = await stripe.products.create({ name: productName });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: amountCents,
          currency,
        });

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{ price: price.id, quantity: 1 }],
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
        });

        return {
          ok: true,
          data: {
            message: `Checkout session created for ${productName} — $${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
            sessionId: session.id,
            checkoutUrl: session.url,
            productName,
            amountUsd: (amountCents / 100).toFixed(2),
            currency: currency.toUpperCase(),
          },
        };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "getSubscriptions") {
      try {
        const stripe = await getUncachableStripeClient();
        const limit = Math.min(Number(params["limit"] ?? 20), 100);
        const subs = await stripe.subscriptions.list({ limit, status: "all" });
        const subscriptions = subs.data.map(s => {
          const raw = s as unknown as Record<string, unknown>;
          return {
            id: s.id,
            status: s.status,
            currentPeriodEnd: typeof raw["current_period_end"] === "number"
              ? new Date((raw["current_period_end"] as number) * 1000).toISOString()
              : null,
            cancelAtPeriodEnd: typeof raw["cancel_at_period_end"] === "boolean"
              ? raw["cancel_at_period_end"]
              : false,
          };
        });
        const active = subscriptions.filter(s => s.status === "active").length;
        return {
          ok: true,
          data: {
            message: `Retrieved ${subscriptions.length} subscriptions (${active} active)`,
            count: subscriptions.length,
            activeCount: active,
            subscriptions,
          },
        };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: getBalance, listPayments, createCheckout, createPaymentLink, getSubscriptions` };
  }
}
