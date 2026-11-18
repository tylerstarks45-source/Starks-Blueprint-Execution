import { Router, type IRouter } from "express";
import { getActiveCallerPayload } from "../lib/auth";
import { launchOptions } from "../lib/launch";

const router: IRouter = Router();

router.get("/launch-options", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  res.json({ options: await launchOptions(caller.id) });
});

export default router;
