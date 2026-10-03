// Pace math. A week runs Monday to Sunday in the viewer's local time.

export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}

export function addWeeks(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + 7 * n);
  return x;
}

/** Rounds finished in the same Monday-to-Sunday week as `now`. */
export function doneThisWeek(completions: readonly number[], now: Date): number {
  const start = weekStart(now).getTime();
  const end = addWeeks(weekStart(now), 1).getTime();
  return completions.filter((t) => t >= start && t < end).length;
}

/**
 * The pace to plan with. With two or more full weeks of history it is the average
 * over the last (up to) three full weeks, never below 0.5 a week. Otherwise it is
 * the pace Tom chose.
 */
export function effectivePace(planned: number, completions: readonly number[], now: Date): number {
  if (completions.length === 0) return planned;
  const first = weekStart(new Date(Math.min(...completions)));
  const thisWeek = weekStart(now);
  const fullWeeks = Math.round((thisWeek.getTime() - first.getTime()) / (7 * 86400000));
  if (fullWeeks < 2) return planned;
  const n = Math.min(3, fullWeeks);
  let total = 0;
  for (let i = 1; i <= n; i++) {
    const s = addWeeks(thisWeek, -i).getTime();
    const e = addWeeks(thisWeek, -i + 1).getTime();
    total += completions.filter((t) => t >= s && t < e).length;
  }
  return Math.max(0.5, total / n);
}

/**
 * Monday of the week in which the course is projected to finish.
 * What is left this week fills the weekly quota first; the rest takes whole weeks.
 */
export function projectFinishWeek(args: {
  total: number;
  done: number;
  perWeek: number;
  doneThisWeek: number;
  now: Date;
}): Date {
  const remaining = Math.max(0, args.total - args.done);
  const week = weekStart(args.now);
  if (remaining === 0) return week;
  const perWeek = Math.max(0.5, args.perWeek);
  const capacityLeft = Math.max(0, perWeek - args.doneThisWeek);
  if (remaining <= capacityLeft) return week;
  const extraWeeks = Math.ceil((remaining - capacityLeft) / perWeek);
  return addWeeks(week, extraWeeks);
}

export function formatWeekOf(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
