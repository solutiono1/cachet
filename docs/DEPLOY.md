# Deploying Cachet

Cachet is a static site. There is no server to run, no database to provision
and no secret to configure, so hosting it is copying a folder. These are the
settings for Cloudflare Pages, which is what the live site runs on.

## What gets built

```
cd web
npm install
npm run build        # writes web/dist
```

`web/dist` is the whole site, about 1.4 MB. Every route is prerendered to its
own `index.html`, so no rewrite rule or SPA fallback is needed:

```
dist/index.html          the landing page
dist/new/index.html      create a pay link
dist/pay/index.html      pay an invoice
dist/app/index.html      your envelopes
dist/prove/index.html    build a proof
dist/verify/index.html   check a proof
dist/privacy/index.html  privacy and terms
dist/settings/index.html settings
dist/_headers            response headers, read by Cloudflare Pages
dist/build_assets/       hashed JavaScript, CSS and fonts
```

## Connecting the repository

In the Cloudflare dashboard: **Workers and Pages → Create → Pages → Connect to
Git**, then pick `solutiono1/cachet`.

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | `cd web && npm install && npm run build` |
| Build output directory | `web/dist` |
| Root directory | `/` |
| Node version | 20 or newer, set `NODE_VERSION` if the default is older |

There are no environment variables and no build secrets. Everything the app
needs, including which contract and which chain endpoints it reads, is in
`web/src/lib/config.js` and is public by design.

Every push to `main` then redeploys, and every other branch gets its own
preview URL.

## Deploying from a terminal instead

```
cd web
npm run build
npx wrangler pages deploy dist --project-name cachet
```

The first run opens a browser to authorise Wrangler against your Cloudflare
account. Nothing in this repository holds a Cloudflare token, and nothing
needs to.

## Response headers

`web/static/_headers` is copied into the build and read by Cloudflare Pages. It
sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, a cross-origin opener and resource policy, and
a `Permissions-Policy` that turns off every browser feature Cachet does not
use, including the camera, microphone and geolocation.

The content security policy is not in that file. It is built by SvelteKit,
which knows the hash of its own inline bootstrap script, and travels in the
page itself. It is worth reading once, because it is the claim of this product
written in a form the browser enforces:

- `default-src 'none'` — nothing is allowed unless it is named below.
- `script-src 'self' 'sha256-…'` — scripts from this origin and SvelteKit's
  one hashed inline script. An injected script cannot run.
- `connect-src` — the complete list of hosts the application can reach: the
  three independent chain readers, the four the wallet selector reaches on its
  own, and the cross-chain quote API. Nothing can be sent anywhere else.
- `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`.

`frame-ancestors` cannot be set from a page, which is why clickjacking is
handled by `X-Frame-Options` in `_headers` instead.

## Caching

Hashed assets under `build_assets/immutable/` are cached for a year, because
their names change whenever their contents do. `/pay/` and `/verify/` are sent
with `no-store`: a verification has to read today's chain, and a stale page
helps nobody.

## A custom domain

**Pages project → Custom domains → Set up a domain.** If the domain is already
on Cloudflare, the DNS record is created for you and the certificate is issued
within a few minutes. Nothing in the application depends on the hostname; a
pay link is built from whatever origin the page is served on, so links made
before a domain change keep working at the old address and new ones use the
new one.

## What a deployment does not need

No server, no database, no API keys, no build secrets, no analytics, no error
reporting, no cookies. If a future change adds any of those, the claims in the
README and in `SECURITY.md` stop being true and should be changed in the same
commit.
