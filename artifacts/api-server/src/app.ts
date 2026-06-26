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

// Capture raw body for Stripe webhook signature verification
app.use((req, _res, next) => {
  if (req.path === "/api/stripe/webhook") {
    let data = Buffer.alloc(0);
    req.on("data", (chunk: Buffer) => { data = Buffer.concat([data, chunk]); });
    req.on("end", () => { (req as any).rawBody = data; next(); });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate X-API-Key before routing — injects req.apiKeyCaller, enforces
// rate limits, and writes usage events. Must run before the route handlers.
app.use("/api", apiKeyMiddleware);

app.use("/api", router);

export default app;
