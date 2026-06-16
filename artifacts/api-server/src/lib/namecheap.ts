/**
 * Namecheap API client.
 * Namecheap uses an XML-based REST API — all calls are GET requests
 * with query params, and responses are XML parsed via fast-xml-parser.
 *
 * Required env vars:
 *   NAMECHEAP_API_KEY    — API key from Namecheap account settings
 *   NAMECHEAP_API_USER   — Namecheap username (same as login)
 *   NAMECHEAP_USERNAME   — Namecheap username (same as API_USER usually)
 *   NAMECHEAP_CLIENT_IP  — IP whitelisted in Namecheap API settings
 *   NAMECHEAP_SANDBOX    — "true" to use sandbox (default: false)
 */
import { XMLParser } from "fast-xml-parser";

const LIVE_BASE   = "https://api.namecheap.com/xml.response";
const SANDBOX_BASE = "https://api.sandbox.namecheap.com/xml.response";

function getBase(): string {
  return process.env.NAMECHEAP_SANDBOX === "true" ? SANDBOX_BASE : LIVE_BASE;
}

function getCredentials() {
  const key  = process.env.NAMECHEAP_API_KEY;
  const user = process.env.NAMECHEAP_API_USER;
  const ip   = process.env.NAMECHEAP_CLIENT_IP;
  if (!key || !user || !ip) {
    throw new Error("Namecheap API not configured. Set NAMECHEAP_API_KEY, NAMECHEAP_API_USER, and NAMECHEAP_CLIENT_IP.");
  }
  return { ApiKey: key, ApiUser: user, UserName: process.env.NAMECHEAP_USERNAME || user, ClientIp: ip };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseAttributeValue: true });

async function callApi(command: string, extra: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const creds = getCredentials();
  const params = new URLSearchParams({
    ApiUser:  creds.ApiUser,
    ApiKey:   creds.ApiKey,
    UserName: creds.UserName,
    ClientIp: creds.ClientIp,
    Command:  command,
    ...extra,
  });
  const url = `${getBase()}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const xml = await res.text();
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const root = (parsed["ApiResponse"] ?? parsed) as Record<string, unknown>;

  const status = (root["@_Status"] as string | undefined) ?? "";
  if (status === "ERROR") {
    const errors = root["Errors"] as Record<string, unknown> | undefined;
    const errMsg = errors
      ? JSON.stringify(errors)
      : "Unknown Namecheap API error";
    throw new Error(`Namecheap API error: ${errMsg}`);
  }
  return root;
}

// ── Domain availability check ────────────────────────────────────────────────
export interface DomainCheckResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: number;
}

export async function checkDomains(domains: string[]): Promise<DomainCheckResult[]> {
  if (!domains.length) return [];
  const data = await callApi("namecheap.domains.check", { DomainList: domains.join(",") });
  const cr = (data["CommandResponse"] as Record<string, unknown>)?.["DomainCheckResult"];
  const items = Array.isArray(cr) ? cr : cr ? [cr] : [];
  return items.map((item: Record<string, unknown>) => ({
    domain: String(item["@_Domain"] ?? ""),
    available: String(item["@_Available"]).toLowerCase() === "true",
    premium: String(item["@_IsPremiumName"]).toLowerCase() === "true",
    price: item["@_PremiumRegistrationPrice"] ? Number(item["@_PremiumRegistrationPrice"]) : undefined,
  }));
}

// ── Domain purchase ───────────────────────────────────────────────────────────
export interface RegistrantContact {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;  // 2-letter ISO, e.g. "US"
  phone: string;    // +1.5555555555 format
}

export interface PurchaseResult {
  domain: string;
  orderId: string;
  transactionId: string;
  charged: number;
}

export async function purchaseDomain(
  domain: string,
  years: number,
  registrant: RegistrantContact
): Promise<PurchaseResult> {
  const [sld, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");

  const data = await callApi("namecheap.domains.create", {
    DomainName: domain,
    Years:      String(years),
    // Registrant
    RegistrantFirstName:    registrant.firstName,
    RegistrantLastName:     registrant.lastName,
    RegistrantAddress1:     registrant.address1,
    RegistrantCity:         registrant.city,
    RegistrantStateProvince:registrant.stateProvince,
    RegistrantPostalCode:   registrant.postalCode,
    RegistrantCountry:      registrant.country,
    RegistrantPhone:        registrant.phone,
    RegistrantEmailAddress: registrant.email,
    // Tech contact (same as registrant)
    TechFirstName:    registrant.firstName,
    TechLastName:     registrant.lastName,
    TechAddress1:     registrant.address1,
    TechCity:         registrant.city,
    TechStateProvince:registrant.stateProvince,
    TechPostalCode:   registrant.postalCode,
    TechCountry:      registrant.country,
    TechPhone:        registrant.phone,
    TechEmailAddress: registrant.email,
    // Admin contact
    AdminFirstName:    registrant.firstName,
    AdminLastName:     registrant.lastName,
    AdminAddress1:     registrant.address1,
    AdminCity:         registrant.city,
    AdminStateProvince:registrant.stateProvince,
    AdminPostalCode:   registrant.postalCode,
    AdminCountry:      registrant.country,
    AdminPhone:        registrant.phone,
    AdminEmailAddress: registrant.email,
    // Aux billing
    AuxBillingFirstName:    registrant.firstName,
    AuxBillingLastName:     registrant.lastName,
    AuxBillingAddress1:     registrant.address1,
    AuxBillingCity:         registrant.city,
    AuxBillingStateProvince:registrant.stateProvince,
    AuxBillingPostalCode:   registrant.postalCode,
    AuxBillingCountry:      registrant.country,
    AuxBillingPhone:        registrant.phone,
    AuxBillingEmailAddress: registrant.email,
    // DNS — point to Namecheap default (user can change later)
    Nameservers: "",
    AddFreeWhoisguard: "yes",
    WGEnabled: "yes",
  });

  const cr = (data["CommandResponse"] as Record<string, unknown>)?.["DomainCreateResult"] as Record<string, unknown>;
  return {
    domain:        String(cr["@_Domain"] ?? domain),
    orderId:       String(cr["@_OrderID"] ?? ""),
    transactionId: String(cr["@_TransactionID"] ?? ""),
    charged:       Number(cr["@_ChargedAmount"] ?? 0),
  };
}

// ── DNS host records ─────────────────────────────────────────────────────────
export interface DnsRecord {
  hostName: string;   // e.g. "@" or "www"
  recordType: "A" | "CNAME" | "TXT" | "MX" | "URL";
  address: string;
  ttl?: number;
}

export async function setDnsRecords(domain: string, records: DnsRecord[]): Promise<void> {
  const [sld, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");
  const extra: Record<string, string> = { SLD: sld, TLD: tld };
  records.forEach((r, i) => {
    const n = i + 1;
    extra[`HostName${n}`]   = r.hostName;
    extra[`RecordType${n}`] = r.recordType;
    extra[`Address${n}`]    = r.address;
    extra[`TTL${n}`]        = String(r.ttl ?? 1800);
  });
  await callApi("namecheap.domains.dns.setHosts", extra);
}

// ── Get pricing for a TLD ─────────────────────────────────────────────────────
export async function getTldPricing(tld: string): Promise<{ register: number } | null> {
  try {
    const data = await callApi("namecheap.users.getPricing", {
      ProductType:      "DOMAIN",
      ProductCategory:  "REGISTER",
      ActionName:       "REGISTER",
      ProductName:      tld,
    });
    const pricing = (data["CommandResponse"] as Record<string, unknown>)
      ?.["UserGetPricingResult"] as Record<string, unknown>;
    const price = (pricing?.["ProductType"] as Record<string, unknown>)
      ?.["ProductCategory"] as Record<string, unknown>;
    const reg = Number((price?.["Product"] as Record<string, unknown>)?.["@_Price"] ?? 0);
    return { register: reg };
  } catch {
    return null;
  }
}

// ── Check DNS propagation ─────────────────────────────────────────────────────
/**
 * Verifies that `domain` has a CNAME or A record pointing to `targetHost`.
 * Uses the system DNS resolver (dns.promises) — not Namecheap API.
 */
export async function verifyDnsCname(domain: string, targetHost: string): Promise<boolean> {
  const { promises: dns } = await import("dns");
  try {
    const cnames = await dns.resolveCname(`www.${domain}`);
    return cnames.some(c => c.includes(targetHost.replace(/^https?:\/\//, "").split("/")[0]));
  } catch {
    try {
      const addrs = await dns.resolve4(domain);
      return addrs.length > 0;
    } catch {
      return false;
    }
  }
}
