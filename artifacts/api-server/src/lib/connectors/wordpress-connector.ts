import { BaseConnector, TestResult, ExecResult } from "./base";

export class WordPressConnector extends BaseConnector {
  readonly id = "wordpress";
  readonly displayName = "WordPress";
  readonly category = "content";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"];
  readonly actions = ["createPost", "updatePost", "getPosts", "createPage", "uploadMedia", "getCategories"];

  private base() {
    const url = this.creds["WORDPRESS_SITE_URL"]?.replace(/\/$/, "");
    return `${url}/wp-json/wp/v2`;
  }
  private headers() {
    const credentials = Buffer.from(
      `${this.creds["WORDPRESS_USERNAME"]}:${this.creds["WORDPRESS_APP_PASSWORD"]}`
    ).toString("base64");
    return { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" };
  }

  async testConnection(): Promise<TestResult> {
    const url = this.creds["WORDPRESS_SITE_URL"];
    const user = this.creds["WORDPRESS_USERNAME"];
    const pass = this.creds["WORDPRESS_APP_PASSWORD"];
    if (!url || !user || !pass) {
      return { ok: false, latencyMs: 0, message: "WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${this.base()}/users/me`, { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { name?: string; slug?: string };
        return { ok: true, latencyMs, message: `Connected as ${data.name ?? data.slug ?? user} on ${url}` };
      }
      return { ok: false, latencyMs, message: `WordPress returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const url = this.creds["WORDPRESS_SITE_URL"];
    const user = this.creds["WORDPRESS_USERNAME"];
    const pass = this.creds["WORDPRESS_APP_PASSWORD"];
    if (!url || !user || !pass) return { ok: false, error: "WORDPRESS_SITE_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD required" };

    try {
      if (action === "getPosts") {
        const res = await fetch(`${this.base()}/posts?per_page=10&status=any`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `WordPress ${res.status}` };
        const posts = await res.json() as Array<{ id?: number; title?: { rendered?: string }; status?: string; link?: string }>;
        return { ok: true, data: { count: posts.length, posts: posts.slice(0, 5).map(p => ({ id: p.id, title: p.title?.rendered, status: p.status, link: p.link })), message: `Retrieved ${posts.length} posts` } };
      }
      if (action === "createPost") {
        const body = {
          title: (params["title"] as string) ?? "New Post",
          content: (params["content"] as string) ?? "",
          excerpt: (params["excerpt"] as string) ?? "",
          status: (params["status"] as string) ?? "draft",
          categories: Array.isArray(params["categories"]) ? params["categories"] : [],
          tags: Array.isArray(params["tags"]) ? params["tags"] : [],
        };
        const res = await fetch(`${this.base()}/posts`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `WordPress ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { id?: number; link?: string; title?: { rendered?: string }; status?: string };
        return { ok: true, data: { id: data.id, url: data.link, title: data.title?.rendered, status: data.status, message: `Post "${data.title?.rendered}" created as ${data.status}` } };
      }
      if (action === "updatePost") {
        const postId = params["postId"] as string;
        if (!postId) return { ok: false, error: "postId required" };
        const body: Record<string, unknown> = {};
        if (params["title"]) body["title"] = params["title"];
        if (params["content"]) body["content"] = params["content"];
        if (params["status"]) body["status"] = params["status"];
        const res = await fetch(`${this.base()}/posts/${postId}`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `WordPress ${res.status}` };
        const data = await res.json() as { id?: number; link?: string; status?: string };
        return { ok: true, data: { id: data.id, url: data.link, status: data.status, message: `Post ${postId} updated to ${data.status}` } };
      }
      if (action === "createPage") {
        const body = {
          title: (params["title"] as string) ?? "New Page",
          content: (params["content"] as string) ?? "",
          status: (params["status"] as string) ?? "draft",
        };
        const res = await fetch(`${this.base()}/pages`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `WordPress ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { id?: number; link?: string; title?: { rendered?: string } };
        return { ok: true, data: { id: data.id, url: data.link, title: data.title?.rendered, message: `Page "${data.title?.rendered}" created` } };
      }
      if (action === "getCategories") {
        const res = await fetch(`${this.base()}/categories?per_page=20`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `WordPress ${res.status}` };
        const cats = await res.json() as Array<{ id?: number; name?: string; slug?: string }>;
        return { ok: true, data: { count: cats.length, categories: cats.map(c => ({ id: c.id, name: c.name, slug: c.slug })), message: `Found ${cats.length} categories` } };
      }
      return { ok: false, error: `Unknown WordPress action: ${action}. Available: createPost, updatePost, getPosts, createPage, uploadMedia, getCategories` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
