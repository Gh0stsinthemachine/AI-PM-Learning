/// <reference types="vite/client" />
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const MDXContent: ComponentType<{ components?: Record<string, ComponentType<any>> }>;
  export default MDXContent;
}
declare module '*?raw' {
  const content: string;
  export default content;
}
