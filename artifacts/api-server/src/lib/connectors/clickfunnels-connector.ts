import { BaseConnector, TestResult, ExecResult } from "./base";

// ClickFunnels 2.0 API connector.
// Required credentials:
//   CLICKFUNNELS_API_SECRET     — API secret from CF2 settings → Integrations → API
//   CLICKFUNNELS_WORKSPACE_ID   — Workspace ID (numeric, from CF2 URL)

const BASE = "https://myaccount.myclickfunnels.com/api/v2";

export class ClickFunnelsConnector extends BaseConnector {
  readonly id = "clickfunnels";
  readonly displayName = "ClickFunnels";
  readonly category = "funnels";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["CLICKFUNNELS_API_SECRET", "CLICKFUNNELS_WORKSPACE_ID"];
  readonly actions = ["listFunnels", "getFunnel", "listContacts", "createContact", "getContactTags", "listWorkspaces"];

  private headers() {
    return {
      Authorization: `Bearer ${this.creds["CLICKFUNNELS_API_SECRET"]}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  private wsId() { return this.creds["CLICKFUNNELS_WORKSPACE_ID"]; }

  async testConnection(): Promise<TestResult> {
    const secret = this.creds["CLICKFUNNELS_API_SECRET"];
    const wsId = this.wsId();
    if (!secret || !wsId) {
      return { ok: false, latencyMs: 0, message: "CLICKFUNNELS_API_SECRET and CLICKFUNNELS_WORKSPACE_ID required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${BASE}/workspaces`, { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { workspaces?: Array<{ id?: number; name?: string }> };
        const ws = data.workspaces?.find(w => String(w.id) === wsId) ?? data.workspaces?.[0];
        return { ok: true, latencyMs, message: `Connected to workspace "${ws?.name ?? wsId}"` };
      }
      return { ok: false, latencyMs, message: `ClickFunnels returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const secret = this.creds["CLICKFUNNELS_API_SECRET"];
    const wsId = this.wsId();
    if (!secret || !wsId) return { ok: false, error: "CLICKFUNNELS_API_SECRET and CLICKFUNNELS_WORKSPACE_ID required" };

    try {
      if (action === "listWorkspaces") {
        const res = await fetch(`${BASE}/workspaces`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `ClickFunnels ${res.status}` };
        const data = await res.json() as { workspaces?: Array<{ id?: number; name?: string }> };
        return { ok: true, data: { count: data.workspaces?.length, workspaces: data.workspaces, message: `Found ${data.workspaces?.length ?? 0} workspace(s)` } };
      }

      if (action === "listFunnels") {
        const res = await fetch(`${BASE}/workspaces/${wsId}/funnels`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `ClickFunnels ${res.status}` };
        const data = await res.json() as { funnels?: Array<{ id?: number; name?: string; created_at?: string }> };
        return { ok: true, data: { count: data.funnels?.length, funnels: data.funnels?.slice(0, 10).map(f => ({ id: f.id, name: f.name })), message: `Found ${data.funnels?.length ?? 0} funnel(s)` } };
      }

      if (action === "getFunnel") {
        const funnelId = params["funnelId"] as string;
        if (!funnelId) return { ok: false, error: "funnelId required" };
        const res = await fetch(`${BASE}/workspaces/${wsId}/funnels/${funnelId}`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `ClickFunnels ${res.status}` };
        const data = await res.json() as { funnel?: { id?: number; name?: string; created_at?: string } };
        return { ok: true, data: { id: data.funnel?.id, name: data.funnel?.name, createdAt: data.funnel?.created_at, message: `Funnel "${data.funnel?.name}" (ID: ${data.funnel?.id})` } };
      }

      if (action === "listContacts") {
        const res = await fetch(`${BASE}/workspaces/${wsId}/contacts?per_page=20`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `ClickFunnels ${res.status}` };
        const data = await res.json() as { contacts?: Array<{ id?: number; email_address?: string; first_name?: string; last_name?: string }>; meta?: { total?: number } };
        return { ok: true, data: { total: data.meta?.total, contacts: data.contacts?.slice(0, 5).map(c => ({ id: c.id, email: c.email_address, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() })), message: `${data.meta?.total ?? data.contacts?.length ?? 0} contacts in workspace` } };
      }

      if (action === "createContact") {
        const email = params["email"] as string;
        if (!email) return { ok: false, error: "email required" };
        const body: Record<string, unknown> = {
          contact: {
            email_address: email,
            first_name: params["firstName"] ?? "",
            last_name: params["lastName"] ?? "",
          },
        };
        const res = await fetch(`${BASE}/workspaces/${wsId}/contacts`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `ClickFunnels ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { contact?: { id?: number; email_address?: string } };
        return { ok: true, data: { id: data.contact?.id, email: data.contact?.email_address, message: `Contact ${email} created (ID: ${data.contact?.id})` } };
      }

      if (action === "getContactTags") {
        const contactId = params["contactId"] as string;
        if (!contactId) return { ok: false, error: "contactId required" };
        const res = await fetch(`${BASE}/workspaces/${wsId}/contacts/${contactId}/contact_segment_memberships`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `ClickFunnels ${res.status}` };
        const data = await res.json() as { contact_segment_memberships?: Array<{ contact_segment?: { name?: string } }> };
        const tags = data.contact_segment_memberships?.map(m => m.contact_segment?.name).filter(Boolean) ?? [];
        return { ok: true, data: { tags, count: tags.length, message: `Contact ${contactId} has ${tags.length} tag(s): ${tags.slice(0, 5).join(", ")}` } };
      }

      return { ok: false, error: `Unknown ClickFunnels action: ${action}. Available: listFunnels, getFunnel, listContacts, createContact, getContactTags, listWorkspaces` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
