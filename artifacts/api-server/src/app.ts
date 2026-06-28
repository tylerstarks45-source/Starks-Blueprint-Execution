import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiKeyMiddleware } from "./middlewares/apiKey";

const app: Express = express();

// Replit routes through a reverse proxy — trust the X-Forwarded-For header so
// rate limiters and IP-based logic see the real client IP instead of the proxy.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// Capture raw body for webhook signature verification (Stripe + SendGrid).
// Also manually parses JSON so req.body is still available in route handlers
// (the readable stream can only be consumed once, so express.json() would see an empty body).
const RAW_BODY_PATHS = new Set(["/api/stripe/webhook", "/api/email/webhooks/sendgrid", "/api/webhooks/sendgrid"]);
app.use((req, _res, next) => {
  if (RAW_BODY_PATHS.has(req.path)) {
    let data = Buffer.alloc(0);
    req.on("data", (chunk: Buffer) => { data = Buffer.concat([data, chunk]); });
    req.on("end", () => {
      (req as any).rawBody = data;
      if (data.length > 0) {
        try { req.body = JSON.parse(data.toString("utf8")); } catch { req.body = {}; }
      } else {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// /api/ash/* → /api/ai-orchestrator/* URL alias so external callers can use either path.
// Must run before the API key middleware and router so both paths are authenticated equally.
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/ash/")) {
    req.url = req.url.replace("/api/ash/", "/api/ai-orchestrator/");
  }
  next();
});

// Validate X-API-Key before routing — injects req.apiKeyCaller, enforces
// rate limits, and writes usage events. Must run before the route handlers.
app.use("/api", apiKeyMiddleware);

app.use("/api", router);

export default app;
