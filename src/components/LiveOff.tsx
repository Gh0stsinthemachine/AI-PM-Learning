import React from 'react';
import { useCapabilities } from '../runtime/capabilities';
import { classifySampleError } from '../runtime/sampleErrors';

/** Why live answers are not available, in plain English. Null when they are available. */
export function useLiveOffCopy(): string | null {
  const caps = useCapabilities();
  if (caps.sampleOff) return classifySampleError({ code: 'not_granted' }).copy;
  if (!caps.inViewer) return 'Live answers work when you open this page in claude.ai. Here you will see worked examples instead.';
  if (caps.sample.status === 'absent') return 'Live answers are not available in this view. You will see worked examples instead.';
  return null;
}

export function LiveOff(props: { children?: React.ReactNode }) {
  const copy = useLiveOffCopy();
  if (!copy) return null;
  return <p className="muted live-off" data-testid="live-off">{copy}{props.children}</p>;
}
