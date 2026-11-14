<script>
	import { CONTRACT_ID, NETWORK, RPC_URL, TOKEN, EXPLORER } from '#lib/config.js';

	/* Written from an audit of the source rather than from intent. There is
	   exactly one outbound request in the application code, and it is the one
	   described below. */
	const leaves = [
		{
			what: 'Envelope identifiers',
			to: RPC_URL,
			why: `Reading whether an envelope has been paid. The identifier is a hash. The
				request also reveals your IP address to that endpoint, as any web request
				does.`
		},
		{
			what: 'A signed transaction',
			to: 'Your wallet, then NEAR',
			why: `Only when you pay an invoice or open an envelope. Your wallet, not Cachet,
				decides what it sends.`
		},
		{
			what: 'Nothing else',
			to: 'Nowhere',
			why: `There is no Cachet server, no database, no analytics, no error reporting
				and no advertising code anywhere in this application.`
		}
	];

	const stored = [
		{
			key: 'cachet.vault',
			where: 'Local storage',
			what: `Your seed and your invoice records, encrypted with your passphrase using
				PBKDF2 and AES-GCM. Cachet cannot read it and neither can anyone without
				that passphrase.`
		},
		{
			key: 'cachet.open',
			where: 'Session storage',
			what: `A decrypted copy held only while the tab is open, so a reload does not ask
				for your passphrase again. Closing the tab erases it.`
		},
		{
			key: 'cachet.theme',
			where: 'Local storage',
			what: 'Whether you chose the light or dark theme.'
		}
	];
</script>

<svelte:head>
	<title>Privacy and terms on Cachet</title>
	<meta
		name="description"
		content="Exactly what Cachet stores, what leaves your browser, and the terms this testnet software is offered under."
	/>
</svelte:head>

<div class="container page">
	<header class="head">
		<p class="label">Privacy and terms</p>
		<h1>What Cachet knows about you</h1>
		<p class="lede">
			Nothing. There is no account to create, no server to hold your data, and no
			cookie set by this site. What follows is the audit behind that claim, so you
			can check it rather than take it.
		</p>
	</header>

	<section class="band-sm">
		<h2>What leaves your browser</h2>
		<div class="rows">
			{#each leaves as row (row.what)}
				<article class="row">
					<h4>{row.what}</h4>
					<p class="mono dest">{row.to}</p>
					<p class="muted">{row.why}</p>
				</article>
			{/each}
		</div>
		<p class="caption note">
			The whole application contains a single network call, in
			<code class="mono">src/lib/near.js</code>. You can read it in the repository.
		</p>
	</section>

	<section class="band-sm">
		<h2>What is kept on your device</h2>
		<div class="rows">
			{#each stored as row (row.key)}
				<article class="row">
					<h4 class="mono key">{row.key}</h4>
					<p class="mono dest">{row.where}</p>
					<p class="muted">{row.what}</p>
				</article>
			{/each}
		</div>
		<p class="caption note">
			None of this is a cookie, none of it is sent anywhere, and none of it is used
			to track you. It is the storage the application needs in order to work at all,
			which is why there is no consent banner on this site.
		</p>
	</section>

	<section class="band-sm">
		<h2>Deleting your data</h2>
		<p class="lede">
			Cachet holds nothing to delete, so there is no request to make and nobody to
			make it to. Everything lives on your device, and
			<a href="/settings/">Settings</a> removes it.
		</p>
		<p class="muted warn">
			Payments already settled on NEAR stay on NEAR. A public chain cannot be edited
			by us or by you. That is true of every application on it, and it is why Cachet
			puts only a salted hash there.
		</p>
	</section>

	<section class="band-sm">
		<h2>Terms</h2>
		<ul class="terms">
			<li>
				<strong>This is testnet software and it has not been audited.</strong> It moves
				test tokens with no monetary value. Do not use it with funds you cannot afford
				to lose.
			</li>
			<li>
				<strong>It is provided as is.</strong> Under the MIT licence the authors give no
				warranty and accept no liability. The full text is in the repository.
			</li>
			<li>
				<strong>Your passphrase cannot be recovered.</strong> There is no reset, because
				there is no account. Lose both your device and your backup and the envelopes
				that are still sealed cannot be opened by anyone, including us.
			</li>
			<li>
				<strong>Cachet is not a bank, a broker or a tax adviser.</strong> A proof shows
				that certain payments settled. Whether a landlord, a lender or an authority
				accepts it is their decision, not ours.
			</li>
			<li>
				<strong>It is not for children.</strong> Nothing here is designed or intended for
				anyone under 18, and no personal data is collected from anyone of any age.
			</li>
			<li>
				<strong>You are responsible for what you invoice.</strong> Privacy is not a
				licence to defraud anyone, and the amounts and settlement times stay public on
				NEAR regardless.
			</li>
		</ul>
	</section>

	<section class="band-sm">
		<h2>This deployment</h2>
		<dl class="facts">
			<div><dt>Network</dt><dd class="mono">NEAR {NETWORK}</dd></div>
			<div>
				<dt>Contract</dt>
				<dd class="mono">
					<a href="{EXPLORER}/address/{CONTRACT_ID}" target="_blank" rel="noreferrer">
						{CONTRACT_ID}
					</a>
				</dd>
			</div>
			<div>
				<dt>Token</dt>
				<dd class="mono">
					<a href="{EXPLORER}/address/{TOKEN.id}" target="_blank" rel="noreferrer">
						{TOKEN.id}
					</a>
				</dd>
			</div>
			<div><dt>Endpoint</dt><dd class="mono">{RPC_URL}</dd></div>
		</dl>
		<p class="caption">
			The contract has no owner, no upgrade method and no pause, so these addresses
			cannot change under you.
		</p>
	</section>
</div>

<style>
	.page {
		padding-block: clamp(48px, 7vw, 88px);
		display: grid;
		gap: clamp(40px, 6vw, 64px);
		max-width: 820px;
	}

	.head {
		display: grid;
		gap: var(--s-3);
	}

	.band-sm {
		display: grid;
		gap: var(--s-5);
	}

	h2 {
		font-size: clamp(1.5rem, 1.2rem + 1.2vw, 2rem);
	}

	.rows {
		display: grid;
		gap: var(--s-3);
	}

	.row {
		display: grid;
		gap: var(--s-2);
		padding: var(--s-5);
		background: color-mix(in srgb, var(--surface) 70%, transparent);
		border: var(--hair) solid var(--border-soft);
		border-radius: var(--r-card);
	}

	.dest {
		font-size: 12.5px;
		color: var(--accent-text);
		margin: 0;
		overflow-wrap: anywhere;
	}

	.key {
		font-size: 14px;
	}

	.note {
		max-width: 64ch;
	}

	.warn {
		padding-left: var(--s-5);
		border-left: 2px solid var(--caution);
		max-width: 64ch;
	}

	.terms {
		display: grid;
		gap: var(--s-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.terms li {
		padding-left: var(--s-5);
		border-left: 2px solid var(--border);
		color: var(--muted);
		max-width: 68ch;
	}

	.terms strong {
		color: var(--text);
	}

	.facts {
		display: grid;
		gap: var(--s-3);
		margin: 0;
	}

	.facts div {
		display: grid;
		gap: 2px;
		padding-top: var(--s-3);
		border-top: var(--hair) solid var(--border-soft);
	}

	dt {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--faint);
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	@media (min-width: 720px) {
		.facts div {
			grid-template-columns: 120px 1fr;
			gap: var(--s-4);
			align-items: baseline;
		}
	}
</style>
