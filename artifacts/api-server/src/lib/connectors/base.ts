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

export interface ConnectorMeta {
  id: string;
  displayName: string;
  category: string;
  authType: "api_key" | "oauth2" | "webhook" | "none";
  requiredCredentials: string[];
  actions: string[];
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

  constructor(protected creds: Record<string, string>) {}

  validateCredentials(): boolean {
    return this.requiredCredentials.every((k) => !!this.creds[k]);
  }

  abstract testConnection(): Promise<TestResult>;
  abstract execute(action: string, params: Record<string, unknown>): Promise<ExecResult>;

  describe(): ConnectorMeta {
    return {
      id: this.id,
      displayName: this.displayName,
      category: this.category,
      authType: this.authType,
      requiredCredentials: this.requiredCredentials,
      actions: this.actions,
      available: !this.stubOnly,
      stubOnly: this.stubOnly,
    };
  }
}
