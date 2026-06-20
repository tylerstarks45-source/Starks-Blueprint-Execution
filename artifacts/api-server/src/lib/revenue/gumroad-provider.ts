import { RevenueProvider, FetchResult, RevenueTransaction } from "./types";

interface GumroadSale {
  id: string;
  price: number;
  currency_symbol: string;
  created_at: string;
  product_name?: string;
  full_name?: string;
  email?: string;
}

export class GumroadProvider implements RevenueProvider {
  readonly id = "gumroad" as const;
  readonly displayName = "Gumroad";
  readonly credentialKeys = ["gumroad_access_token"];

  async testCredentials(creds: Record<string, string>): Promise<{ ok: boolean; message: string }> {
    const token = creds["gumroad_access_token"];
    if (!token) return { ok: false, message: "Missing gumroad_access_token credential" };
    try {
      const res = await fetch("https://api.gumroad.com/v2/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { ok: false, message: `Gumroad API error: HTTP ${res.status}` };
      const data = (await res.json()) as { success: boolean; user?: { name: string } };
      if (!data.success) return { ok: false, message: "Gumroad authentication failed" };
      return { ok: true, message: `Connected as ${data.user?.name ?? "unknown"}` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTransactions(creds: Record<string, string>, since?: Date): Promise<FetchResult> {
    const token = creds["gumroad_access_token"];
    if (!token) return { ok: false, transactions: [], error: "Missing gumroad_access_token" };

    const transactions: RevenueTransaction[] = [];
    let page = 1;
    const maxPages = 10;

    try {
      while (page <= maxPages) {
        const url = new URL("https://api.gumroad.com/v2/sales");
        url.searchParams.set("page", String(page));
        if (since) {
          url.searchParams.set("after", since.toISOString().slice(0, 10));
        }

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return { ok: false, transactions, error: `Gumroad API error: HTTP ${res.status}` };

        const data = (await res.json()) as { success: boolean; sales?: GumroadSale[]; next_page_url?: string };
        if (!data.success) return { ok: false, transactions, error: "Gumroad API returned success=false" };

        const sales = data.sales ?? [];
        for (const sale of sales) {
          const occurredAt = new Date(sale.created_at);
          if (since && occurredAt <= since) continue;
          transactions.push({
            externalId: `gumroad_${sale.id}`,
            amountCents: Math.round(sale.price * 100),
            currency: "usd",
            description: sale.product_name
              ? `Gumroad sale: ${sale.product_name}`
              : `Gumroad sale from ${sale.full_name ?? sale.email ?? "customer"}`,
            occurredAt,
          });
        }

        if (!data.next_page_url || sales.length === 0) break;
        page++;
      }

      return { ok: true, transactions };
    } catch (err) {
      return { ok: false, transactions, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
