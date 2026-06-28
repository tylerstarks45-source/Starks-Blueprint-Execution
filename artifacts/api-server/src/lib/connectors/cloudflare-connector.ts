import { BaseConnector, TestResult, ExecResult } from "./base";

export class CloudflareConnector extends BaseConnector {
  readonly id = "cloudflare";
  readonly displayName = "Cloudflare";
  readonly category = "infrastructure";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"];
  readonly actions = ["deploySite", "purgeCache", "getDNS", "listWorkers", "createWorker"];

  private headers() {
    return { Authorization: `Bearer ${this.creds["CLOUDFLARE_API_TOKEN"]}`, "Content-Type": "application/json" };
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["CLOUDFLARE_API_TOKEN"]) {
      return { ok: false, latencyMs: 0, message: "CLOUDFLARE_API_TOKEN required" };
    }
    const start = Date.now();
    try {
      const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: this.headers(),
      });
      const latencyMs = Date.now() - start;
      const data = await res.json() as { success: boolean; result?: { status?: string } };
      if (data.success) return { ok: true, latencyMs, message: `Token ${data.result?.status ?? "active"}` };
      return { ok: false, latencyMs, message: "Invalid CLOUDFLARE_API_TOKEN" };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const token = this.creds["CLOUDFLARE_API_TOKEN"];
    const accountId = this.creds["CLOUDFLARE_ACCOUNT_ID"];
    if (!token) return { ok: false, error: "CLOUDFLARE_API_TOKEN required" };

    try {
      if (action === "listWorkers") {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, {
          headers: this.headers(),
        });
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { result?: Array<{ id?: string }> };
        return { ok: true, data: { count: data.result?.length ?? 0, workers: data.result?.map(w => w.id), message: `Found ${data.result?.length ?? 0} Workers` } };
      }
      if (action === "purgeCache") {
        const zoneId = (params["zoneId"] as string) ?? this.creds["CLOUDFLARE_ZONE_ID"];
        if (!zoneId) return { ok: false, error: "zoneId or CLOUDFLARE_ZONE_ID required" };
        const body = params["purgeEverything"] ? { purge_everything: true } : { files: params["files"] ?? [] };
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
          method: "POST", headers: this.headers(), body: JSON.stringify(body),
        });
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { success: boolean; result?: { id?: string } };
        return { ok: data.success, data: { purgeId: data.result?.id, message: "Cache purged successfully" } };
      }
      if (action === "getDNS") {
        const zoneId = (params["zoneId"] as string) ?? this.creds["CLOUDFLARE_ZONE_ID"];
        if (!zoneId) return { ok: false, error: "zoneId or CLOUDFLARE_ZONE_ID required" };
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=10`, {
          headers: this.headers(),
        });
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { result?: unknown[]; result_info?: { total_count?: number } };
        return { ok: true, data: { count: data.result_info?.total_count ?? 0, records: data.result?.slice(0, 5) } };
      }
      if (action === "createWorker" || action === "deploySite") {
        const scriptName = (params["name"] as string) ?? "sbep-worker";
        const script = (params["script"] as string) ?? `addEventListener('fetch', event => { event.respondWith(new Response('Deployed by SBEP', { status: 200 })); });`;
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/javascript" }, body: script },
        );
        if (!res.ok) return { ok: false, error: `Cloudflare ${res.status}` };
        const data = await res.json() as { success: boolean };
        return { ok: data.success, data: { workerName: scriptName, message: `Worker "${scriptName}" deployed` } };
      }
      return { ok: false, error: `Unknown Cloudflare action: ${action}. Available: deploySite, purgeCache, getDNS, listWorkers, createWorker` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
