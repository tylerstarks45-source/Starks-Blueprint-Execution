---
name: Notification ID key collisions
description: Why React lists rendering notifications must not key on the raw notification id alone.
---

# Notification id key collisions

Notification records can share an `id` value (the ids are millisecond-timestamp-based and two rows
created in the same millisecond collide). Rendering a list with `key={n.id}` then triggers React's
"Encountered two children with the same key" warning and risks dropped/duplicated rows.

**Why:** the dashboard's Credits & Alerts panel showed this warning under real data because two
notifications shared a timestamp id.

**How to apply:** when mapping notifications (or any timestamp-id'd collection) to JSX, combine the
id with the array index, e.g. `key={`${n.id}-${i}`}`, rather than keying on the id alone.
