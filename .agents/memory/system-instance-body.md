---
name: System instance creation body
description: POST /api/system-instances requires userId even though the server injects it from JWT too
---

The `CreateSystemInstanceBody` Zod schema has `userId` as a required `zod.number()` field.
The route also calls `requireAuthActive` and injects userId server-side, but the schema validation runs first.

**Why:** The generated Zod schema from openapi.yaml marks userId as required, so sending a body without it causes a 400 before the server-side injection can help.

**How to apply:** Always include `userId: currentUser.id` when calling `POST /api/system-instances` from any frontend component. Required fields: `{ blueprintId, name, userId }`.
