import { RevenueProvider, FetchResult, RevenueTransaction } from "./types";

interface ClickBankOrder {
  receipt: string;
  amount: number;
  currency?: string;
  orderTime?: string;
  upsellAmount?: number;
}

interface ClickBankOrdersResponse {
  orders?: ClickBankOrder[];
  orderData?: ClickBankOrder[];
}

function clickbankHeaders(apiKey: string, clerkKey: string): Record<string, string> {
  return {
    Accept: "application/json",
    // ClickBank REST auth: clerk key as Authorization, API/dev key as X-CB-DevKey
    Authorization: clerkKey,
    "X-CB-DevKey": apiKey,
    "API-Version": "1.3",
  };
}

export class ClickBankProvider implements RevenueProvider {
  readonly id = "clickbank" as const;
  readonly displayName = "ClickBank";
  readonly credentialKeys = ["clickbank_api_key", "clickbank_clerk_key"];

  async testCredentials(creds: Record<string, string>): Promise<{ ok: boolean; message: string }> {
    const apiKey = creds["clickbank_api_key"];
    const clerkKey = creds["clickbank_clerk_key"];
    if (!apiKey || !clerkKey) {
      return { ok: false, message: "Missing clickbank_api_key or clickbank_clerk_key" };
    }
    try {
      const res = await fetch(
        `https://api.clickbank.com/rest/1.3/orders/list?pageSize=1`,
        { headers: clickbankHeaders(apiKey, clerkKey) },
      );
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "ClickBank credentials rejected — check your API and Clerk keys" };
      }
      if (!res.ok && res.status !== 404) {
        return { ok: false, message: `ClickBank API error: HTTP ${res.status}` };
      }
      return { ok: true, message: "ClickBank connected successfully" };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTransactions(creds: Record<string, string>, since?: Date): Promise<FetchResult> {
    const apiKey = creds["clickbank_api_key"];
    const clerkKey = creds["clickbank_clerk_key"];
    if (!apiKey || !clerkKey) {
      return { ok: false, transactions: [], error: "Missing clickbank_api_key or clickbank_clerk_key" };
    }

    const transactions: RevenueTransaction[] = [];

    try {
      const startDate = since ?? new Date(Date.now() - 30 * 86_400_000);
      const startStr = startDate.toISOString().split("T")[0];

      const url = new URL("https://api.clickbank.com/rest/1.3/orders/list");
      url.searchParams.set("startDate", startStr);
      url.searchParams.set("type", "SALE");
      url.searchParams.set("pageSize", "100");

      const res = await fetch(url.toString(), {
        headers: clickbankHeaders(apiKey, clerkKey),
      });

      if (!res.ok) {
        return { ok: false, transactions, error: `ClickBank API error: HTTP ${res.status}` };
      }

      const data = (await res.json()) as ClickBankOrdersResponse;
      const orders = data.orders ?? data.orderData ?? [];

      for (const order of orders) {
        const amountCents = Math.round((order.amount ?? 0) * 100);
        if (amountCents <= 0) continue;

        transactions.push({
          externalId: `clickbank_${order.receipt}`,
          amountCents,
          currency: (order.currency ?? "USD").toLowerCase(),
          description: `ClickBank sale ${order.receipt}`,
          occurredAt: order.orderTime ? new Date(order.orderTime) : new Date(),
        });
      }

      return { ok: true, transactions };
    } catch (err) {
      return { ok: false, transactions, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
