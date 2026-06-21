import { logger } from "./logger";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
}

/**
 * Sends push notifications via the Expo Push Notification service.
 * Fire-and-forget: errors are logged but never propagate.
 */
export async function sendPushNotification(
  expoPushToken: string | null | undefined,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (!expoPushToken) return;
  if (!expoPushToken.startsWith("ExponentPushToken[") && !expoPushToken.startsWith("ExpoPushToken[")) {
    logger.warn({ expoPushToken }, "Invalid Expo push token format — skipping");
    return;
  }
  const message: PushMessage = { to: expoPushToken, title, body, data, sound: "default" };
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, token: expoPushToken }, "Expo push send failed");
    }
  } catch (err) {
    logger.error({ err }, "sendPushNotification fetch error");
  }
}

/**
 * Bulk push — sends to up to 100 tokens per Expo batch limit.
 */
export async function sendPushBatch(
  tokens: Array<string | null | undefined>,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const valid = tokens.filter(
    (t): t is string =>
      typeof t === "string" &&
      (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[")),
  );
  if (!valid.length) return;
  const messages = valid.map((to) => ({ to, title, body, data, sound: "default" }));
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, count: valid.length }, "Expo push batch failed");
    }
  } catch (err) {
    logger.error({ err }, "sendPushBatch fetch error");
  }
}
