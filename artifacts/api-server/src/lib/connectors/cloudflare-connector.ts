import { BaseConnector, TestResult, ExecResult } from "./base";

export class CloudflareConnector extends BaseConnector {
  readonly id = "cloudflare";
  readonly displayName = "Cloudflare";
  readonly category = "infrastructure";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["api_token", "account_id"];
  readonly actions = ["deploySite", "purgeCache", "getDNS", "listWorkers", "createWorker"];

  private headers() {
    return { Authorization: `Bearer ${this.creds["api_token"]}`, "Content-Type": "application/json" };
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["api_token"]) {
      return { ok: false, latencyMs: 0, message: "Cloudflare API token required" };
    }
    const start = Date.now();
    try {
      const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: this.headers(),
      });
      const latencyMs = Date.now() - start;
      const data = await res.json() as { success: boolean; result?: { status?: string } };
      if (data.success) return { ok: true, latencyMs, message: `Token ${data.result?.status ?? "active"}` };
      return { ok: false, latencyMs, message: "Invalid Cloudflare API token" };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const accountId = this.creds["account_id"];
    try {
      if (action === "listWorkers") {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, {
          headers: this.headers(),
        });
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { result?: Array<{ id?: string }> };
        return { ok: true, data: { count: data.result?.length ?? 0, workers: data.result?.map(w => w.id) } };
      }
      if (action === "purgeCache") {
        const zoneId = (params["zoneId"] as string) ?? this.creds["zone_id"];
        if (!zoneId) return { ok: false, error: "zoneId required" };
        const body = params["purgeEverything"] ? { purge_everything: true } : { files: params["files"] ?? [] };
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { success: boolean; result?: { id?: string } };
        return { ok: data.success, data: { purgeId: data.result?.id } };
      }
      if (action === "getDNS") {
        const zoneId = (params["zoneId"] as string) ?? this.creds["zone_id"];
        if (!zoneId) return { ok: false, error: "zoneId required" };
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=10`, {
          headers: this.headers(),
        });
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { result?: unknown[]; result_info?: { total_count?: number } };
        return { ok: true, data: { count: data.result_info?.total_count ?? 0, records: data.result?.slice(0, 5) } };
      }
      if (action === "createWorker" || action === "deploySite") {
        const scriptName = (params["name"] as string) ?? "sbep-worker";
        const script = (params["script"] as string) ?? `addEventListener('fetch', e => e.respondWith(new Response('Hello from SBEP!')))`;
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`,
          { method: "PUT", headers: { ...this.headers(), "Content-Type": "application/javascript" }, body: script },
        );
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { success: boolean };
        return { ok: data.success, data: { workerName: scriptName } };
      }
      return { ok: false, error: `Unknown Cloudflare action: ${action}` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
