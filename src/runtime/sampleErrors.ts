// Turns a rejected `sample` call into plain-English copy and one behaviour:
//   silent  the viewer did it (Stop). No message.
//   hide    live answers are off for this visit. Hide every live control.
//   tools   only the live agent is unavailable. Everything else still works.
//   tell    show the message and keep the control. Never retry by itself.
//   bug     the page called it wrong. Log it and say so.
export type SampleErrorKind = 'silent' | 'hide' | 'tools' | 'tell' | 'bug';

export interface ClassifiedError {
  kind: SampleErrorKind;
  code: string;
  copy: string;
}

export const KNOWN_CODES = [
  'invalid_request', 'prompt_too_large', 'images_unavailable', 'tools_unavailable', 'image_rejected',
  'cancelled', 'not_granted', 'session_expired', 'sampling_disabled', 'not_declared', 'rate_limited',
  'refused', 'empty_completion', 'invalid_json', 'upstream_error', 'capability_disabled',
  'capability_removed', 'transform_error', 'queue_overflow',
] as const;

const COPY: Record<string, { kind: SampleErrorKind; copy: string }> = {
  cancelled: { kind: 'silent', copy: 'Stopped.' },
  not_granted: {
    kind: 'hide',
    copy: 'Live answers are off for this visit. Everything else still works. You can turn them on from this page’s Permissions menu.',
  },
  sampling_disabled: { kind: 'hide', copy: 'Live answers are not available on this account. You will see worked examples instead.' },
  not_declared: { kind: 'hide', copy: 'Live answers are not available here. You will see worked examples instead.' },
  capability_disabled: { kind: 'hide', copy: 'Live answers are not available in this view. You will see worked examples instead.' },
  capability_removed: { kind: 'hide', copy: 'Live answers are not available in this view. You will see worked examples instead.' },
  images_unavailable: { kind: 'tell', copy: 'This view cannot send images.' },
  tools_unavailable: { kind: 'tools', copy: 'This view cannot run the live agent, so here is a step-by-step replay instead.' },
  rate_limited: { kind: 'tell', copy: 'You have hit a usage limit or sent several requests quickly. Wait a minute, then try again.' },
  session_expired: { kind: 'tell', copy: 'Your Claude session expired. Sign in again, then try again.' },
  refused: { kind: 'tell', copy: 'Claude declined this request. Try rewording it.' },
  empty_completion: { kind: 'tell', copy: 'Claude returned an empty answer. Try a shorter or simpler request.' },
  invalid_json: { kind: 'tell', copy: 'The answer came back in an unexpected format. Try again.' },
  image_rejected: { kind: 'tell', copy: 'That image could not be used. Pick a different file.' },
  prompt_too_large: { kind: 'tell', copy: 'That is too long for one request. Shorten it and try again.' },
  upstream_error: { kind: 'tell', copy: 'Could not reach Claude. Your text is still here. Try again in a moment.' },
  invalid_request: { kind: 'bug', copy: 'This feature hit a bug on the page.' },
  transform_error: { kind: 'bug', copy: 'This feature hit a bug on the page.' },
  queue_overflow: { kind: 'bug', copy: 'This feature hit a bug on the page.' },
};

export function classifySampleError(e: unknown): ClassifiedError {
  const code = typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : 'upstream_error';
  // Unknown codes are treated as upstream_error, as the platform documents.
  const entry = COPY[code] ?? COPY.upstream_error!;
  const copy = entry.kind === 'bug' ? `${entry.copy} (code: ${code})` : entry.copy;
  return { kind: entry.kind, code, copy };
}

/** Partial text worth keeping on screen after a failure. */
export function partialText(e: unknown): string {
  return typeof e === 'object' && e !== null && typeof (e as { text?: unknown }).text === 'string' ? (e as { text: string }).text : '';
}
