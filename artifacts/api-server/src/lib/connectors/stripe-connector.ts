import { BaseConnector, TestResult, ExecResult } from "./base";
import { getUncachableStripeClient } from "../stripe";
import Stripe from "stripe";

export class StripeConnector extends BaseConnector {
  readonly id = "stripe";
  readonly displayName = "Stripe Payments";
  readonly category = "payments";
  readonly authType = "api_key" as const;
  // requiredCredentials is empty: per-user STRIPE_SECRET_KEY is used when present;
  // otherwise falls back to the platform Stripe client.
  readonly requiredCredentials = [] as string[];
  readonly actions = ["getBalance", "listPayments", "createCheckout", "createPaymentLink", "getSubscriptions", "createProduct", "createPrice"];

  private async getClient(): Promise<Stripe> {
    const userKey = this.creds["STRIPE_SECRET_KEY"];
    if (userKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (Stripe as any)(userKey) as Stripe;
    }
    return getUncachableStripeClient();
  }

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      const stripe = await this.getClient();
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
        const stripe = await this.getClient();
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
        const stripe = await this.getClient();
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
        const stripe = await this.getClient();
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
        const stripe = await this.getClient();
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

    if (action === "createProduct") {
      try {
        const stripe = await this.getClient();
        const name = (params["name"] as string) ?? "New Product";
        const description = params["description"] as string | undefined;
        const images = Array.isArray(params["images"]) ? params["images"] as string[] : undefined;
        const product = await stripe.products.create({
          name,
          ...(description ? { description } : {}),
          ...(images ? { images } : {}),
        });
        return { ok: true, data: { id: product.id, name: product.name, active: product.active, url: `https://dashboard.stripe.com/products/${product.id}`, message: `Stripe product "${product.name}" created (ID: ${product.id})` } };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    if (action === "createPrice") {
      try {
        const stripe = await this.getClient();
        const productId = params["productId"] as string | undefined;
        const productName = params["productName"] as string | undefined;
        if (!productId && !productName) return { ok: false, error: "productId or productName required" };
        const amountCents = Math.round(Number(params["amountCents"] ?? params["amount"] ?? 1000));
        const currency = ((params["currency"] as string | undefined) ?? "usd").toLowerCase();
        const recurring = params["recurring"] as { interval?: string; interval_count?: number } | undefined;

        let resolvedProductId = productId;
        if (!resolvedProductId && productName) {
          const product = await stripe.products.create({ name: productName });
          resolvedProductId = product.id;
        }

        const priceData: Stripe.PriceCreateParams = {
          product: resolvedProductId!,
          unit_amount: amountCents,
          currency,
          ...(recurring ? { recurring: { interval: (recurring.interval ?? "month") as Stripe.PriceCreateParams.Recurring["interval"] } } : {}),
        };
        const price = await stripe.prices.create(priceData);
        return { ok: true, data: { id: price.id, productId: resolvedProductId, amountCents, currency: currency.toUpperCase(), recurring: !!recurring, url: `https://dashboard.stripe.com/prices/${price.id}`, message: `Stripe price $${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}${recurring ? "/mo" : ""} created (ID: ${price.id})` } };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: getBalance, listPayments, createCheckout, createPaymentLink, getSubscriptions, createProduct, createPrice` };
  }
}
