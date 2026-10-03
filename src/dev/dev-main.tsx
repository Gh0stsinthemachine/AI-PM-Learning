// Dev-server entry only. It is NOT part of the production bundle (the build
// entry is src/main.tsx), so nothing here can reach the published artifact.
// Add ?stub to the dev URL to install the fake window.claude from tests/stub.
import React from 'react';
import ReactDOM from 'react-dom/client';

(window as unknown as { React: unknown; ReactDOM: unknown }).React = React;
(window as unknown as { React: unknown; ReactDOM: unknown }).ReactDOM = ReactDOM;

async function boot() {
  if (location.search.includes('stub')) {
    const stub = await import('../../tests/stub/claude-stub.js?raw');
    // eslint-disable-next-line no-new-func
    new Function(stub.default)();
  }
  await import('../main');
}
void boot();
