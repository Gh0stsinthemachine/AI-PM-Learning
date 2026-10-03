// Single source of truth for every external URL the page is allowed to load.
// The Artifact CSP admits scripts only from cdnjs (and a few other CDNs) and
// stylesheets only from Google Fonts. Anything else is blocked silently.
export const TITLE = 'AI PM 102';

export const REACT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js';
export const REACT_DOM_URL = 'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js';

export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600' +
  '&family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,600;0,700;1,400' +
  '&family=Barlow+Condensed:wght@500;600;700&display=swap';

export const ALLOWED_EXTERNAL = new Set([
  REACT_URL,
  REACT_DOM_URL,
  FONTS_HREF,
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]);
