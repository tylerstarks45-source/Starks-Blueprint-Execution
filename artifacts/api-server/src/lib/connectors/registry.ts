import { BaseConnector, ConnectorMeta } from "./base";
import { OpenRouterConnector } from "./openrouter-connector";
import { StripeConnector } from "./stripe-connector";
import { EmailConnector } from "./email-connector";
import {
  GmailStub,
  GoogleSheetsStub,
  TikTokStub,
  MetaStub,
  YouTubeStub,
  ShopifyStub,
  CloudflareStub,
} from "./stubs";

type ConnectorCtor = new (creds: Record<string, string>) => BaseConnector;

const REGISTRY: Record<string, ConnectorCtor> = {
  openrouter: OpenRouterConnector,
  stripe: StripeConnector,
  email: EmailConnector,
  gmail: GmailStub,
  google_sheets: GoogleSheetsStub,
  tiktok: TikTokStub,
  meta: MetaStub,
  youtube: YouTubeStub,
  shopify: ShopifyStub,
  cloudflare: CloudflareStub,
};

export function getConnector(id: string, creds: Record<string, string> = {}): BaseConnector | null {
  const Cls = REGISTRY[id];
  return Cls ? new Cls(creds) : null;
}

export function listConnectors(): ConnectorMeta[] {
  return Object.values(REGISTRY).map((Cls) => new Cls({}).describe());
}

export function isKnownConnector(id: string): boolean {
  return id in REGISTRY;
}

export type { ConnectorMeta };
