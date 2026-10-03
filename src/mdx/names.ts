// The only components a round (MDX file) may use. The remark guard in
// build/remark-guard.mjs enforces this list at build time; the registry in
// src/mdx/registry.tsx maps each name to a React component.
export const MDX_COMPONENTS = [
  'Term',
  'Widget',
  'Figure',
  'Callout',
  'LastChecked',
  'Sources',
] as const;

export type MdxComponentName = (typeof MDX_COMPONENTS)[number];
