// Rough token estimate: about 4 characters of ordinary English per token.
// It is an estimate only (the real count depends on the model's tokenizer, and
// code and non-English text usually need more tokens), so the UI always shows "≈".
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Cost in dollars for `tokens` at `dollarsPerMillion`. Bad inputs count as 0. */
export function tokenCost(tokens: number, dollarsPerMillion: number): number {
  const t = Number.isFinite(tokens) && tokens > 0 ? tokens : 0;
  const p = Number.isFinite(dollarsPerMillion) && dollarsPerMillion > 0 ? dollarsPerMillion : 0;
  return (t * p) / 1_000_000;
}
