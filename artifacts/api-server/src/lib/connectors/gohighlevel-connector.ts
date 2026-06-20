import { BaseConnector, TestResult, ExecResult } from "./base";

export class GoHighLevelConnector extends BaseConnector {
  readonly id = "gohighlevel";
  readonly displayName = "GoHighLevel";
  readonly category = "crm";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["GOHIGHLEVEL_API_KEY"];
  readonly actions = ["createContact", "updateContact", "getContacts"];

  private get baseUrl() {
    return "https://rest.gohighlevel.com/v1";
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.creds["GOHIGHLEVEL_API_KEY"] ?? ""}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    };
  }

  async testConnection(): Promise<TestResult> {
    const apiKey = this.creds["GOHIGHLEVEL_API_KEY"];
    if (!apiKey) return { ok: false, latencyMs: 0, message: "GOHIGHLEVEL_API_KEY not configured" };

    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/locations/`, {
        headers: this.headers,
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, latencyMs, message: "GoHighLevel API connected" };
      }
      const errBody = await res.text();
      return { ok: false, latencyMs, message: `GoHighLevel returned ${res.status}: ${errBody.slice(0, 120)}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const apiKey = this.creds["GOHIGHLEVEL_API_KEY"];
    if (!apiKey) return { ok: false, error: "GOHIGHLEVEL_API_KEY not configured" };

    if (action === "createContact") {
      const email = params["email"] as string | undefined;
      const firstName = (params["firstName"] as string | undefined) ?? "";
      const lastName = (params["lastName"] as string | undefined) ?? "";
      const phone = (params["phone"] as string | undefined) ?? "";
      const locationId = (params["locationId"] as string | undefined) ?? (this.creds["GOHIGHLEVEL_LOCATION_ID"] ?? "");
      const tags = (params["tags"] as string[] | undefined) ?? [];

      if (!email && !phone) return { ok: false, error: "email or phone parameter is required for createContact" };

      const contactPayload: Record<string, unknown> = {
        firstName,
        lastName,
        tags,
        source: "SBEP",
      };
      if (email) contactPayload["email"] = email;
      if (phone) contactPayload["phone"] = phone;
      if (locationId) contactPayload["locationId"] = locationId;

      try {
        const res = await fetch(`${this.baseUrl}/contacts/`, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify(contactPayload),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) {
          const contact = (body["contact"] ?? body) as Record<string, unknown>;
          return {
            ok: true,
            data: {
              contactId: contact["id"],
              email,
              phone,
              message: `Contact created in GoHighLevel: ${firstName} ${lastName} (${email ?? phone})`,
            },
          };
        }
        return { ok: false, error: `GoHighLevel API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "getContacts") {
      try {
        const locationId = (params["locationId"] as string | undefined) ?? (this.creds["GOHIGHLEVEL_LOCATION_ID"] ?? "");
        const url = locationId
          ? `${this.baseUrl}/contacts/?locationId=${locationId}&limit=20`
          : `${this.baseUrl}/contacts/?limit=20`;
        const res = await fetch(url, { headers: this.headers });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) return { ok: true, data: body };
        return { ok: false, error: `GoHighLevel API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    if (action === "updateContact") {
      const contactId = params["contactId"] as string | undefined;
      if (!contactId) return { ok: false, error: "contactId parameter is required for updateContact" };

      try {
        const { contactId: _id, ...updateData } = params;
        void _id;
        const res = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
          method: "PUT",
          headers: this.headers,
          body: JSON.stringify(updateData),
        });
        const body = await res.json() as Record<string, unknown>;
        if (res.ok) return { ok: true, data: { contactId, updated: true, message: `Contact ${contactId} updated in GoHighLevel` } };
        return { ok: false, error: `GoHighLevel API ${res.status}: ${JSON.stringify(body).slice(0, 200)}` };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }

    return { ok: false, error: `Unknown action: ${action}. Available: createContact, updateContact, getContacts` };
  }
}
