import { Router, type IRouter } from "express";
import { requireAuthActive } from "../lib/auth";
import { runBrowserAgent } from "../lib/browser/agent";
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

export default router;
