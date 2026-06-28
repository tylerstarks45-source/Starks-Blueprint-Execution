import { BaseConnector, TestResult, ExecResult } from "./base";

export class AirtableConnector extends BaseConnector {
  readonly id = "airtable";
  readonly displayName = "Airtable";
  readonly category = "data";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID"];
  readonly actions = ["listRecords", "createRecord", "updateRecord", "deleteRecord", "searchRecords"];

  private headers() {
    return { Authorization: `Bearer ${this.creds["AIRTABLE_API_KEY"]}`, "Content-Type": "application/json" };
  }
  private base() {
    return `https://api.airtable.com/v0/${this.creds["AIRTABLE_BASE_ID"]}`;
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["AIRTABLE_API_KEY"] || !this.creds["AIRTABLE_BASE_ID"]) {
      return { ok: false, latencyMs: 0, message: "AIRTABLE_API_KEY and AIRTABLE_BASE_ID required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`https://api.airtable.com/v0/meta/bases/${this.creds["AIRTABLE_BASE_ID"]}/tables`, {
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
    if (!this.creds["AIRTABLE_API_KEY"] || !this.creds["AIRTABLE_BASE_ID"]) {
      return { ok: false, error: "AIRTABLE_API_KEY and AIRTABLE_BASE_ID required" };
    }
    const table = encodeURIComponent((params["table"] as string) ?? "Table 1");

    try {
      if (action === "listRecords" || action === "searchRecords") {
        const filterFormula = params["filterFormula"]
          ? `?filterByFormula=${encodeURIComponent(params["filterFormula"] as string)}`
          : "?maxRecords=10";
        const res = await fetch(`${this.base()}/${table}${filterFormula}`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Airtable ${res.status}` };
        const data = await res.json() as { records?: unknown[] };
        return { ok: true, data: { count: data.records?.length ?? 0, records: data.records?.slice(0, 5), message: `Retrieved ${data.records?.length ?? 0} records` } };
      }
      if (action === "createRecord") {
        const body = { records: [{ fields: (params["fields"] as Record<string, unknown>) ?? {} }] };
        const res = await fetch(`${this.base()}/${table}`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Airtable ${res.status}` };
        const data = await res.json() as { records?: Array<{ id?: string }> };
        return { ok: true, data: { id: data.records?.[0]?.id, message: `Record created in Airtable table` } };
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
        return { ok: true, data: { id: data.id, message: "Record updated" } };
      }
      if (action === "deleteRecord") {
        const recordId = params["recordId"] as string;
        if (!recordId) return { ok: false, error: "recordId required" };
        const res = await fetch(`${this.base()}/${table}/${recordId}`, {
          method: "DELETE", headers: this.headers(),
        });
        if (!res.ok) return { ok: false, error: `Airtable ${res.status}` };
        const data = await res.json() as { deleted?: boolean };
        return { ok: true, data: { deleted: data.deleted, message: "Record deleted" } };
      }
      return { ok: false, error: `Unknown Airtable action: ${action}. Available: listRecords, createRecord, updateRecord, deleteRecord, searchRecords` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
