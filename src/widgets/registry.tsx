import React from 'react';
import { TempSampler } from './TempSampler';
import { TokenWindow } from './TokenWindow';
import { PromptBuilder } from './PromptBuilder';
import { SelfCheck } from './SelfCheck';

// Interactive pieces by id (the `widget` field of each round in the manifest).
const WIDGETS: Record<string, () => React.ReactElement> = {
  'temp-sampler': TempSampler,
  'token-window': TokenWindow,
  'prompt-builder': PromptBuilder,
  'self-check': SelfCheck,
};

export function WidgetById(props: { id: string }) {
  const W = WIDGETS[props.id];
  if (!W) return <p className="muted">This interactive piece is opening soon.</p>;
  return <W />;
}

export const WIDGET_IDS = Object.keys(WIDGETS);
