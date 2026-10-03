// localStorage is only a per-viewer convenience: every access is wrapped,
// because it can throw or come back empty (private windows, blocked storage).
const NS = 'aipm102.v1.';

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(NS + key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(NS + key, value);
    return true;
  } catch {
    return false;
  }
}

export function storageDel(key: string): void {
  try {
    window.localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}
