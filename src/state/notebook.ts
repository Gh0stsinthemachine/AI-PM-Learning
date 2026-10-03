import { stableStringify } from '../lib/stableStringify';

// The notebook holds what Tom types: round takeaways, reflections, form drafts.
// Entries are capped so the document stays far below the 256 KiB store limit.

export const ENTRY_MAX_CHARS = 3000;

export interface NoteEntry { text: string; t: number }
export type FormValue = string | boolean | string[];
export interface FormRecord { fields: Record<string, FormValue>; t: number }

export interface Notebook {
  v: 1;
  resetAt?: number;
  entries: Record<string, NoteEntry>;
  forms: Record<string, FormRecord>;
}

export function emptyNotebook(): Notebook {
  return { v: 1, entries: {}, forms: {} };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

export function migrateNotebook(raw: unknown): { state: Notebook; readOnly: boolean } {
  if (!isObj(raw)) return { state: emptyNotebook(), readOnly: false };
  if (typeof raw.v === 'number' && raw.v > 1) return { state: emptyNotebook(), readOnly: true };
  const n = emptyNotebook();
  if (typeof raw.resetAt === 'number') n.resetAt = raw.resetAt;
  if (isObj(raw.entries)) {
    for (const [k, v] of Object.entries(raw.entries)) {
      if (isObj(v) && typeof v.text === 'string') n.entries[k] = { text: v.text.slice(0, ENTRY_MAX_CHARS), t: num(v.t) };
    }
  }
  if (isObj(raw.forms)) {
    for (const [k, v] of Object.entries(raw.forms)) {
      if (isObj(v) && isObj(v.fields)) {
        const fields: Record<string, FormValue> = {};
        for (const [fk, fv] of Object.entries(v.fields)) {
          if (typeof fv === 'string') fields[fk] = fv.slice(0, ENTRY_MAX_CHARS);
          else if (typeof fv === 'boolean') fields[fk] = fv;
          else if (Array.isArray(fv) && fv.every((x) => typeof x === 'string')) fields[fk] = fv as string[];
        }
        n.forms[k] = { fields, t: num(v.t) };
      }
    }
  }
  return { state: prune(n), readOnly: false };
}

function prune(n: Notebook, resetAt: number | undefined = n.resetAt): Notebook {
  const r = resetAt;
  if (r === undefined) return n;
  const keep = <T extends { t: number }>(m: Record<string, T>) => Object.fromEntries(Object.entries(m).filter(([, v]) => v.t >= r));
  return { ...n, resetAt: r, entries: keep(n.entries), forms: keep(n.forms) };
}

function lww<T extends { t: number }>(a: T, b: T): T {
  if (a.t !== b.t) return a.t > b.t ? a : b;
  return stableStringify(a) >= stableStringify(b) ? a : b;
}

function mergeMap<T extends { t: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k];
    const y = b[k];
    out[k] = x === undefined ? (y as T) : y === undefined ? x : lww(x, y);
  }
  return out;
}

export function mergeNotebook(a0: Notebook, b0: Notebook): Notebook {
  const resetAt = a0.resetAt === undefined ? b0.resetAt : b0.resetAt === undefined ? a0.resetAt : Math.max(a0.resetAt, b0.resetAt);
  const a = prune(a0, resetAt);
  const b = prune(b0, resetAt);
  const out: Notebook = { v: 1, entries: mergeMap(a.entries, b.entries), forms: mergeMap(a.forms, b.forms) };
  if (resetAt !== undefined) out.resetAt = resetAt;
  return prune(out);
}

export function setEntry(n: Notebook, key: string, text: string, now: number): Notebook {
  const clipped = text.slice(0, ENTRY_MAX_CHARS);
  if (n.entries[key]?.text === clipped) return n;
  return { ...n, entries: { ...n.entries, [key]: { text: clipped, t: now } } };
}

export function setForm(n: Notebook, key: string, fields: Record<string, FormValue>, now: number): Notebook {
  if (stableStringify(n.forms[key]?.fields) === stableStringify(fields)) return n;
  return { ...n, forms: { ...n.forms, [key]: { fields, t: now } } };
}

export function resetNotebook(now: number): Notebook {
  return { ...emptyNotebook(), resetAt: now };
}
