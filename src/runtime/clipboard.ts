// navigator.clipboard.writeText works only inside a click handler, and some app views
// refuse it. Call this from the click, and fall back to selecting the text.
export async function copyText(text: string, fallbackEl?: HTMLTextAreaElement | HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackEl) {
      fallbackEl.focus();
      fallbackEl.select();
    }
    return false;
  }
}
