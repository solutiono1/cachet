# Cachet web app

The SvelteKit front end and the `cachet` command-line tool.
See the [project README](../README.md) for what Cachet is and how to run it.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # the core cryptography tests
npm run build   # static site in ./build
```

Useful entry points:

- `src/lib/core/` — keys, seals, pay links and proofs. No network, fully tested.
- `src/lib/near.js` — view calls against NEAR RPC.
- `src/lib/vault.svelte.js` — the encrypted seed and invoice store.
- `bin/cachet.mjs` — `envelope`, `sign`, `proof` and `verify` from a terminal.
