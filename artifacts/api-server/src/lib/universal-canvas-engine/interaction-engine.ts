// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — Interaction Engine
// Mouse, keyboard, touch, clipboard, shortcuts, context menus
// ─────────────────────────────────────────────────────────────────────────────

export type KeyboardShortcutCategory = "selection" | "viewport" | "clipboard" | "history" | "alignment" | "layer" | "view";

export interface KeyboardShortcut {
  id:          string;
  keys:        string; // e.g. "Ctrl+Z"
  description: string;
  category:    KeyboardShortcutCategory;
  action:      string;
}

export const CANVAS_SHORTCUTS: KeyboardShortcut[] = [
  // Selection
  { id: "select-all",       keys: "Ctrl+A",       description: "Select all nodes",          category: "selection",  action: "select_all" },
  { id: "deselect",         keys: "Escape",        description: "Deselect all",              category: "selection",  action: "deselect_all" },
  { id: "delete",           keys: "Delete",        description: "Delete selected nodes",     category: "selection",  action: "delete_selection" },
  { id: "delete-alt",       keys: "Backspace",     description: "Delete selected nodes",     category: "selection",  action: "delete_selection" },
  // Clipboard
  { id: "copy",             keys: "Ctrl+C",        description: "Copy selection",            category: "clipboard",  action: "copy" },
  { id: "cut",              keys: "Ctrl+X",        description: "Cut selection",             category: "clipboard",  action: "cut" },
  { id: "paste",            keys: "Ctrl+V",        description: "Paste",                     category: "clipboard",  action: "paste" },
  { id: "duplicate",        keys: "Ctrl+D",        description: "Duplicate selection",       category: "clipboard",  action: "duplicate" },
  // History
  { id: "undo",             keys: "Ctrl+Z",        description: "Undo last operation",       category: "history",    action: "undo" },
  { id: "redo",             keys: "Ctrl+Shift+Z",  description: "Redo last undone op",       category: "history",    action: "redo" },
  { id: "redo-alt",         keys: "Ctrl+Y",        description: "Redo last undone op",       category: "history",    action: "redo" },
  // Viewport
  { id: "zoom-in",          keys: "Ctrl+=",        description: "Zoom in",                   category: "viewport",   action: "zoom_in" },
  { id: "zoom-out",         keys: "Ctrl+-",        description: "Zoom out",                  category: "viewport",   action: "zoom_out" },
  { id: "zoom-reset",       keys: "Ctrl+0",        description: "Reset zoom to 100%",        category: "viewport",   action: "zoom_reset" },
  { id: "zoom-fit",         keys: "Ctrl+Shift+H",  description: "Fit selection to viewport", category: "viewport",   action: "zoom_fit" },
  // Alignment
  { id: "align-left",       keys: "Alt+A",         description: "Align left",                category: "alignment",  action: "align_left" },
  { id: "align-right",      keys: "Alt+D",         description: "Align right",               category: "alignment",  action: "align_right" },
  { id: "align-top",        keys: "Alt+W",         description: "Align top",                 category: "alignment",  action: "align_top" },
  { id: "align-bottom",     keys: "Alt+S",         description: "Align bottom",              category: "alignment",  action: "align_bottom" },
  { id: "align-center-h",   keys: "Alt+H",         description: "Align center horizontal",   category: "alignment",  action: "align_center_h" },
  { id: "align-center-v",   keys: "Alt+V",         description: "Align center vertical",     category: "alignment",  action: "align_center_v" },
  // Layer
  { id: "bring-front",      keys: "Ctrl+]",        description: "Bring to front",            category: "layer",      action: "bring_to_front" },
  { id: "send-back",        keys: "Ctrl+[",        description: "Send to back",              category: "layer",      action: "send_to_back" },
  { id: "group",            keys: "Ctrl+G",        description: "Group selection",           category: "layer",      action: "group" },
  { id: "ungroup",          keys: "Ctrl+Shift+G",  description: "Ungroup",                   category: "layer",      action: "ungroup" },
];

export type ContextMenuItemCategory = "edit" | "arrange" | "clipboard" | "view" | "layer";

export interface ContextMenuItem {
  id:       string;
  label:    string;
  action:   string;
  shortcut?: string;
  category: ContextMenuItemCategory;
  divider?: boolean;
}

export const CONTEXT_MENU_ITEMS: ContextMenuItem[] = [
  { id: "copy",         label: "Copy",          action: "copy",         shortcut: "Ctrl+C", category: "clipboard" },
  { id: "cut",          label: "Cut",           action: "cut",          shortcut: "Ctrl+X", category: "clipboard" },
  { id: "paste",        label: "Paste",         action: "paste",        shortcut: "Ctrl+V", category: "clipboard" },
  { id: "duplicate",    label: "Duplicate",     action: "duplicate",    shortcut: "Ctrl+D", category: "clipboard", divider: true },
  { id: "delete",       label: "Delete",        action: "delete",       shortcut: "Delete", category: "edit",      divider: true },
  { id: "bring-front",  label: "Bring to Front",action: "bring_to_front", shortcut: "Ctrl+]", category: "layer" },
  { id: "send-back",    label: "Send to Back",  action: "send_to_back", shortcut: "Ctrl+[", category: "layer" },
  { id: "group",        label: "Group",         action: "group",        shortcut: "Ctrl+G", category: "layer" },
  { id: "ungroup",      label: "Ungroup",       action: "ungroup",      shortcut: "Ctrl+Shift+G", category: "layer" },
  { id: "align",        label: "Align…",        action: "open_align",   category: "arrange" },
  { id: "distribute",   label: "Distribute…",   action: "open_distribute", category: "arrange" },
];

export function getShortcutsForCategory(category: KeyboardShortcutCategory): KeyboardShortcut[] {
  return CANVAS_SHORTCUTS.filter((s) => s.category === category);
}

export function getShortcutByKeys(keys: string): KeyboardShortcut | undefined {
  return CANVAS_SHORTCUTS.find((s) => s.keys.toLowerCase() === keys.toLowerCase());
}

export function resolveAction(keys: string): string | null {
  return getShortcutByKeys(keys)?.action ?? null;
}
