import { BaseConnector, TestResult, ExecResult } from "./base";
import { isBlockedUrl } from "./ssrf-guard";

export class ShopifyConnector extends BaseConnector {
  readonly id = "shopify";
  readonly displayName = "Shopify";
  readonly category = "ecommerce";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ACCESS_TOKEN"];
  readonly actions = ["createProduct", "getOrders", "getProducts", "syncInventory", "updateProduct", "createCollection"];

  private base() {
    return `https://${this.creds["SHOPIFY_SHOP_DOMAIN"]}/admin/api/2024-01`;
  }
  private headers() {
    return { "X-Shopify-Access-Token": this.creds["SHOPIFY_ACCESS_TOKEN"], "Content-Type": "application/json" };
  }

  async testConnection(): Promise<TestResult> {
    const domain = this.creds["SHOPIFY_SHOP_DOMAIN"];
    const token = this.creds["SHOPIFY_ACCESS_TOKEN"];
    if (!domain || !token) {
      return { ok: false, latencyMs: 0, message: "SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN required" };
    }
    // Validate constructed URL to prevent SSRF via crafted shop domains
    if (isBlockedUrl(`https://${domain}`)) {
      return { ok: false, latencyMs: 0, message: "SHOPIFY_SHOP_DOMAIN resolves to a blocked or private address" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${this.base()}/shop.json`, { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { shop?: { name?: string } };
        return { ok: true, latencyMs, message: `Connected to ${data.shop?.name ?? domain}` };
      }
      return { ok: false, latencyMs, message: `Shopify returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const domain = this.creds["SHOPIFY_SHOP_DOMAIN"];
    const token = this.creds["SHOPIFY_ACCESS_TOKEN"];
    if (!domain || !token) return { ok: false, error: "SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN required" };
    if (isBlockedUrl(`https://${domain}`)) {
      return { ok: false, error: "SHOPIFY_SHOP_DOMAIN resolves to a blocked or private address" };
    }

    try {
      if (action === "getProducts" || action === "syncInventory") {
        const res = await fetch(`${this.base()}/products.json?limit=10`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
        const data = await res.json() as { products?: Array<{ id?: number; title?: string }> };
        return { ok: true, data: { count: data.products?.length ?? 0, products: data.products?.slice(0, 3).map(p => ({ id: p.id, title: p.title })) } };
      }
      if (action === "getOrders") {
        const res = await fetch(`${this.base()}/orders.json?status=any&limit=10`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
        const data = await res.json() as { orders?: unknown[] };
        return { ok: true, data: { count: data.orders?.length ?? 0, message: `Retrieved ${data.orders?.length ?? 0} recent orders` } };
      }
      if (action === "createProduct") {
        const body = {
          product: {
            title: (params["title"] as string) ?? "New Product",
            body_html: (params["description"] as string) ?? "",
            vendor: (params["vendor"] as string) ?? "SBEP",
            product_type: (params["type"] as string) ?? "Digital",
            status: "draft",
            variants: [{ price: String((params["price"] as number) ?? 0), sku: (params["sku"] as string) ?? "" }],
          },
        };
        const res = await fetch(`${this.base()}/products.json`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
        const data = await res.json() as { product?: { id?: number; title?: string; admin_graphql_api_id?: string } };
        return { ok: true, data: { id: data.product?.id, title: data.product?.title, message: `Product "${data.product?.title}" created in draft` } };
      }
      if (action === "updateProduct") {
        const productId = params["productId"] as string;
        if (!productId) return { ok: false, error: "productId required" };
        const body = { product: { title: params["title"], body_html: params["description"] } };
        const res = await fetch(`${this.base()}/products/${productId}.json`, {
          method: "PUT", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
        const data = await res.json() as { product?: { id?: number; title?: string } };
        return { ok: true, data: { id: data.product?.id, title: data.product?.title } };
      }
      if (action === "createCollection") {
        const title = (params["title"] as string) ?? "New Collection";
        const body_html = (params["description"] as string) ?? "";
        const res = await fetch(`${this.base()}/custom_collections.json`, {
          method: "POST", headers: this.headers(),
          body: JSON.stringify({ custom_collection: { title, body_html, published: (params["published"] as boolean) ?? false } }),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `Shopify ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { custom_collection?: { id?: number; title?: string; handle?: string } };
        return { ok: true, data: { id: data.custom_collection?.id, title: data.custom_collection?.title, handle: data.custom_collection?.handle, message: `Shopify collection "${data.custom_collection?.title}" created (ID: ${data.custom_collection?.id})` } };
      }
      return { ok: false, error: `Unknown Shopify action: ${action}. Available: createProduct, getOrders, getProducts, syncInventory, updateProduct, createCollection` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
