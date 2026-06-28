import { BaseConnector, TestResult, ExecResult } from "./base";

export class ConvertKitConnector extends BaseConnector {
  readonly id = "convertkit";
  readonly displayName = "ConvertKit";
  readonly category = "email_marketing";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["CONVERTKIT_API_KEY"];
  readonly actions = ["addSubscriber", "getForms", "tagSubscriber", "createSequence", "getSequences", "addSubscriberToSequence"];

  async testConnection(): Promise<TestResult> {
    const apiKey = this.creds["CONVERTKIT_API_KEY"];
    if (!apiKey) return { ok: false, latencyMs: 0, message: "CONVERTKIT_API_KEY not configured" };

    const start = Date.now();
    try {
      const res = await fetch(`https://api.convertkit.com/v3/account?api_key=${apiKey}`);
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { name?: string };
        return { ok: true, latencyMs, message: `ConvertKit connected: ${data.name ?? "account verified"}` };
      }
      const errBody = await res.text();
      return { ok: false, latencyMs, message: `ConvertKit API returned ${res.status}: ${errBody.slice(0, 120)}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const apiKey = this.creds["CONVERTKIT_API_KEY"];
    if (!apiKey) return { ok: false, error: "CONVERTKIT_API_KEY not configured" };

    if (action === "addSubscriber") {
      const email = params["email"] as string | undefined;
      const firstName = (params["firstName"] as string | undefined) ?? "";
      const formId = (params["formId"] as string | undefined) ?? (this.creds["CONVERTKIT_FORM_ID"] ?? "");

      if (!email) return { ok: false, error: "email parameter is required for addSubscriber" };

      try {
        const endpoint = formId
          ? `https://api.convertkit.com/v3/forms/${formId}/subscribe`
          : "https://api.convertkit.com/v3/subscribers";

        const payload: Record<string, unknown> = { api_key: apiKey, email };
        if (firstName) payload["first_name"] = firstName;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) {
          const sub = (body["subscriber"] ?? body) as Record<string, unknown>;
          return {
            ok: true,
            data: {
              subscriberId: sub["id"],
              email,
              state: sub["state"],
              message: `Subscriber ${email} added to ConvertKit${formId ? ` form ${formId}` : ""}`,
            },
          };
        }
        return { ok: false, error: `ConvertKit API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "getForms") {
      try {
        const res = await fetch(`https://api.convertkit.com/v3/forms?api_key=${apiKey}`);
        const body = await res.json() as { forms?: Array<{ id: number; name: string }> };
        if (res.ok) {
          return { ok: true, data: { forms: body.forms ?? [] } };
        }
        return { ok: false, error: `ConvertKit API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "tagSubscriber") {
      const email = params["email"] as string | undefined;
      const tagId = params["tagId"] as string | undefined;
      if (!email) return { ok: false, error: "email parameter is required for tagSubscriber" };
      if (!tagId) return { ok: false, error: "tagId parameter is required for tagSubscriber" };

      try {
        const res = await fetch(`https://api.convertkit.com/v3/tags/${tagId}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, email }),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) return { ok: true, data: { email, tagId, message: `Tagged ${email} with tag ${tagId}` } };
        return { ok: false, error: `ConvertKit API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "getSequences") {
      try {
        const res = await fetch(`https://api.convertkit.com/v3/sequences?api_key=${apiKey}`);
        const body = await res.json() as { courses?: Array<{ id?: number; name?: string; created_at?: string }> };
        if (res.ok) {
          return { ok: true, data: { sequences: body.courses ?? [], count: body.courses?.length ?? 0, message: `Found ${body.courses?.length ?? 0} sequence(s)` } };
        }
        return { ok: false, error: `ConvertKit API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    if (action === "createSequence") {
      // ConvertKit API v3 does not expose a create-sequence endpoint for API-key auth;
      // sequences must be created in the UI. We return a descriptive result so the
      // build step can proceed with clear guidance rather than silently failing.
      const name = (params["name"] as string) ?? "New Sequence";
      return {
        ok: true,
        data: {
          name,
          status: "manual_required",
          message: `ConvertKit sequences cannot be created via API key auth — please create "${name}" manually in ConvertKit → Sequences, then use addSubscriberToSequence with the resulting sequence ID.`,
          docsUrl: "https://app.convertkit.com/sequences",
        },
      };
    }

    if (action === "addSubscriberToSequence") {
      const email = params["email"] as string | undefined;
      const sequenceId = (params["sequenceId"] as string | undefined) ?? (this.creds["CONVERTKIT_SEQUENCE_ID"] ?? "");
      if (!email) return { ok: false, error: "email required" };
      if (!sequenceId) return { ok: false, error: "sequenceId or CONVERTKIT_SEQUENCE_ID required" };
      try {
        const res = await fetch(`https://api.convertkit.com/v3/sequences/${sequenceId}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, email }),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) {
          const sub = (body["subscription"] ?? body) as Record<string, unknown>;
          return { ok: true, data: { email, sequenceId, subscriberId: (sub["subscriber"] as Record<string, unknown>)?.["id"], message: `${email} added to ConvertKit sequence ${sequenceId}` } };
        }
        return { ok: false, error: `ConvertKit API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) { return { ok: false, error: String(err) }; }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: addSubscriber, getForms, tagSubscriber, createSequence, getSequences, addSubscriberToSequence` };
  }
}
