import { Router, type IRouter } from "express";
import { z } from "zod";

const router: IRouter = Router();

const ContactInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  subject: z.string().optional(),
  company: z.string().optional(),
});

// POST /api/contact
router.post("/contact", async (req, res) => {
  const parsed = ContactInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  // TODO: wire up email notification service
  req.log.info({ contact: parsed.data }, "Contact form submission received");

  return res.status(201).json({ success: true, message: "Thank you! We'll be in touch soon." });
});

export default router;
