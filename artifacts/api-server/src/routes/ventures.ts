import { Router, type IRouter } from "express";
import { z } from "zod";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { getVenture, addExpense, deleteExpense, setTeamMemberStatus, EXPENSE_CATEGORIES } from "../lib/ventures";
import { ownedBusinessIds } from "../lib/empire/assets";

const router: IRouter = Router();
const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const ExpenseBody = z.object({
  amountCents: z.number().int().positive().max(100_000_000),
  category: z.enum(EXPENSE_CATEGORIES).default("other"),
  description: z.string().trim().min(1).max(300),
  occurredAt: z.coerce.date().optional(),
  streamId: z.number().int().positive().nullable().optional(),
});

router.get("/empire/businesses/:id/venture", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  const v = id ? await getVenture(caller.id, id) : null;
  if (!v) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(v));
});

router.post("/empire/businesses/:id/expenses", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  if (!id) { res.status(404).json({ error: "Not found" }); return; }
  const body = ExpenseBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }); return; }
  const r = await addExpense(caller.id, id, body.data);
  if ("error" in r) { res.status(r.status ?? 400).json({ error: r.error }); return; }
  res.status(201).json(serialize(r.expense));
});

router.delete("/empire/businesses/:id/expenses/:expenseId", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  const eid = idOf(req.params["expenseId"]);
  const r = id && eid ? await deleteExpense(caller.id, id, eid) : null;
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

router.post("/empire/businesses/:id/team/:role", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const id = idOf(req.params["id"]);
  const status = (req.body as { status?: unknown } | undefined)?.status;
  if (status !== "active" && status !== "paused") { res.status(400).json({ error: "status must be active or paused" }); return; }
  if (!id || !(await ownedBusinessIds(caller.id, [id])).has(id)) { res.status(404).json({ error: "Not found" }); return; }
  const r = await setTeamMemberStatus(caller.id, id, String(req.params["role"]), status);
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(r));
});

export default router;
