import { Router, type IRouter } from "express";
import { requireAuthActive } from "../lib/auth";
import { runBrowserAgent } from "../lib/browser/agent";
import { complete } from "../lib/openrouter";
import { logEvent } from "../lib/log-event";
import { z } from "zod";

const router: IRouter = Router();

const RunSchema = z.object({
  task: z.string().min(1).max(500),
  startUrl: z.string().url(),
});

router.post("/browser-agent/run", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = RunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { task, startUrl } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: object) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  void logEvent({
    userId,
    category: "browser",
    severity: "info",
    component: "browser-agent",
    action: "run",
    message: `Browser agent started: "${task.slice(0, 120)}" at ${startUrl}`,
    metadata: { startUrl },
  });

  try {
    for await (const event of runBrowserAgent(task, startUrl, userId)) {
      send(event);
      if (event.type === "error") {
        void logEvent({
          userId,
          category: "browser",
          severity: "error",
          component: "browser-agent",
          action: "error",
          message: event.message ?? "Browser agent error",
          metadata: { startUrl },
        });
      }
      if (event.type === "done" || event.type === "error") {
        if (event.type === "done") {
          void logEvent({
            userId,
            category: "browser",
            severity: "info",
            component: "browser-agent",
            action: "done",
            message: `Browser agent finished: ${(event.result ?? "completed").slice(0, 200)}`,
            metadata: { startUrl },
          });
        }
        break;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Browser agent failed";
    send({ type: "error", message: msg });
    void logEvent({
      userId,
      category: "browser",
      severity: "error",
      component: "browser-agent",
      action: "error",
      message: msg,
      metadata: { startUrl },
    });
  } finally {
    clearInterval(keepAlive);
    send({ type: "end" });
    res.end();
  }
});

// ─── POST /api/browser-agent/credential-fetch ────────────────────────────────
// Beginner mode: user gives ASH their login info and ASH browses to extract the
// API key / credential value automatically. Streams SSE events + emits a final
// `credential_extracted` event with the actual value.

const CredentialFetchSchema = z.object({
  toolName: z.string().min(1).max(200),
  credentialLabel: z.string().min(1).max(200),
  platformUrl: z.string().url(),
  loginEmail: z.string().min(1).max(300),
  loginPassword: z.string().min(1).max(300),
});

router.post("/browser-agent/credential-fetch", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = CredentialFetchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { toolName, credentialLabel, platformUrl, loginEmail, loginPassword } = parsed.data;

  const task =
    `CREDENTIAL EXTRACTION TASK — ${toolName} / ${credentialLabel}\n\n` +
    `Your ONLY goal is to retrieve the exact value of the "${credentialLabel}" from ${toolName}.\n\n` +
    `STEP-BY-STEP PLAN:\n` +
    `1. Navigate to ${platformUrl}\n` +
    `2. Log in:\n` +
    `   - Email / username: ${loginEmail}\n` +
    `   - Password: ${loginPassword}\n` +
    `3. After logging in, look for navigation items or menu entries such as:\n` +
    `   "API", "API Keys", "Developer", "Keys", "Access Tokens", "Credentials", "Security", "Settings"\n` +
    `4. Click into the API / developer section\n` +
    `5. If a key is masked (shown as ****), click any "Show", "Reveal", "View", or eye-icon button to expose it\n` +
    `6. Use the get_value action on any input/textarea that contains the key value to read it\n` +
    `7. Include the EXACT key value in your done result as: CREDENTIAL_FOUND: [the-exact-value]\n\n` +
    `RULES:\n` +
    `- Only report done when you have the actual credential value in hand — not just after navigating\n` +
    `- API keys often start with a prefix like sk-, pk_, xai-, bearer, etc.\n` +
    `- If you cannot find the key section, look for a profile avatar or account menu that may contain "API Keys"\n` +
    `- If a new key must be generated (no existing key shown), click "Create", "Generate", or "New key", name it "SBEP", then read the value`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: object) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  void logEvent({
    userId,
    category: "browser",
    severity: "info",
    component: "credential-fetch",
    action: "start",
    message: `Credential fetch started: ${toolName} / ${credentialLabel} at ${platformUrl}`,
    metadata: { toolName, platformUrl },
  });

  let doneResult = "";

  try {
    for await (const event of runBrowserAgent(task, platformUrl, userId)) {
      send(event);
      if (event.type === "done") doneResult = event.result ?? "";
      if (event.type === "done" || event.type === "error") break;
    }

    if (doneResult) {
      // 1st pass — look for the sentinel the agent is instructed to emit
      const directMatch = doneResult.match(/CREDENTIAL_FOUND:\s*([^\n\r]+)/);
      if (directMatch?.[1]?.trim()) {
        send({ type: "credential_extracted", value: directMatch[1].trim() });
        void logEvent({ userId, category: "browser", severity: "info", component: "credential-fetch", action: "extracted", message: `Credential extracted for ${toolName} (direct match)`, metadata: { toolName } });
      } else {
        // 2nd pass — AI extraction from the full result text
        try {
          const extractResult = await complete({
            model: "openai/gpt-4o-mini",
            prompt:
              `You are extracting an API credential from a browser automation result.\n` +
              `Tool: ${toolName}\n` +
              `Credential type: ${credentialLabel}\n\n` +
              `Browser session result:\n${doneResult.slice(0, 4000)}\n\n` +
              `If you can see a clear API key, token, or credential value in the result above, output ONLY that raw value — no labels, no quotes, no explanation.\n` +
              `If no clear credential value is present, output exactly: NOT_FOUND`,
            userId,
          });
          const extracted = extractResult.content.trim().replace(/^["']|["']$/g, "");
          if (extracted && extracted !== "NOT_FOUND" && extracted.length > 3) {
            send({ type: "credential_extracted", value: extracted });
            void logEvent({ userId, category: "browser", severity: "info", component: "credential-fetch", action: "extracted", message: `Credential extracted for ${toolName} (AI parse)`, metadata: { toolName } });
          } else {
            send({
              type: "credential_not_found",
              message: `ASH couldn't locate the exact ${credentialLabel} on the page. Please copy it manually from your ${toolName} dashboard — it's usually under Settings → API Keys or Developer.`,
            });
          }
        } catch {
          send({
            type: "credential_not_found",
            message: `ASH completed the browser session but couldn't parse the credential. Please copy the ${credentialLabel} manually from ${toolName}.`,
          });
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Credential fetch failed";
    send({ type: "error", message: msg });
    void logEvent({ userId, category: "browser", severity: "error", component: "credential-fetch", action: "error", message: msg, metadata: { toolName } });
  } finally {
    clearInterval(keepAlive);
    send({ type: "end" });
    res.end();
  }
});

export default router;
