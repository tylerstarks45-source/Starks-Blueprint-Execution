const MAX_DISPLAY = 40;
const MAX_NOTICES = 20;
const MAX_CONTEXT = 20;
const MAX_TEXT = 8000;
const keyFor = (ownerId) => `ash_conversation_${ownerId}`;
const legacyKeyFor = (ownerId) => `ash_dock_${ownerId}`;

export function appendEntry(log, entry) {
  const isNotice = (item) => item.role === 'system';
  const notice = isNotice(entry);
  const limit = notice ? MAX_NOTICES : MAX_DISPLAY;
  let count = 0;
  return [...log, entry].reverse().filter((item) => isNotice(item) !== notice || ++count <= limit).reverse();
}

function textEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.slice(-MAX_DISPLAY * 2).flatMap((entry) => {
    const role = entry?.role === 'assistant' ? 'ash' : entry?.role;
    const text = entry?.text ?? entry?.content;
    if ((role !== 'user' && role !== 'ash') || typeof text !== 'string' || !text.trim() || entry.error) return [];
    return [{ role, text: text.slice(0, MAX_TEXT), voice: entry.voice === true }];
  }).slice(-MAX_DISPLAY);
}

export function restoreLog(ownerId) {
  if (!ownerId) return [];
  try {
    const own = sessionStorage.getItem(keyFor(ownerId));
    const entries = textEntries(JSON.parse(own ?? localStorage.getItem(legacyKeyFor(ownerId)) ?? '[]'));
    return entries.map((entry, i) => ({ id: `saved-${i}`, ...entry }));
  } catch {
    return [];
  }
}

export function saveLog(ownerId, entries) {
  if (!ownerId) return;
  try {
    sessionStorage.setItem(keyFor(ownerId), JSON.stringify(textEntries(entries)));
  } catch { /* Storage disabled or full. */ }
}

export function clearLog(ownerId) {
  if (!ownerId) return;
  saveLog(ownerId, []);
  try { localStorage.removeItem(legacyKeyFor(ownerId)); } catch { /* Storage unavailable. */ }
}

export function historyForTurn(entries) {
  return textEntries(entries).slice(-MAX_CONTEXT).map(({ role, text }) => ({
    role: role === 'ash' ? 'assistant' : role, content: text,
  }));
}
