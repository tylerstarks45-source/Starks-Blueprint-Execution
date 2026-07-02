---
name: Shared modal/table responsive patterns
description: How Dialog/AlertDialog/Sheet and tables handle small-screen height/width overflow in artifacts/web
---

The shared UI primitives in `artifacts/web/src/components/ui/` (`dialog.jsx`, `alert-dialog.jsx`,
`sheet.jsx`, `table.jsx`) are the single place that controls small-screen overflow behavior for
every modal/table in the app. Fix issues there instead of patching individual pages.

- `DialogContent` / `AlertDialogContent` carry `max-h-[90vh] overflow-y-auto` in their base
  className. This keeps forms scrollable and reachable when the on-screen keyboard shrinks the
  viewport on phones. Any page that overrides `className` with something like `overflow-hidden`
  should keep a `max-h-*` on the same element or nest its own scrollable child — otherwise content
  taller than the dialog gets clipped instead of scrolling.
- `sheetVariants` (side sheets/drawers) has `overflow-y-auto` on the base variant and
  `max-h-[85vh]` on the `top`/`bottom` variants specifically (the `left`/`right` variants already
  span full height via `h-full`, so they don't need a separate cap).
- `Table` (`ui/table.jsx`) already wraps `<table>` in a `div.overflow-auto` — this is the
  established "contained horizontal scroll below `md`" pattern for tabular data. Any raw
  `<table>` written directly in a page (bypassing the shared component) must be wrapped the same
  way: `<div className="overflow-x-auto">...<table className="min-w-[Npx]">`. `DeveloperPage.jsx`
  had two raw tables missing this wrapper — always grep for `<table` when auditing new pages.

**Why:** these are the highest-leverage fix points — a single change here propagates responsive
correctness to every page using Dialog/AlertDialog/Sheet/Table without needing per-page patches.

**How to apply:** when doing a responsive audit or building a new modal/table, check these shared
components first. If a page-specific modal doesn't use `Dialog`/`AlertDialog` (custom
`fixed inset-0` markup), it needs its own `max-h-[90vh] overflow-y-auto` on the content panel.
