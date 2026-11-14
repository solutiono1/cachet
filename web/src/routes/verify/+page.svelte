<script>
	import { onMount } from 'svelte';
	import Seal from '#lib/components/Seal.svelte';
	import { decodePayload } from '#lib/core/envelope.js';
	import { verifyProof } from '#lib/core/proof.js';
	import { agreementNote, fetchEnvelopes } from '#lib/near.js';
	import { CONTRACT_ID, QUORUM, RPC_URLS, TOKEN, explorerAccount } from '#lib/config.js';
	import { formatAmount, formatDate, formatTimestamp } from '#lib/format.js';

	let result = $state(null);
	let checking = $state(false);
	let error = $state('');
	let pasted = $state('');

	onMount(() => {
		const fragment = location.hash.slice(1);
		if (fragment) check(() => decodePayload(fragment));
	});

	async function check(getBundle) {
		error = '';
		checking = true;
		result = null;
		try {
			/* awaited, because decoding a packed link is asynchronous */
			const bundle = await getBundle();
			result = await verifyProof(bundle, fetchEnvelopes);
		} catch (problem) {
			error = `This is not a proof Cachet can read. ${problem.message}`;
		} finally {
			checking = false;
		}
	}

	function fromPaste(event) {
		event.preventDefault();
		const text = pasted.trim();
		if (!text) return;
		check(() => (text.startsWith('{') ? JSON.parse(text) : decodePayload(stripLink(text))));
	}

	function stripLink(text) {
		const at = text.indexOf('#');
		return at === -1 ? text : text.slice(at + 1);
	}

	async function fromFile(event) {
		const file = event.currentTarget.files?.[0];
		if (!file) return;
		const text = await file.text();
		check(() => JSON.parse(text));
	}

	function reset() {
		result = null;
		error = '';
		pasted = '';
		if (location.hash) history.replaceState(null, '', location.pathname);
	}

	const totals = $derived(Object.entries(result?.total ?? {}));
	const chainNote = $derived(agreementNote(result?.agreement));
</script>

<svelte:head>
	<title>Check a proof on Cachet</title>
	<meta
		name="description"
		content="Check a Cachet proof of income against the NEAR chain. No wallet and no account needed."
	/>
</svelte:head>

<div class="container page">
	{#if checking}
		<header class="head">
			<h1>Checking against the chain…</h1>
			<p class="lede">
				Reading {CONTRACT_ID} on NEAR testnet through {RPC_URLS.length} independent
				endpoints.
			</p>
		</header>
	{:else if result}
		<header class="verdict" class:good={result.verified}>
			{#if result.verified}
				<Seal size={56} pressed title="Verified" />
			{/if}
			<h1>{result.verified ? 'Verified' : 'Not verified'}</h1>
			<p class="lede">
				{#if result.verified}
					Every payment below exists on NEAR, matches the invoice shown, and is signed by
					the key that owns it.
				{:else}
					This proof did not pass every check. What failed is shown below.
				{/if}
			</p>
		</header>

		{#if result.problems.length}
			<div class="panel caution">
				{#each result.problems as problem (problem)}
					<p class="muted">{problem}</p>
				{/each}
			</div>
		{/if}

		{#if result.statement}
			<section class="card">
				<p class="label">What this proof claims</p>
				<dl class="facts">
					<div><dt>Earned by</dt><dd>{result.statement.payee}</dd></div>
					<div><dt>Prepared for</dt><dd>{result.statement.audience}</dd></div>
					<div><dt>Purpose</dt><dd>{result.statement.purpose}</dd></div>
					<div><dt>Valid until</dt><dd>{formatDate(result.statement.expires)}</dd></div>
					<div><dt>Checked against</dt>
						<dd class="mono">
							<a href={explorerAccount(result.contract)} target="_blank" rel="noreferrer">
								{result.contract}
							</a>
						</dd>
					</div>
					{#if chainNote}
						<div><dt>Read through</dt><dd>{chainNote}</dd></div>
					{/if}
				</dl>
			</section>
		{/if}

		<section class="stack">
			<p class="label">Payments disclosed ({result.payments.length})</p>
			{#each result.payments as payment (payment.idHex ?? payment.details.description)}
				<article class="card payment" class:bad={!payment.ok}>
					<div class="row between">
						<span class="badge" class:badge--verified={payment.ok} class:badge--caution={!payment.ok}>
							{payment.ok ? 'Verified' : 'Failed'}
						</span>
						<span class="amount">{formatAmount(payment.details.amount)} {TOKEN.symbol}</span>
					</div>

					<h4>{payment.details.client}</h4>
					<p class="muted">{payment.details.description}</p>

					<dl class="facts small">
						<div><dt>Invoiced</dt><dd>{formatDate(payment.details.issued)}</dd></div>
						{#if payment.record}
							<div><dt>Settled</dt><dd>{formatTimestamp(payment.record.paid_at)}</dd></div>
							<div><dt>Paid by</dt>
								<dd class="mono">
									<a href={explorerAccount(payment.record.payer)} target="_blank" rel="noreferrer">
										{payment.record.payer}
									</a>
								</dd>
							</div>
						{/if}
						{#if payment.idHex}
							<div><dt>Envelope</dt><dd class="mono break">{payment.idHex}</dd></div>
						{/if}
					</dl>

					{#if payment.ok}
						<ul class="checks">
							<li>The invoice matches the seal recorded on chain</li>
							<li>The payment exists in the contract for this amount</li>
							<li>It is signed by the key that owns the payment</li>
						</ul>
					{:else}
						<p class="hint hint--error">{payment.reason}</p>
					{/if}
				</article>
			{/each}
		</section>

		{#if result.verified && totals.length}
			<section class="card total">
				<p class="label">Total proven</p>
				{#each totals as [token, sum] (token)}
					<p class="amount">{formatAmount(sum)} {TOKEN.symbol}</p>
					<p class="caption mono">{token}</p>
				{/each}
				<p class="caption">
					Across {result.payments.length}
					{result.payments.length === 1 ? 'payment' : 'payments'}. The earner may have
					other income; a proof shows only what they chose to disclose.
				</p>
			</section>
		{/if}

		<button class="btn btn--secondary" type="button" onclick={reset}>Check another proof</button>
	{:else}
		<header class="head">
			<p class="eyebrow">Verification</p>
			<h1>Check a proof</h1>
			<p class="lede">
				Paste a Cachet proof link or open the file. The checking happens in this browser,
				against the NEAR chain. You need no wallet and no account, and nothing is
				uploaded.
			</p>
		</header>

		<form class="card stack" onsubmit={fromPaste}>
			<label class="field-row">
				<span class="label">Proof link or file contents</span>
				<textarea
					class="mono"
					bind:value={pasted}
					rows="5"
					placeholder="https://…/verify/#eyJ2Ijox…"
				></textarea>
			</label>
			{#if error}<p class="hint hint--error">{error}</p>{/if}
			<div class="row">
				<button class="btn btn--primary" type="submit">Check it</button>
				<label class="btn btn--secondary file">
					Open a file
					<input type="file" accept="application/json,.json" onchange={fromFile} />
				</label>
			</div>
		</form>

		<section class="panel note">
			<p class="label">What gets checked</p>
			<ol class="numbered">
				<li>The invoice details are hashed again and compared with the seal on chain.</li>
				<li>The payment is read from the contract: amount, token and settlement time.</li>
				<li>
					Each payment's signature is checked against the key that owns it, over the
					statement naming you.
				</li>
				<li>
					The chain is read through {RPC_URLS.length} endpoints run by different operators,
					and a payment counts as confirmed only when {QUORUM} of them agree.
				</li>
			</ol>
			<p class="caption">
				The third check is why a client who paid one of these invoices cannot present it
				as their own income. The fourth is why no one endpoint can tell you a payment
				happened when it did not.
			</p>
		</section>
	{/if}
</div>

<style>
	.page {
		padding-block: var(--s-band);
		display: grid;
		gap: var(--s-6);
		max-width: 760px;
	}

	.head {
		display: grid;
		gap: var(--s-3);
	}

	.verdict {
		display: grid;
		gap: var(--s-3);
		justify-items: start;
	}

	.verdict h1 {
		color: var(--caution);
	}

	.verdict.good h1 {
		color: var(--verified);
	}

	.facts {
		display: grid;
		gap: var(--s-3);
		margin: var(--s-4) 0 0;
	}

	.facts div {
		display: grid;
		gap: 2px;
		padding-top: var(--s-3);
		border-top: var(--hair) solid var(--border);
	}

	.facts.small dd {
		font-size: 14px;
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
	}

	.break {
		overflow-wrap: anywhere;
	}

	.between {
		justify-content: space-between;
	}

	.payment {
		display: grid;
		gap: var(--s-2);
	}

	.payment.bad {
		border-color: var(--caution-line);
	}

	.checks {
		display: grid;
		gap: var(--s-1);
		margin: var(--s-4) 0 0;
		padding: 0;
		list-style: none;
		font-size: 14px;
		color: var(--muted);
	}

	.checks li::before {
		content: '✓';
		color: var(--verified);
		margin-inline-end: var(--s-2);
		font-weight: 700;
	}

	.total {
		display: grid;
		gap: var(--s-1);
	}

	.total .amount {
		color: var(--verified);
	}

	.total .caption:last-child {
		margin-top: var(--s-3);
	}

	.numbered {
		display: grid;
		gap: var(--s-2);
		margin: 0;
		padding-left: var(--s-5);
		color: var(--muted);
		font-size: 15px;
	}

	.note {
		display: grid;
		gap: var(--s-3);
	}

	.file {
		position: relative;
		overflow: hidden;
		cursor: pointer;
	}

	.file input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	@media (min-width: 640px) {
		.facts div {
			grid-template-columns: 130px 1fr;
			gap: var(--s-4);
			align-items: baseline;
		}
	}
</style>
