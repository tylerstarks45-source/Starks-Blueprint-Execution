import { BaseConnector, ConnectorMeta } from "./base";
import { OpenRouterConnector } from "./openrouter-connector";
import { StripeConnector } from "./stripe-connector";
import { EmailConnector } from "./email-connector";
import { TwitterConnector } from "./twitter-connector";
import { MailchimpConnector } from "./mailchimp-connector";
import { ConvertKitConnector } from "./convertkit-connector";
import { ZapierConnector } from "./zapier-connector";
import { GoHighLevelConnector } from "./gohighlevel-connector";
import { SlackConnector } from "./slack-connector";
import { SendGridConnector } from "./sendgrid-connector";
import { WebhookConnector } from "./webhook-connector";
import { ShopifyConnector } from "./shopify-connector";
import { CloudflareConnector } from "./cloudflare-connector";
import { NotionConnector } from "./notion-connector";
import { AirtableConnector } from "./airtable-connector";
import { LinkedInConnector } from "./linkedin-connector";
import { WordPressConnector } from "./wordpress-connector";
import { GoogleSheetsConnector } from "./google-sheets-connector";
import { MetaConnector } from "./meta-connector";
import { BeehiivConnector } from "./beehiiv-connector";
import { TeachableConnector } from "./teachable-connector";
import { ClickFunnelsConnector } from "./clickfunnels-connector";
import { GmailStub, TikTokStub, YouTubeStub } from "./stubs";

type ConnectorCtor = new (creds: Record<string, string>) => BaseConnector;

const REGISTRY: Record<string, ConnectorCtor> = {
  openrouter:  OpenRouterConnector,
  stripe:      StripeConnector,
  email:       EmailConnector,
  twitter:     TwitterConnector,
  mailchimp:   MailchimpConnector,
  convertkit:  ConvertKitConnector,
  zapier:      ZapierConnector,
  gohighlevel: GoHighLevelConnector,
  slack:       SlackConnector,
  sendgrid:    SendGridConnector,
  webhook:     WebhookConnector,
  shopify:     ShopifyConnector,
  cloudflare:  CloudflareConnector,
  notion:      NotionConnector,
  airtable:    AirtableConnector,
  linkedin:      LinkedInConnector,
  wordpress:     WordPressConnector,
  google_sheets: GoogleSheetsConnector,
  meta:          MetaConnector,
  beehiiv:       BeehiivConnector,
  teachable:     TeachableConnector,
  clickfunnels:  ClickFunnelsConnector,
  gmail:         GmailStub,
  tiktok:        TikTokStub,
  youtube:       YouTubeStub,
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
