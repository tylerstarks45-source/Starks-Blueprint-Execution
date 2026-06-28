import { BaseConnector, TestResult, ExecResult } from "./base";

export class AirtableConnector extends BaseConnector {
  readonly id = "airtable";
  readonly displayName = "Airtable";
  readonly category = "data";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["api_key", "base_id"];
  readonly actions = ["listRecords", "createRecord", "updateRecord", "deleteRecord", "searchRecords"];

  private headers() {
    return { Authorization: `Bearer ${this.creds["api_key"]}`, "Content-Type": "application/json" };
  }
  private base() {
    return `https://api.airtable.com/v0/${this.creds["base_id"]}`;
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["api_key"] || !this.creds["base_id"]) {
      return { ok: false, latencyMs: 0, message: "Airtable api_key and base_id required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`https://api.airtable.com/v0/meta/bases/${this.creds["base_id"]}/tables`, {
        headers: this.headers(),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { tables?: Array<{ name?: string }> };
        return { ok: true, latencyMs, message: `Base connected — ${data.tables?.length ?? 0} tables` };
      }
      return { ok: false, latencyMs, message: `Airtable returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const table = encodeURIComponent((params["table"] as string) ?? "Table 1");
    try {
      if (action === "listRecords" || action === "searchRecords") {
        const filterFormula = params["filterFormula"] ? `?filterByFormula=${encodeURIComponent(params["filterFormula"] as string)}` : "?maxRecords=10";
        const res = await fetch(`${this.base()}/${table}${filterFormula}`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Airtable ${res.status}` };
        const data = await res.json() as { records?: unknown[] };
        return { ok: true, data: { count: data.records?.length ?? 0, records: data.records?.slice(0, 5) } };
      }
      if (action === "createRecord") {
        const body = { records: [{ fields: (params["fields"] as Record<string, unknown>) ?? {} }] };
        const res = await fetch(`${this.base()}/${table}`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Airtable ${res.status}` };
        const data = await res.json() as { records?: Array<{ id?: string }> };
        return { ok: true, data: { id: data.records?.[0]?.id } };
      }
      if (action === "updateRecord") {
        const recordId = params["recordId"] as string;
        if (!recordId) return { ok: false, error: "recordId required" };
        const body = { fields: (params["fields"] as Record<string, unknown>) ?? {} };
        const res = await fetch(`${this.base()}/${table}/${recordId}`, {
          method: "PATCH", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Airtable ${res.status}` };
        const data = await res.json() as { id?: string };
        return { ok: true, data: { id: data.id } };
      }
      if (action === "deleteRecord") {
        const recordId = params["recordId"] as string;
        if (!recordId) return { ok: false, error: "recordId required" };
        const res = await fetch(`${this.base()}/${table}/${recordId}`, {
          method: "DELETE", headers: this.headers(),
        });
        if (!res.ok) return { ok: false, error: `Airtable ${res.status}` };
        const data = await res.json() as { deleted?: boolean };
        return { ok: true, data: { deleted: data.deleted } };
      }
      return { ok: false, error: `Unknown Airtable action: ${action}` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
