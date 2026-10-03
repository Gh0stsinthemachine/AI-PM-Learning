import { defineConfig } from 'vitest/config';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { remarkGuard } from './build/remark-guard.mjs';
import { MDX_COMPONENTS } from './src/mdx/names';

// The production build is a single IIFE. React and ReactDOM stay external:
// the page loads them from cdnjs as UMD globals (React 18.3.1 is the last
// version that ships a UMD build). build/assemble.mjs then inlines the bundle
// into dist/artifact/index.html (the claude.ai Artifact fragment) and
// dist/web/index.html (a full document for tests and a later Vercel deploy).
export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        jsxRuntime: 'classic',
        pragma: 'React.createElement',
        pragmaFrag: 'React.Fragment',
        pragmaImportSource: 'react',
        development: false,
        remarkPlugins: [remarkGfm, [remarkGuard, { allowed: [...MDX_COMPONENTS] }]],
      }),
    },
  ],
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: 'dist/.bundle',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: false,
    lib: {
      entry: 'src/main.tsx',
      formats: ['iife'],
      name: 'AIPM102',
      fileName: () => 'app.js',
      cssFileName: 'app',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' },
        interop: 'default',
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/content/**/*.test.ts'],
    environment: 'node',
  },
});
