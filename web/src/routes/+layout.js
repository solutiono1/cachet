// Static site: every route is prerendered and runs entirely in the browser.
// There is no Cachet server. The app talks to NEAR RPC directly.
export const prerender = true;
export const ssr = true;
export const trailingSlash = 'always';
