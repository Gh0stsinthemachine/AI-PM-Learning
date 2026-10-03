// Saving a file the viewer asked for. Three situations:
//  - inside claude.ai with the downloads capability: ask the platform to save it
//  - inside claude.ai without it: show the text so it can be copied
//  - on the open web (for example Vercel): a normal Blob download
export type SaveResult = 'saved' | 'declined' | 'busy' | 'show-text' | 'failed';

export async function saveText(
  api: typeof Claude.downloads | null,
  inViewer: boolean,
  filename: string,
  text: string,
): Promise<SaveResult> {
  if (api) {
    try {
      await api.save({ filename, data: text });
      return 'saved';
    } catch (e) {
      const code = typeof e === 'object' && e !== null ? (e as { code?: string }).code : undefined;
      if (code === 'declined') return 'declined';
      if (code === 'rate_limited') return 'busy';
      return 'show-text';
    }
  }
  if (inViewer) return 'show-text';
  try {
    const blob = new Blob([text], { type: filename.endsWith('.json') ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'saved';
  } catch {
    return 'show-text';
  }
}
