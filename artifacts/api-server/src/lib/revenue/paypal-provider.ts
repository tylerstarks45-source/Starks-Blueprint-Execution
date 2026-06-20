import { RevenueProvider, FetchResult, RevenueTransaction } from "./types";

interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_amount?: { value: string; currency_code: string };
    transaction_initiation_date?: string;
    transaction_subject?: string;
    transaction_note?: string;
    transaction_status?: string;
  };
}

async function getPayPalAccessToken(clientId: string, secret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export class PayPalProvider implements RevenueProvider {
  readonly id = "paypal" as const;
  readonly displayName = "PayPal";
  readonly credentialKeys = ["paypal_client_id", "paypal_client_secret"];

  async testCredentials(creds: Record<string, string>): Promise<{ ok: boolean; message: string }> {
    const clientId = creds["paypal_client_id"];
    const secret = creds["paypal_client_secret"];
    if (!clientId || !secret) {
      return { ok: false, message: "Missing paypal_client_id or paypal_client_secret" };
    }
    try {
      const token = await getPayPalAccessToken(clientId, secret);
      if (!token) return { ok: false, message: "PayPal returned no access token" };
      return { ok: true, message: "PayPal connected successfully" };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTransactions(creds: Record<string, string>, since?: Date): Promise<FetchResult> {
    const clientId = creds["paypal_client_id"];
    const secret = creds["paypal_client_secret"];
    if (!clientId || !secret) {
      return { ok: false, transactions: [], error: "Missing paypal_client_id or paypal_client_secret" };
    }

    const transactions: RevenueTransaction[] = [];

    try {
      const accessToken = await getPayPalAccessToken(clientId, secret);

      const endDate = new Date();
      const startDate = since ?? new Date(Date.now() - 30 * 86_400_000);

      const startStr = startDate.toISOString().replace(".000Z", "-0000");
      const endStr = endDate.toISOString().replace(".000Z", "-0000");

      const url = new URL("https://api-m.paypal.com/v1/reporting/transactions");
      url.searchParams.set("start_date", startStr);
      url.searchParams.set("end_date", endStr);
      url.searchParams.set("fields", "transaction_info");
      url.searchParams.set("page_size", "500");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        return { ok: false, transactions, error: `PayPal API error: HTTP ${res.status}` };
      }

      const data = (await res.json()) as { transaction_details?: PayPalTransaction[] };
      for (const tx of data.transaction_details ?? []) {
        const info = tx.transaction_info;
        if (info.transaction_status !== "S") continue;
        const amountStr = info.transaction_amount?.value ?? "0";
        const amountCents = Math.round(parseFloat(amountStr) * 100);
        if (amountCents <= 0) continue;

        const occurredAt = info.transaction_initiation_date
          ? new Date(info.transaction_initiation_date)
          : new Date();

        transactions.push({
          externalId: `paypal_${info.transaction_id}`,
          amountCents,
          currency: (info.transaction_amount?.currency_code ?? "USD").toLowerCase(),
          description: info.transaction_subject ?? info.transaction_note ?? `PayPal payment ${info.transaction_id}`,
          occurredAt,
        });
      }

      return { ok: true, transactions };
    } catch (err) {
      return { ok: false, transactions, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
