import type { ComponentType } from 'react';

// Which rounds have written content yet. Rounds without a file show "Opening soon" on the map.
type Mdx = ComponentType<{ components?: Record<string, ComponentType<any>> }>;

const modules = import.meta.glob<{ default: Mdx }>('./rounds/*.mdx', { eager: true });

const byId: Record<string, Mdx> = {};
for (const [path, mod] of Object.entries(modules)) {
  const m = /\/(r\d\d)-[^/]+\.mdx$/.exec(path);
  if (m) byId[m[1]!] = mod.default;
}

export function roundContent(id: string): Mdx | undefined {
  return byId[id];
}

export function isReady(id: string): boolean {
  return byId[id] !== undefined;
}
