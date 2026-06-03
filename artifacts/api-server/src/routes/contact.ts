import { Router, type IRouter } from "express";
import { z } from "zod";
import { sendContactNotification } from "../lib/email";

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

  req.log.info({ contact: { email: parsed.data.email, subject: parsed.data.subject } }, "Contact form submission received");
  sendContactNotification(parsed.data).catch(() => {});

  return res.status(201).json({ success: true, message: "Thank you! We'll be in touch soon." });
});

export default router;
