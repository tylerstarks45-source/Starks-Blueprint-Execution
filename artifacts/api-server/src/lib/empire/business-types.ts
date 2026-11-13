import { and, eq } from "drizzle-orm";
import { db, customBusinessTypesTable, BUSINESS_TYPES, type BusinessType } from "@workspace/db";

// Business Type Registry. Each type says which income streams and assets a
// business of that type normally has, and which pages run it. `baseType` is the
// stored businesses.business_type (the API enum); the registry key goes in type_key.
export interface BusinessTypeDef {
  key: string;
  name: string;
  category: string;
  description: string;
  baseType: BusinessType;
  streamTypes: string[];
  assetClasses: string[];
  builtin: boolean;
}

const t = (key: string, name: string, category: string, baseType: BusinessType, description: string, streamTypes: string[], assetClasses: string[]): BusinessTypeDef =>
  ({ key, name, category, baseType, description, streamTypes, assetClasses, builtin: true });

export const BUILTIN_BUSINESS_TYPES: BusinessTypeDef[] = [
  t("ecommerce", "Online store", "commerce", "ecommerce", "Sells physical products online, own store or marketplace.", ["physical_products", "subscriptions"], ["website", "product", "domain", "campaign"]),
  t("shopify", "Shopify store", "commerce", "shopify", "A store running on Shopify.", ["physical_products", "digital_products"], ["website", "product", "integration"]),
  t("dropshipping", "Dropshipping", "commerce", "ecommerce", "Store that sells supplier-fulfilled products.", ["physical_products"], ["website", "product", "integration", "campaign"]),
  t("print_on_demand", "Print on demand", "commerce", "ecommerce", "Custom merchandise printed per order.", ["physical_products"], ["website", "product", "brand_asset"]),
  t("digital_products", "Digital products", "products", "custom", "Templates, ebooks, presets and downloads.", ["digital_products"], ["product", "page", "document", "email_list"]),
  t("courses", "Online courses", "products", "membership", "Courses, cohorts and coaching programs.", ["courses", "memberships"], ["product", "page", "document", "email_list"]),
  t("saas", "SaaS / software", "software", "saas", "Subscription software or web app.", ["subscriptions", "usage_billing"], ["application", "website", "domain", "api"]),
  t("ai_agency", "AI automation agency", "services", "agency", "Builds AI agents and automations for clients.", ["services", "retainers"], ["ai_agent", "automation", "website", "page"]),
  t("agency", "Agency / services", "services", "agency", "Client services: design, marketing, development.", ["services", "retainers", "consulting"], ["website", "page", "document"]),
  t("affiliate", "Affiliate marketing", "content", "affiliate", "Earns commissions recommending other products.", ["affiliate"], ["website", "page", "campaign", "email_list"]),
  t("blog", "Blog / content site", "content", "blog", "Content site monetized by ads and affiliates.", ["advertising", "affiliate"], ["website", "page", "domain"]),
  t("youtube", "YouTube / video channel", "content", "youtube", "Video channel monetized by ads, sponsors and offers.", ["advertising", "partner", "affiliate"], ["brand_asset", "campaign", "integration"]),
  t("newsletter", "Newsletter", "content", "newsletter", "Email newsletter monetized by subscriptions and sponsors.", ["subscriptions", "advertising"], ["email_list", "page", "campaign"]),
  t("membership", "Membership / community", "content", "membership", "Paid community or members-only content.", ["memberships", "subscriptions"], ["website", "page", "email_list"]),
  t("leadgen", "Lead generation", "marketing", "leadgen", "Generates and sells leads to other businesses.", ["lead_sales"], ["page", "marketing_funnel", "campaign"]),
  t("wordpress", "WordPress site", "content", "wordpress", "A site running on WordPress.", ["advertising", "affiliate", "digital_products"], ["website", "domain"]),
  t("marketplace", "Marketplace", "commerce", "custom", "Connects buyers and sellers and takes a fee.", ["marketplace"], ["application", "website"]),
  t("local_services", "Local services", "services", "agency", "Bookings for local service businesses.", ["booking", "services"], ["website", "page", "integration"]),
];

export const STREAM_TYPES = [
  "digital_products", "physical_products", "services", "subscriptions", "memberships", "courses", "consulting",
  "retainers", "licensing", "usage_billing", "marketplace", "affiliate", "partner", "advertising", "lead_sales",
  "booking", "invoices", "other",
] as const;

export const slugifyKey = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);

export async function listBusinessTypes(ownerId: number): Promise<BusinessTypeDef[]> {
  const custom = await db.select().from(customBusinessTypesTable).where(eq(customBusinessTypesTable.ownerId, ownerId));
  return [
    ...BUILTIN_BUSINESS_TYPES,
    ...custom.map((c) => ({
      key: c.key, name: c.name, category: c.category, description: c.description ?? "", baseType: "custom" as BusinessType,
      streamTypes: c.streamTypes, assetClasses: c.assetClasses, builtin: false,
    })),
  ];
}

export async function resolveBusinessType(ownerId: number, key: string): Promise<BusinessTypeDef | null> {
  const builtin = BUILTIN_BUSINESS_TYPES.find((b) => b.key === key);
  if (builtin) return builtin;
  const [c] = await db.select().from(customBusinessTypesTable)
    .where(and(eq(customBusinessTypesTable.ownerId, ownerId), eq(customBusinessTypesTable.key, key)));
  if (c) return { key: c.key, name: c.name, category: c.category, description: c.description ?? "", baseType: "custom", streamTypes: c.streamTypes, assetClasses: c.assetClasses, builtin: false };
  if (key === "custom") return GENERIC_CUSTOM;
  // Legacy business_type values are valid registry keys too.
  if ((BUSINESS_TYPES as readonly string[]).includes(key)) return { ...BUILTIN_BUSINESS_TYPES.find((b) => b.baseType === key)!, key };
  return null;
}

const GENERIC_CUSTOM: BusinessTypeDef = {
  key: "custom", name: "Custom", category: "custom", description: "", baseType: "custom", streamTypes: [], assetClasses: [], builtin: true,
};

export function typeNameFor(types: BusinessTypeDef[], typeKey: string | null, businessType: string): string {
  const exact = types.find((x) => x.key === (typeKey ?? businessType));
  if (exact) return exact.name;
  if (businessType === "custom") return GENERIC_CUSTOM.name;
  return types.find((x) => x.baseType === businessType)?.name ?? businessType;
}
