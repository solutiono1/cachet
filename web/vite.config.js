import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	server: {
		/* The dev server runs inside WSL while the files live on the Windows
		   drive, and inotify does not cross that mount, so file changes raise
		   no events. Polling is the only way the watcher sees an edit here. */
		watch: { usePolling: true, interval: 300 }
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			/* Output to dist rather than build: on Windows another process
			   keeps a handle on a directory named build, and the adapter
			   cannot clear it between runs. */
			adapter: adapter({ pages: 'dist', assets: 'dist' }),

			/* Cachet's claim is that nothing about an invoice leaves the
			   browser. A policy makes the browser enforce that instead of
			   asking anyone to take it on trust, and the connect list below
			   is the complete set of hosts this application can reach.
			   Anything else, including a script injected into a page, is
			   refused by the browser before it can send a byte.
			   'hash' mode lets SvelteKit hash its own inline bootstrap. */
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['none'],
					'script-src': ['self'],
					/* Svelte writes custom properties as style attributes. */
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'manifest-src': ['self'],
					'connect-src': [
						'self',
						/* The three independent chain readers a verification
						   must agree on, listed in src/lib/config.js. */
						'https://rpc.testnet.fastnear.com',
						'https://rpc.testnet.near.org',
						'https://near-testnet.drpc.org',
						/* What the wallet selector reaches on its own. */
						'https://test.rpc.fastnear.com',
						'https://test.api.fastnear.com',
						'https://helper.testnet.near.org',
						'https://testnet.mynearwallet.com',
						/* Live cross-chain quotes on the pay screen. */
						'https://1click.chaindefuser.com'
					],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-src': ['none'],
					'object-src': ['none'],
					'frame-ancestors': ['none']
				}
			},
			// '_app' is reserved by some static hosts, so the build folder is named plainly.
			appDir: 'build_assets'
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
