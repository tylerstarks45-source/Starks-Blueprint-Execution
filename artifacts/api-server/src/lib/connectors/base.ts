export interface TestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ExecResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export type ActionSupport = "automated" | "manual_required" | "unsupported";

export interface ConnectorMeta {
  id: string;
  displayName: string;
  category: string;
  authType: "api_key" | "oauth2" | "webhook" | "none";
  requiredCredentials: string[];
  actions: string[];
  /** Per-action support level. Defaults to "automated" for any action not listed. */
  actionMeta: Record<string, ActionSupport>;
  available: boolean;
  stubOnly?: boolean;
}

export abstract class BaseConnector {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly category: string;
  abstract readonly authType: "api_key" | "oauth2" | "webhook" | "none";
  abstract readonly requiredCredentials: string[];
  abstract readonly actions: string[];
  readonly stubOnly: boolean = false;

  /**
   * Override in subclasses to declare any action that is NOT fully automated.
   * Actions absent from this map are assumed "automated".
   *
   * @example
   *   readonly actionSupport = { createAd: "manual_required" } as const;
   */
  readonly actionSupport: Partial<Record<string, ActionSupport>> = {};

  constructor(protected creds: Record<string, string>) {}

  validateCredentials(): boolean {
    return this.requiredCredentials.every((k) => !!this.creds[k]);
  }

  abstract testConnection(): Promise<TestResult>;
  abstract execute(action: string, params: Record<string, unknown>): Promise<ExecResult>;

  describe(): ConnectorMeta {
    const actionMeta: Record<string, ActionSupport> = {};
    for (const action of this.actions) {
      actionMeta[action] = this.actionSupport[action] ?? "automated";
    }
    return {
      id: this.id,
      displayName: this.displayName,
      category: this.category,
      authType: this.authType,
      requiredCredentials: this.requiredCredentials,
      actions: this.actions,
      actionMeta,
      available: !this.stubOnly,
      stubOnly: this.stubOnly,
    };
  }
}
