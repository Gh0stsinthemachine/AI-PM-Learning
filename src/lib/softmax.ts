// Temperature sampling over toy scores.
// p_i = exp((z_i - max z) / T) / sum_j exp((z_j - max z) / T)
// Subtracting max z keeps exp() from overflowing for large scores.

export const MIN_TEMPERATURE = 0.05;

export function softmax(scores: readonly number[], temperature: number): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  if (temperature < MIN_TEMPERATURE) {
    // Effectively zero: always the top word. Ties go to the lowest index.
    const top = scores.indexOf(max);
    return scores.map((_, i) => (i === top ? 1 : 0));
  }
  const exps = scores.map((z) => Math.exp((z - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Inverse-CDF sampling. `u` is a uniform number in [0, 1).
export function sampleIndex(probs: readonly number[], u: number): number {
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i] ?? 0;
    if (u < acc) return i;
  }
  // Floating-point drift can leave u past the end: return the last word with any probability.
  for (let i = probs.length - 1; i >= 0; i--) if ((probs[i] ?? 0) > 0) return i;
  return 0;
}
