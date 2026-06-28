import { BaseConnector, TestResult, ExecResult } from "./base";

export class NotionConnector extends BaseConnector {
  readonly id = "notion";
  readonly displayName = "Notion";
  readonly category = "productivity";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["NOTION_API_KEY"];
  readonly actions = ["createPage", "appendBlock", "queryDatabase", "createDatabase", "updatePage"];

  private headers() {
    return {
      Authorization: `Bearer ${this.creds["NOTION_API_KEY"]}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    };
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["NOTION_API_KEY"]) return { ok: false, latencyMs: 0, message: "NOTION_API_KEY required" };
    const start = Date.now();
    try {
      const res = await fetch("https://api.notion.com/v1/users/me", { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { name?: string; type?: string };
        return { ok: true, latencyMs, message: `Connected as ${data.name ?? data.type ?? "Notion user"}` };
      }
      return { ok: false, latencyMs, message: `Notion returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    if (!this.creds["NOTION_API_KEY"]) return { ok: false, error: "NOTION_API_KEY required" };

    try {
      if (action === "queryDatabase") {
        const dbId = params["databaseId"] as string;
        if (!dbId) return { ok: false, error: "databaseId required" };
        const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: "POST", headers: this.headers(), body: JSON.stringify({ page_size: 10 }),
        });
        if (!res.ok) return { ok: false, error: `Notion ${res.status}` };
        const data = await res.json() as { results?: unknown[] };
        return { ok: true, data: { count: data.results?.length ?? 0, message: `Queried ${data.results?.length ?? 0} records` } };
      }
      if (action === "createPage") {
        const parentId = (params["parentId"] as string) ?? (params["databaseId"] as string);
        if (!parentId) return { ok: false, error: "parentId or databaseId required" };
        const isDb = !!params["databaseId"];
        const body = {
          parent: isDb ? { database_id: parentId } : { page_id: parentId },
          properties: isDb
            ? { Name: { title: [{ text: { content: (params["title"] as string) ?? "New Page" } }] } }
            : { title: [{ text: { content: (params["title"] as string) ?? "New Page" } }] },
        };
        const res = await fetch("https://api.notion.com/v1/pages", {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Notion ${res.status}` };
        const data = await res.json() as { id?: string; url?: string };
        return { ok: true, data: { pageId: data.id, url: data.url, message: `Page "${params["title"] ?? "New Page"}" created` } };
      }
      if (action === "appendBlock") {
        const blockId = params["pageId"] as string;
        if (!blockId) return { ok: false, error: "pageId required" };
        const text = (params["text"] as string) ?? "";
        const body = {
          children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: text } }] } }],
        };
        const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
          method: "PATCH", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Notion ${res.status}` };
        const data = await res.json() as { results?: unknown[] };
        return { ok: true, data: { blocksAdded: data.results?.length ?? 1, message: "Block appended to Notion page" } };
      }
      if (action === "updatePage") {
        const pageId = params["pageId"] as string;
        if (!pageId) return { ok: false, error: "pageId required" };
        const body = {
          properties: { Name: { title: [{ text: { content: (params["title"] as string) ?? "" } }] } },
          archived: params["archived"] === true,
        };
        const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: "PATCH", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Notion ${res.status}` };
        const data = await res.json() as { id?: string };
        return { ok: true, data: { pageId: data.id, message: "Notion page updated" } };
      }
      return { ok: false, error: `Unknown Notion action: ${action}. Available: createPage, appendBlock, queryDatabase, updatePage` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
