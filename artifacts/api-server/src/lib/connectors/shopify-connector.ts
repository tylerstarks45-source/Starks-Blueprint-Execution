import { BaseConnector, TestResult, ExecResult } from "./base";

export class ShopifyConnector extends BaseConnector {
  readonly id = "shopify";
  readonly displayName = "Shopify";
  readonly category = "ecommerce";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["shop_domain", "access_token"];
  readonly actions = ["createProduct", "getOrders", "syncInventory", "updateProduct", "getProducts"];

  private base() {
    return `https://${this.creds["shop_domain"]}/admin/api/2024-01`;
  }
  private headers() {
    return { "X-Shopify-Access-Token": this.creds["access_token"], "Content-Type": "application/json" };
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["shop_domain"] || !this.creds["access_token"]) {
      return { ok: false, latencyMs: 0, message: "Shopify shop_domain and access_token required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${this.base()}/shop.json`, { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { shop?: { name?: string } };
        return { ok: true, latencyMs, message: `Connected to ${data.shop?.name ?? this.creds["shop_domain"]}` };
      }
      return { ok: false, latencyMs, message: `Shopify returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    try {
      if (action === "getProducts" || action === "syncInventory") {
        const res = await fetch(`${this.base()}/products.json?limit=10`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
        const data = await res.json() as { products?: unknown[] };
        return { ok: true, data: { count: data.products?.length ?? 0, products: data.products?.slice(0, 3) } };
      }
      if (action === "getOrders") {
        const res = await fetch(`${this.base()}/orders.json?status=any&limit=10`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
        const data = await res.json() as { orders?: unknown[] };
        return { ok: true, data: { count: data.orders?.length ?? 0 } };
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
        const data = await res.json() as { product?: { id?: number; title?: string } };
        return { ok: true, data: { id: data.product?.id, title: data.product?.title } };
      }
      if (action === "updateProduct") {
        const productId = params["productId"] as string;
        if (!productId) return { ok: false, error: "productId required" };
        const body = { product: { title: params["title"], body_html: params["description"] } };
        const res = await fetch(`${this.base()}/products/${productId}.json`, {
          method: "PUT", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
        const data = await res.json() as { product?: { id?: number } };
        return { ok: true, data: { id: data.product?.id } };
      }
      return { ok: false, error: `Unknown Shopify action: ${action}` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
