import React from 'react';

// Hash routing. The Artifact passes through only a bare #token (letters, digits . _ ~ -),
// never #key=value and never a query string, so every route is one token.
export type Route =
  | { name: 'home' }
  | { name: 'round'; id: string }
  | { name: 'journey' }
  | { name: 'about' };

export function parseHash(hash: string): Route {
  const t = hash.replace(/^#/, '');
  if (t === 'journey') return { name: 'journey' };
  if (t === 'about') return { name: 'about' };
  const m = /^r(0[1-9]|1\d|2[0-9])$/.exec(t);
  if (m && Number(m[1]) <= 29) return { name: 'round', id: t };
  return { name: 'home' };
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'round': return '#' + r.id;
    case 'journey': return '#journey';
    case 'about': return '#about';
    default: return '#home';
  }
}

export function useRoute(): Route {
  const [route, setRoute] = React.useState<Route>(() => parseHash(window.location.hash));
  React.useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
