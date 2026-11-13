<script>
	import '../app.css';
	import { page } from '$app/state';
	import Seal from '#lib/components/Seal.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';

	let { children } = $props();

	const links = [
		{ href: '/app/', label: 'Envelopes' },
		{ href: '/prove/', label: 'Build a proof' },
		{ href: '/verify/', label: 'Verify' }
	];

	let path = $derived(page.url.pathname);
</script>

<a class="skip" href="#main">Skip to content</a>

<header>
	<div class="container bar">
		<a class="wordmark" href="/">
			<Seal size={26} title="Cachet" />
			<span>Cachet</span>
		</a>

		<nav class="links" aria-label="Main">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={path === link.href ? 'page' : undefined}>{link.label}</a>
			{/each}
		</nav>

		<div class="actions">
			<ThemeToggle />
			<a class="btn btn--primary btn--sm" href="/new/">Create pay link</a>
		</div>
	</div>
</header>

<main id="main">
	{@render children()}
</main>

<footer>
	<div class="container foot">
		<div class="foot-brand">
			<a class="wordmark" href="/">
				<Seal size={22} title="" />
				<span>Cachet</span>
			</a>
			<p class="caption">Get paid privately. Prove it when it counts.</p>
		</div>

		<nav class="foot-links" aria-label="Footer">
			{#each links as link (link.href)}
				<a href={link.href}>{link.label}</a>
			{/each}
			<a href="/new/">Create pay link</a>
			<a href="/settings/">Settings</a>
		</nav>

		<p class="caption legal">
			Testnet software, not audited. MIT licensed. Built for the NEAR Hackathon,
			November 2026.
		</p>
	</div>
</footer>

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 0;
		z-index: 100;
		padding: var(--s-3) var(--s-4);
		background: var(--surface);
		border: var(--hair) solid var(--border);
	}

	.skip:focus {
		left: var(--s-4);
		top: var(--s-4);
	}

	header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: var(--hair) solid var(--border);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: var(--s-4);
		min-height: 64px;
	}

	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		color: var(--text);
		text-decoration: none;
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 20;
		font-size: 19px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}

	.links {
		display: none;
		gap: var(--s-5);
		margin-inline-start: var(--s-4);
	}

	.links a {
		color: var(--muted);
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		letter-spacing: 0.01em;
		padding-block: var(--s-2);
	}

	.links a:hover,
	.links a[aria-current='page'] {
		color: var(--text);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		margin-inline-start: auto;
	}

	:global(.btn--sm) {
		min-height: 38px;
		padding-inline: var(--s-4);
		font-size: 14px;
	}

	@media (min-width: 880px) {
		.links {
			display: flex;
		}
	}

	main {
		min-height: 60vh;
	}

	footer {
		margin-top: var(--s-hero);
		border-top: var(--hair) solid var(--border);
		padding-block: var(--s-band) var(--s-section);
	}

	.foot {
		display: grid;
		gap: var(--s-6);
	}

	.foot-brand {
		display: grid;
		gap: var(--s-2);
	}

	.foot-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-3) var(--s-5);
	}

	.foot-links a {
		color: var(--muted);
		text-decoration: none;
		font-size: 14px;
	}

	.foot-links a:hover {
		color: var(--text);
	}

	.legal {
		max-width: 46ch;
		color: var(--faint);
	}

	@media (min-width: 880px) {
		.foot {
			grid-template-columns: 1fr auto;
			align-items: start;
		}

		.foot-links {
			justify-content: flex-end;
		}

		.legal {
			grid-column: 1 / -1;
		}
	}
</style>
