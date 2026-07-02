---
name: Mobile card layout conversion for fixed-column grids
description: How to convert a desktop fixed-column grid row (e.g. grid-cols-[1fr_auto_auto_...]) into a mobile card layout without losing columns that were hidden on mobile.
---

Fixed multi-column grids (`grid-cols-[1fr_auto_auto_auto_auto_auto_auto]`) that hide some columns below a breakpoint (`hidden sm:flex`, `hidden md:flex`) to "fit" on mobile are a common source of mobile/desktop **parity** gaps — the hidden columns (timestamps, revenue, secondary metadata) are real information the user can't see on mobile at all, not just a layout squeeze.

**Why:** A full mobile/desktop parity audit surfaced `SystemsListPage.jsx`'s row grid: at <640px the "Updated" and "Revenue" columns disappeared, and remaining always-visible columns (status badge, a `w-[76px]` rebuild-button-or-spacer, View button, overflow menu) ate nearly all card width, squeezing the primary "name" column to near-zero.

**How to apply:** Don't just hide columns — restructure the row container itself: `flex flex-col gap-3 sm:grid sm:grid-cols-[...] sm:items-center sm:gap-4`. Group related cells with `sm:contents` wrapper divs so the same JSX renders as stacked mobile groups (name+badge row, metadata row, actions row) but reverts to the original grid on `sm:` and up. Make previously-hidden metadata visible on mobile (drop the `hidden sm:flex` etc.) since parity requires the info be visible somewhere, just reflowed. If the container also has a desktop-only header row with sort buttons (`hidden` below `sm`), add a mobile-specific sort control (chip row) so sort functionality isn't lost when the header disappears.
