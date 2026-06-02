import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

app.use("/api", router);

export default app;
