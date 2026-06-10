---
name: BuilderPage 3-panel layout
description: How the Replit-style 3-panel builder layout works — panels, states, key patterns
---

## Layout (as of June 2026)

Three panels inside `<div className="flex flex-1 min-h-0">`:
- **LEFT (260px)**: Sessions-as-tasks list + agent modes popup at bottom. States: `showAgentModes`, `rightPanel` (unused here), standard session/phase states.
- **CENTER (flex-1)**: ASH chat messages + build terminal (h-52 slidedown). All the existing chat/credential/loading states.  
- **RIGHT (240px)**: Library — tabs: blueprints / tools / apps(file tree). State: `rightPanel = 'blueprints'|'tools'|'files'`.

## Agent modes panel
Lives at the bottom of LEFT panel. Toggle button shows current `aiMode` label + icon. Panel uses `AnimatePresence` height:0→auto slide. Contains: mode tabs (AI_MODES array), toggles (App testing, High effort, Turbo-locked), business type grid (BUSINESS_TYPES.slice(0,4)), revenue goal input.

**Why:** Replit puts agent config at the bottom of the task list panel — keeps the center area clean for agent output.

## File truncation fix
When replacing a large layout block, the old_string in `edit` replaces only the matched portion — if the old file had MORE content after the match, it stays appended. Fix: `head -n <correct_line> file > /tmp/clean && cp /tmp/clean file`, then restart the web workflow to clear Vite's HMR cache.

**Why:** edit tool inserts new_string where old_string was found but does NOT delete anything after the matched region.
