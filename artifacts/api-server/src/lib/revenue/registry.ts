import { RevenueProvider } from "./types";
import { StripeRevenueProvider } from "./stripe-provider";
import { GumroadProvider } from "./gumroad-provider";
import { PayPalProvider } from "./paypal-provider";
import { ClickBankProvider } from "./clickbank-provider";

const PROVIDERS: Record<string, RevenueProvider> = {
  stripe: new StripeRevenueProvider(),
  gumroad: new GumroadProvider(),
  paypal: new PayPalProvider(),
  clickbank: new ClickBankProvider(),
};

export function getRevenueProvider(id: string): RevenueProvider | null {
  return PROVIDERS[id] ?? null;
}

export function listRevenueProviders(): { id: string; displayName: string; credentialKeys: string[] }[] {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    displayName: p.displayName,
    credentialKeys: p.credentialKeys,
  }));
}
