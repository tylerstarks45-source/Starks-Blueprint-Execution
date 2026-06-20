export interface RevenueTransaction {
  externalId: string;
  amountCents: number;
  currency: string;
  description: string;
  occurredAt: Date;
}

export interface FetchResult {
  ok: boolean;
  transactions: RevenueTransaction[];
  error?: string;
}

export interface RevenueProvider {
  readonly id: "stripe" | "gumroad" | "paypal";
  readonly displayName: string;
  readonly credentialKeys: string[];
  fetchTransactions(creds: Record<string, string>, since?: Date): Promise<FetchResult>;
  testCredentials(creds: Record<string, string>): Promise<{ ok: boolean; message: string }>;
}
