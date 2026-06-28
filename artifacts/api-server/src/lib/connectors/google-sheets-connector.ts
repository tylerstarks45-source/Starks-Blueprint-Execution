import { BaseConnector, TestResult, ExecResult } from "./base";

// Google Sheets via API key (read/public) or Service Account JWT (read+write).
// Credential keys:
//   GOOGLE_SHEETS_API_KEY          — read-only access to public or shared sheets
//   GOOGLE_SHEETS_SERVICE_ACCOUNT  — JSON string of a service-account credentials object (full access)

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

async function buildJwt(sa: ServiceAccount): Promise<string> {
  // Build a Google-style JWT for service account auth (RS256 not available in plain Node
  // without extra libs, so we use the Google "self-signed JWT" approach via the fetch-based
  // token endpoint with a signed assertion created via the SubtleCrypto Web API).
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");

  const unsigned = `${header}.${payload}`;
  const pemKey = sa.private_key.replace(/\\n/g, "\n");
  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryKey = Buffer.from(keyData, "base64");

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await globalThis.crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(unsigned));
  const sig = Buffer.from(sigBuffer).toString("base64url");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });
  if (!tokenRes.ok) {
    const e = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${e.slice(0, 200)}`);
  }
  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) throw new Error("No access_token in Google token response");
  return tokenData.access_token;
}

export class GoogleSheetsConnector extends BaseConnector {
  readonly id = "google_sheets";
  readonly displayName = "Google Sheets";
  readonly category = "data";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["GOOGLE_SHEETS_API_KEY"];
  readonly actions = ["readSheet", "appendRow", "updateCell", "createSheet", "getSheetInfo"];

  private async authHeader(): Promise<Record<string, string> | null> {
    const sa = this.creds["GOOGLE_SHEETS_SERVICE_ACCOUNT"];
    if (sa) {
      try {
        const parsed = JSON.parse(sa) as ServiceAccount;
        const token = await buildJwt(parsed);
        return { Authorization: `Bearer ${token}` };
      } catch {
        return null;
      }
    }
    return null; // fall back to API key query param
  }

  private apiKey(): string | undefined {
    return this.creds["GOOGLE_SHEETS_API_KEY"];
  }

  private qs(extra: Record<string, string> = {}): string {
    const key = this.apiKey();
    const params = { ...extra, ...(key ? { key } : {}) };
    return Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
  }

  async testConnection(): Promise<TestResult> {
    const key = this.apiKey();
    const sa = this.creds["GOOGLE_SHEETS_SERVICE_ACCOUNT"];
    if (!key && !sa) {
      return { ok: false, latencyMs: 0, message: "GOOGLE_SHEETS_API_KEY or GOOGLE_SHEETS_SERVICE_ACCOUNT required" };
    }
    const spreadsheetId = this.creds["GOOGLE_SHEETS_SPREADSHEET_ID"];
    if (!spreadsheetId) {
      return { ok: false, latencyMs: 0, message: "GOOGLE_SHEETS_SPREADSHEET_ID required to verify connection" };
    }
    const start = Date.now();
    try {
      const authHdr = await this.authHeader();
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${this.qs()}`,
        { headers: { ...(authHdr ?? {}), "Accept": "application/json" } },
      );
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { properties?: { title?: string } };
        return { ok: true, latencyMs, message: `Connected — sheet: "${data.properties?.title ?? spreadsheetId}"` };
      }
      return { ok: false, latencyMs, message: `Google Sheets returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const key = this.apiKey();
    const sa = this.creds["GOOGLE_SHEETS_SERVICE_ACCOUNT"];
    if (!key && !sa) return { ok: false, error: "GOOGLE_SHEETS_API_KEY or GOOGLE_SHEETS_SERVICE_ACCOUNT required" };

    const spreadsheetId = (params["spreadsheetId"] as string) ?? this.creds["GOOGLE_SHEETS_SPREADSHEET_ID"];
    if (!spreadsheetId) return { ok: false, error: "spreadsheetId or GOOGLE_SHEETS_SPREADSHEET_ID required" };

    try {
      const authHdr = await this.authHeader();
      const hdrs = { ...(authHdr ?? {}), "Accept": "application/json", "Content-Type": "application/json" };

      if (action === "getSheetInfo") {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${this.qs()}`, { headers: hdrs });
        if (!res.ok) return { ok: false, error: `Google Sheets ${res.status}` };
        const data = await res.json() as { properties?: { title?: string }; sheets?: Array<{ properties?: { title?: string; sheetId?: number } }> };
        return { ok: true, data: { title: data.properties?.title, sheets: data.sheets?.map(s => ({ name: s.properties?.title, id: s.properties?.sheetId })), message: `Sheet info retrieved for "${data.properties?.title}"` } };
      }

      if (action === "readSheet") {
        const range = (params["range"] as string) ?? "Sheet1!A1:Z100";
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}${this.qs()}`,
          { headers: hdrs },
        );
        if (!res.ok) return { ok: false, error: `Google Sheets ${res.status}` };
        const data = await res.json() as { values?: unknown[][] };
        return { ok: true, data: { rows: data.values?.length ?? 0, range, values: data.values?.slice(0, 5), message: `Read ${data.values?.length ?? 0} rows from ${range}` } };
      }

      if (action === "appendRow") {
        if (!authHdr && !sa) return { ok: false, error: "GOOGLE_SHEETS_SERVICE_ACCOUNT required to write (API key is read-only)" };
        const range = (params["range"] as string) ?? "Sheet1!A:Z";
        const values = params["values"] as unknown[][];
        if (!values) return { ok: false, error: "values (2D array) required for appendRow" };
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED${key ? `&key=${key}` : ""}`,
          { method: "POST", headers: hdrs, body: JSON.stringify({ values }) },
        );
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `Google Sheets ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { updates?: { updatedRange?: string; updatedRows?: number } };
        return { ok: true, data: { updatedRange: data.updates?.updatedRange, updatedRows: data.updates?.updatedRows, message: `Appended ${data.updates?.updatedRows ?? "?"} row(s) to ${range}` } };
      }

      if (action === "updateCell") {
        if (!authHdr && !sa) return { ok: false, error: "GOOGLE_SHEETS_SERVICE_ACCOUNT required to write" };
        const range = (params["range"] as string);
        const value = params["value"];
        if (!range || value === undefined) return { ok: false, error: "range and value required" };
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED${key ? `&key=${key}` : ""}`,
          { method: "PUT", headers: hdrs, body: JSON.stringify({ values: [[value]] }) },
        );
        if (!res.ok) return { ok: false, error: `Google Sheets ${res.status}` };
        return { ok: true, data: { range, value, message: `Cell ${range} updated to "${value}"` } };
      }

      if (action === "createSheet") {
        if (!authHdr && !sa) return { ok: false, error: "GOOGLE_SHEETS_SERVICE_ACCOUNT required to create sheets" };
        const title = (params["title"] as string) ?? "New Sheet";
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          { method: "POST", headers: hdrs, body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }) },
        );
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `Google Sheets ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { replies?: Array<{ addSheet?: { properties?: { sheetId?: number; title?: string } } }> };
        const sheet = data.replies?.[0]?.addSheet?.properties;
        return { ok: true, data: { sheetId: sheet?.sheetId, title: sheet?.title, message: `Sheet "${sheet?.title}" created in spreadsheet` } };
      }

      return { ok: false, error: `Unknown Google Sheets action: ${action}. Available: readSheet, appendRow, updateCell, createSheet, getSheetInfo` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
