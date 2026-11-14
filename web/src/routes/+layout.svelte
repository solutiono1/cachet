<script>
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Mark from '#lib/components/Mark.svelte';
	import Social from '#lib/components/Social.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { CONTRACT_ID, NETWORK, TOKEN, explorerAccount } from '#lib/config.js';

	let { children } = $props();

	const links = [
		{ href: '/app/', label: 'Envelopes' },
		{ href: '/prove/', label: 'Build a proof' },
		{ href: '/verify/', label: 'Verify' }
	];

	let path = $derived(page.url.pathname);

	/* The landing page is the only one that tells a story by scrolling. Every
	   other screen is a single task that should sit still: no footer beneath
	   it, no bar that changes shape, and no empty scroll past the end. */
	let isLanding = $derived(path === '/');

	/* On the landing page the bar sits flush at the top and draws into a
	   floating island once you scroll, returning when you come back up. Two
	   thresholds so it cannot flutter on the boundary. */
	let floating = $state(false);

	$effect(() => {
		if (!isLanding) {
			floating = false;
			return;
		}
		const onScroll = () => {
			const y = window.scrollY;
			if (!floating && y > 64) floating = true;
			else if (floating && y < 28) floating = false;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	const columns = [
		{
			head: 'Use it',
			items: [
				{ href: '/new/', label: 'Create a pay link' },
				{ href: '/app/', label: 'Your envelopes' },
				{ href: '/prove/', label: 'Build a proof' },
				{ href: '/verify/', label: 'Check a proof' }
			]
		},
		{
			head: 'On chain',
			items: [
				{ href: explorerAccount(CONTRACT_ID), label: CONTRACT_ID, out: true },
				{ href: explorerAccount(TOKEN.id), label: TOKEN.id, out: true },
				{ href: 'https://docs.near.org/', label: 'NEAR docs', out: true }
			]
		},
		{
			head: 'This build',
			items: [
				{ href: '/settings/', label: 'Settings and backup' },
				{ href: '/privacy/', label: 'Privacy and terms' },
				{ href: 'https://nearhackathon.com/', label: 'NEAR Hackathon', out: true }
			]
		}
	];

	/* The slot the reference gives a newsletter. Cachet has no mailing list
	   and no server to collect one, so it holds the thing a stranger landing
	   here actually wants to do: check a proof they were sent. */
	let proofInput = $state('');

	/* Fill the two empty strings in when the accounts exist. An entry with no
	   href is not rendered, so the row never carries a dead icon. */
	const social = [
		{ name: 'GitHub', href: 'https://github.com/solutiono1/cachet' },
		{ name: 'X', href: '' },
		{ name: 'YouTube', href: '' }
	].filter((item) => item.href);

	function openProof(event) {
		event.preventDefault();
		const value = proofInput.trim();
		if (!value) return;
		const at = value.indexOf('#');
		goto('/verify/#' + (at === -1 ? value : value.slice(at + 1)));
	}
</script>

<a class="skip" href="#main">Skip to content</a>

<header class:floating>
	<div class="shell">
		<a class="wordmark" href="/">
			<Mark size={26} title="Cachet" />
			<span>Cachet</span>
		</a>

		<nav class="links" aria-label="Main">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={path === link.href ? 'page' : undefined}>
					<span>{link.label}</span>
				</a>
			{/each}
		</nav>

		<div class="actions">
			<ThemeToggle />
			<a class="btn btn--primary btn--sm" href="/new/">
				Create pay link
				<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
					<path
						d="M4.75 11.25l6.5-6.5M5.75 4.75h5.5v5.5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
		</div>
	</div>
</header>

<main id="main" class:task={!isLanding}>
	{@render children()}
</main>

{#if isLanding}
<footer>
	<div class="frame">
		<div class="foot-card">
			<div class="foot-grid">
				{#each columns as column (column.head)}
					<nav class="col" aria-label={column.head}>
						<p class="col-head">{column.head}</p>
						<ul>
							{#each column.items as item (item.label)}
								<li>
									{#if item.out}
										<a href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
									{:else}
										<a href={item.href}>{item.label}</a>
									{/if}
								</li>
							{/each}
						</ul>
					</nav>
				{/each}

				<div class="aside-col">
					<p class="col-head">Been sent a proof</p>
					<form class="proof-form" onsubmit={openProof}>
						<input
							class="mono"
							bind:value={proofInput}
							placeholder="Paste the proof link"
							aria-label="Paste a Cachet proof link to check it"
						/>
						<button type="submit" aria-label="Check this proof">
							<svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
								<path
									d="M3.5 8h9M8.75 4.25 12.5 8l-3.75 3.75"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>
					</form>
					<p class="caption">
						Checked in your own browser against NEAR {NETWORK}. No wallet, no account.
					</p>

					<div class="social-row">
						<Social items={social} />
					</div>

					<p class="caption rights">
						Cachet 2026. MIT licensed. Testnet software, not audited.
					</p>
				</div>
			</div>

			<p class="giant" aria-hidden="true">Cachet</p>
		</div>
	</div>
</footer>
{/if}

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 0;
		z-index: 100;
		padding: var(--s-3) var(--s-4);
		background: var(--surface);
		border: var(--hair) solid var(--border);
		border-radius: var(--r-sm);
	}

	.skip:focus {
		left: var(--s-4);
		top: var(--s-4);
	}

	header {
		position: sticky;
		top: 0;
		z-index: 60;
		display: flex;
		justify-content: center;
		padding-top: 0;
		transition: padding-top var(--mid) var(--ease);
	}

	header.floating {
		padding-top: 10px;
	}

	.shell {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--s-4);
		width: min(var(--wide), 100%);
		min-height: 64px;
		padding-inline: var(--s-4);
		border: var(--hair) solid transparent;
		border-radius: 0;
		background: transparent;
		box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
		transition:
			width var(--mid) var(--ease),
			min-height var(--mid) var(--ease),
			border-radius var(--mid) var(--ease),
			border-color 260ms var(--ease),
			padding-inline var(--mid) var(--ease),
			background-color 260ms var(--ease),
			box-shadow var(--mid) var(--ease);
	}

	@media (min-width: 640px) {
		.shell {
			padding-inline: 28px;
		}
	}

	.floating .shell {
		width: min(840px, calc(100% - 20px));
		min-height: 56px;
		padding-inline: var(--s-3) var(--s-2);
		border-color: var(--glass-line);
		border-radius: var(--r-full);
		background: var(--glass);
		backdrop-filter: blur(14px) saturate(1.1);
		-webkit-backdrop-filter: blur(14px) saturate(1.1);
		box-shadow: var(--shadow-card);
	}

	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		color: var(--text);
		text-decoration: none;
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 20;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
		white-space: nowrap;
		transition: opacity var(--fast) var(--ease);
	}

	.wordmark:hover {
		opacity: 0.78;
	}

	.links {
		display: none;
		position: absolute;
		left: 50%;
		translate: -50% 0;
		gap: var(--s-6);
	}

	.links a {
		position: relative;
		color: var(--muted);
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		padding-block: var(--s-2);
		white-space: nowrap;
		transition: color var(--fast) var(--ease);
	}

	.links a span::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 3px;
		height: 1px;
		background: currentColor;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 280ms var(--ease);
	}

	.links a:hover,
	.links a[aria-current='page'] {
		color: var(--text);
	}

	.links a:hover span::after,
	.links a[aria-current='page'] span::after {
		transform: scaleX(1);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		margin-inline-start: auto;
	}

	:global(.btn--sm) {
		min-height: 40px;
		padding-inline: var(--s-4);
		font-size: 14px;
	}

	@media (min-width: 940px) {
		.links {
			display: flex;
		}
	}

	/* ---- Footer ---- */

	/* A task screen fills the window exactly, so there is nothing to scroll
	   past when the form is short. */
	.task {
		display: flex;
		flex-direction: column;
		min-height: calc(100dvh - 64px);
	}

	footer {
		margin-top: clamp(56px, 8vw, 104px);
	}

	.frame {
		width: min(var(--wide), 100%);
		margin-inline: auto;
		padding: 0 var(--s-4) var(--s-4);
	}

	@media (min-width: 640px) {
		.frame {
			padding: 0 28px 28px;
		}
	}

	.foot-card {
		position: relative;
		overflow: hidden;
		border: var(--hair) solid var(--border);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow-card);
		padding: clamp(28px, 4vw, 52px) clamp(24px, 4vw, 52px) 0;
	}

	.foot-grid {
		display: grid;
		gap: var(--s-7);
	}

	.col-head {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--wax);
		margin: 0 0 var(--s-4);
	}

	.col ul {
		display: grid;
		gap: var(--s-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.col a {
		color: var(--text);
		text-decoration: none;
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.008em;
		transition:
			color var(--fast) var(--ease),
			translate var(--fast) var(--ease);
		display: inline-block;
	}

	.col a:hover {
		color: var(--accent-text);
		translate: 3px 0;
	}

	.social-row {
		margin-top: var(--s-2);
	}

	.aside-col {
		display: grid;
		gap: var(--s-3);
		align-content: start;
	}

	.proof-form {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		padding: 5px 5px 5px var(--s-4);
		background: color-mix(in srgb, var(--bg) 70%, var(--surface));
		border: var(--hair) solid var(--border);
		border-radius: var(--r-full);
		transition:
			border-color var(--fast) var(--ease),
			box-shadow var(--fast) var(--ease);
	}

	.proof-form:focus-within {
		border-color: var(--wax);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--wax) 16%, transparent);
	}

	.proof-form input {
		flex: 1;
		min-width: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		font-size: 13px;
		outline: none;
	}

	.proof-form input::placeholder {
		color: var(--faint);
	}

	.proof-form button {
		flex: none;
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		padding: 0;
		border: 0;
		border-radius: var(--r-full);
		background: var(--wax);
		color: #fff;
		cursor: pointer;
		transition:
			background-color var(--fast) var(--ease),
			translate var(--fast) var(--ease);
	}

	.proof-form button:hover {
		background: var(--wax-deep);
		translate: 2px 0;
	}

	.rights {
		color: var(--faint);
		margin-top: var(--s-2);
	}

	/* The wordmark runs to the edges and is cut by the bottom of the card. */
	.giant {
		margin: clamp(32px, 5vw, 56px) 0 0;
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 144;
		font-weight: 600;
		font-size: clamp(5.5rem, 21.5vw, 19rem);
		line-height: 0.76;
		letter-spacing: -0.05em;
		text-align: center;
		color: color-mix(in srgb, var(--text) 9%, transparent);
		user-select: none;
		margin-bottom: -0.12em;
	}

	@media (min-width: 720px) {
		.foot-grid {
			grid-template-columns: repeat(3, auto) 1fr;
			gap: var(--s-8);
		}

		.aside-col {
			justify-self: end;
			width: min(340px, 100%);
		}
	}
</style>
