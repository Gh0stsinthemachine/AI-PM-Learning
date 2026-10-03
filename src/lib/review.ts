// Picks warm-up questions from rounds finished earlier (spaced review).
// Deterministic: the same inputs always give the same questions.

export interface Candidate {
  id: string;
  round: number;
}
export interface MissRecord {
  missed: number;
  seen: number;
  lastSeenRound?: number;
}

/**
 * Prefers questions Tom missed (higher miss ratio first), then ones not seen for the
 * longest. A question shown within the last `cooldown` rounds is skipped unless there
 * are not enough others. Questions come from different rounds where possible.
 */
export function pickWarmup(args: {
  candidates: readonly Candidate[];
  records: Readonly<Record<string, MissRecord>>;
  currentRound: number;
  count?: number;
  cooldown?: number;
}): Candidate[] {
  const count = args.count ?? 2;
  const cooldown = args.cooldown ?? 3;
  const eligible = args.candidates.filter((c) => c.round < args.currentRound);
  const rank = (c: Candidate) => {
    const r = args.records[c.id];
    const ratio = r && r.seen > 0 ? r.missed / r.seen : 0;
    const lastSeen = r?.lastSeenRound ?? -1;
    return { ratio, lastSeen, c };
  };
  const order = (a: ReturnType<typeof rank>, b: ReturnType<typeof rank>) =>
    b.ratio - a.ratio || a.lastSeen - b.lastSeen || a.c.round - b.c.round || (a.c.id < b.c.id ? -1 : a.c.id > b.c.id ? 1 : 0);

  const fresh = eligible.filter((c) => args.currentRound - (args.records[c.id]?.lastSeenRound ?? -Infinity) >= cooldown).map(rank).sort(order);
  const stale = eligible.filter((c) => args.currentRound - (args.records[c.id]?.lastSeenRound ?? -Infinity) < cooldown).map(rank).sort(order);

  const picked: Candidate[] = [];
  const usedRounds = new Set<number>();
  for (const pool of [fresh, stale]) {
    for (const r of pool) {
      if (picked.length >= count) break;
      if (!usedRounds.has(r.c.round)) {
        picked.push(r.c);
        usedRounds.add(r.c.round);
      }
    }
    for (const r of pool) {
      if (picked.length >= count) break;
      if (!picked.includes(r.c)) picked.push(r.c);
    }
    if (picked.length >= count) break;
  }
  return picked;
}
