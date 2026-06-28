import { BaseConnector, TestResult, ExecResult } from "./base";

abstract class OAuthStub extends BaseConnector {
  readonly stubOnly = true;
  readonly authType = "oauth2" as const;

  async testConnection(): Promise<TestResult> {
    return {
      ok: false,
      latencyMs: 0,
      message: `${this.displayName} requires OAuth2 authorization. This connector is coming soon.`,
      details: { stubOnly: true },
    };
  }

  async execute(_action: string, _params: Record<string, unknown>): Promise<ExecResult> {
    return { ok: false, error: `${this.displayName} connector is not yet available. OAuth2 setup required.` };
  }
}

export class GmailStub extends OAuthStub {
  readonly id = "gmail";
  readonly displayName = "Gmail";
  readonly category = "communication";
  readonly requiredCredentials = ["client_id", "client_secret", "refresh_token"];
  readonly actions = ["sendEmail", "readInbox", "createDraft", "searchEmails"];
}

export class GoogleSheetsStub extends OAuthStub {
  readonly id = "google_sheets";
  readonly displayName = "Google Sheets";
  readonly category = "data";
  readonly requiredCredentials = ["client_id", "client_secret", "refresh_token"];
  readonly actions = ["readSheet", "appendRow", "updateCell", "createSheet"];
}

export class TikTokStub extends OAuthStub {
  readonly id = "tiktok";
  readonly displayName = "TikTok";
  readonly category = "social_media";
  readonly requiredCredentials = ["access_token"];
  readonly actions = ["uploadVideo", "getAnalytics", "schedulePost", "getFollowers"];
}

export class MetaStub extends OAuthStub {
  readonly id = "meta";
  readonly displayName = "Meta (Facebook/Instagram)";
  readonly category = "social_media";
  readonly requiredCredentials = ["access_token", "page_id"];
  readonly actions = ["createAd", "getInsights", "publishPost", "getPageAnalytics"];
}

export class YouTubeStub extends OAuthStub {
  readonly id = "youtube";
  readonly displayName = "YouTube";
  readonly category = "social_media";
  readonly requiredCredentials = ["client_id", "client_secret", "refresh_token"];
  readonly actions = ["uploadVideo", "getAnalytics", "updateDescription", "getSubscribers"];
}

