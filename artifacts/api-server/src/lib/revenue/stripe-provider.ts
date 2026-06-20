import Stripe from "stripe";
import { RevenueProvider, FetchResult, RevenueTransaction } from "./types";

export class StripeRevenueProvider implements RevenueProvider {
  readonly id = "stripe" as const;
  readonly displayName = "Stripe";
  readonly credentialKeys = ["stripe_secret_key"];

  private getClient(creds: Record<string, string>): Stripe | null {
    const key = creds["stripe_secret_key"];
    if (!key) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (Stripe as any)(key, { apiVersion: "2023-10-16" }) as Stripe;
  }

  async testCredentials(creds: Record<string, string>): Promise<{ ok: boolean; message: string }> {
    const stripe = this.getClient(creds);
    if (!stripe) return { ok: false, message: "Missing stripe_secret_key credential" };
    try {
      const balance = await stripe.balance.retrieve();
      const available = balance.available.reduce((s, a) => s + a.amount, 0) / 100;
      return { ok: true, message: `Stripe connected — $${available.toFixed(2)} available` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTransactions(creds: Record<string, string>, since?: Date): Promise<FetchResult> {
    const stripe = this.getClient(creds);
    if (!stripe) return { ok: false, transactions: [], error: "Missing stripe_secret_key credential" };

    const transactions: RevenueTransaction[] = [];
    try {
      let hasMore = true;
      let startingAfter: string | undefined;
      const sinceTs = since ? Math.floor(since.getTime() / 1000) : undefined;
      let pageCount = 0;
      const maxPages = 20;

      while (hasMore && pageCount < maxPages) {
        const params: Stripe.BalanceTransactionListParams = {
          limit: 100,
          type: "charge",
          ...(sinceTs ? { created: { gte: sinceTs } } : {}),
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        };

        const list = await stripe.balanceTransactions.list(params);

        for (const tx of list.data) {
          if (tx.status !== "available" && tx.status !== "pending") continue;
          if (tx.amount <= 0) continue;
          transactions.push({
            externalId: `stripe_${tx.id}`,
            amountCents: tx.amount,
            currency: tx.currency,
            description: tx.description ?? `Stripe payment ${tx.id}`,
            occurredAt: new Date(tx.created * 1000),
          });
        }

        hasMore = list.has_more;
        if (list.data.length > 0) {
          startingAfter = list.data[list.data.length - 1]!.id;
        }
        pageCount++;
      }

      return { ok: true, transactions };
    } catch (err) {
      return { ok: false, transactions, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
