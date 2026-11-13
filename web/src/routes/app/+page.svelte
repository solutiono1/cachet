<script>
	import { onMount } from 'svelte';
	import Lock from '#lib/components/Lock.svelte';
	import Seal from '#lib/components/Seal.svelte';
	import { allEnvelopes, load, vault } from '#lib/vault.svelte.js';
	import { fetchEnvelopes } from '#lib/near.js';
	import { signWithdraw } from '#lib/core/envelope.js';
	import { toHex } from '#lib/core/crypto.js';
	import { CONTRACT_ID, TOKEN, explorerAccount } from '#lib/config.js';
	import { formatAmount, formatTimestamp } from '#lib/format.js';
	import { openEnvelope, restore, signIn, wallet } from '#lib/wallet.svelte.js';

	let envelopes = $state([]);
	let records = $state(new Map());
	let loading = $state(false);
	let chainError = $state('');

	let openingIndex = $state(null);
	let recipient = $state('');
	let openError = $state('');
	let opening = $state(false);

	/* Guards the one automatic read, so an empty vault does not make the
	   effect fire over and over. */
	let readOnce = $state(false);

	onMount(async () => {
		load();
		await restore();
	});

	$effect(() => {
		if (vault.status === 'unlocked' && !readOnce) {
			readOnce = true;
			refresh();
		} else if (vault.status !== 'unlocked' && readOnce) {
			readOnce = false;
			envelopes = [];
			records = new Map();
		}
	});

	async function refresh() {
		loading = true;
		chainError = '';
		try {
			envelopes = await allEnvelopes();
			if (envelopes.length) {
				records = await fetchEnvelopes(envelopes.map((e) => e.idHex));
			}
		} catch (problem) {
			chainError = problem.message;
		} finally {
			loading = false;
		}
	}

	function statusOf(envelope) {
		const record = records.get(envelope.idHex);
		if (!record) return { label: 'Awaiting payment', kind: 'waiting', record: null };
		if (record.opened) return { label: 'Opened', kind: 'opened', record };
		return { label: 'Paid', kind: 'paid', record };
	}

	function startOpening(envelope) {
		openingIndex = envelope.index;
		recipient = wallet.accountId ?? '';
		openError = '';
	}

	async function confirmOpen(envelope) {
		openError = '';
		const to = recipient.trim();
		if (!to) {
			openError = 'Type the account that should receive the money.';
			return;
		}
		opening = true;
		try {
			const signature = await signWithdraw(envelope, CONTRACT_ID, to);
			await openEnvelope({
				claimHex: toHex(envelope.publicKey),
				sealHex: toHex(envelope.seal),
				recipientId: to,
				signatureHex: toHex(signature)
			});
			await refresh();
			openingIndex = null;
		} catch (problem) {
			openError = problem.message;
		} finally {
			opening = false;
		}
	}

	const paidCount = $derived(
		envelopes.filter((e) => records.get(e.idHex) && !records.get(e.idHex).opened).length
	);
</script>

<svelte:head><title>Envelopes — Cachet</title></svelte:head>

<div class="container page">
	{#if !vault.ready}
		<p class="muted">Opening this browser's vault…</p>
	{:else if vault.status !== 'unlocked'}
		<header class="head">
			<h1>Your envelopes</h1>
			<p class="lede">They live in this browser, encrypted.</p>
		</header>
		<Lock />
	{:else}
		<header class="head">
			<div class="row between">
				<h1>Your envelopes</h1>
				<button class="btn btn--quiet" type="button" onclick={refresh} disabled={loading}>
					{loading ? 'Reading the chain…' : 'Refresh'}
				</button>
			</div>
			<p class="lede">
				Read straight from {CONTRACT_ID} on NEAR testnet. Only you can match these to
				invoices, because only this browser holds the details.
			</p>
		</header>

		{#if chainError}
			<div class="panel caution">
				<p class="label">The chain could not be read</p>
				<p class="muted">{chainError}</p>
			</div>
		{/if}

		{#if envelopes.length === 0}
			<div class="card empty">
				<Seal size={36} />
				<h3>Nothing sealed yet</h3>
				<p class="muted">Your first pay link takes about a minute to make.</p>
				<a class="btn btn--primary" href="/new/">Create a pay link</a>
			</div>
		{:else}
			{#if paidCount > 0}
				<p class="caption">
					{paidCount}
					{paidCount === 1 ? 'envelope is' : 'envelopes are'} paid and waiting to be opened.
				</p>
			{/if}

			<ul class="list">
				{#each envelopes as envelope (envelope.idHex)}
					{@const status = statusOf(envelope)}
					<li class="card row-card">
						<div class="main">
							<div class="row between top">
								<span class="badge" class:badge--verified={status.kind !== 'waiting'}>
									{status.label}
								</span>
								<span class="amount">{formatAmount(envelope.details.amount)} {TOKEN.symbol}</span>
							</div>

							<h4>{envelope.details.client}</h4>
							<p class="muted">{envelope.details.description}</p>

							<dl class="meta">
								<div><dt>Envelope</dt><dd class="mono break">{envelope.idHex}</dd></div>
								{#if status.record}
									<div><dt>Paid by</dt>
										<dd class="mono">
											<a href={explorerAccount(status.record.payer)} target="_blank" rel="noreferrer">
												{status.record.payer}
											</a>
										</dd>
									</div>
									<div><dt>Settled</dt><dd>{formatTimestamp(status.record.paid_at)}</dd></div>
									{#if status.record.payments > 1}
										<div><dt>Payments</dt><dd>{status.record.payments}</dd></div>
									{/if}
								{/if}
							</dl>
						</div>

						{#if status.kind === 'paid'}
							{#if openingIndex === envelope.index}
								<div class="panel opening">
									<p class="label">Open this envelope</p>
									<p class="caption">
										The signature names the destination, so nobody can redirect it. The
										account must already be registered with {TOKEN.id}.
									</p>
									<label class="field">
										<span class="label">Send to</span>
										<input class="mono" bind:value={recipient} placeholder="you.testnet" />
									</label>
									{#if openError}<p class="hint hint--error">{openError}</p>{/if}
									<div class="row">
										{#if wallet.accountId}
											<button
												class="btn btn--primary"
												type="button"
												onclick={() => confirmOpen(envelope)}
												disabled={opening}
											>
												{opening ? 'Signing…' : 'Sign and open'}
											</button>
										{:else}
											<button class="btn btn--primary" type="button" onclick={signIn}>
												Connect a wallet to send it
											</button>
										{/if}
										<button
											class="btn btn--secondary"
											type="button"
											onclick={() => (openingIndex = null)}
										>
											Cancel
										</button>
									</div>
									<p class="caption">
										A wallet is needed only to pay the gas. The right to the money comes from
										the envelope key, which never leaves this browser.
									</p>
								</div>
							{:else}
								<button class="btn btn--primary" type="button" onclick={() => startOpening(envelope)}>
									Open envelope
								</button>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>

			<div class="row">
				<a class="btn btn--secondary" href="/prove/">Build a proof from these</a>
				<a class="btn btn--secondary" href="/new/">Create another pay link</a>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		padding-block: var(--s-band);
		display: grid;
		gap: var(--s-6);
		max-width: 860px;
	}

	.head {
		display: grid;
		gap: var(--s-3);
	}

	.between {
		justify-content: space-between;
		gap: var(--s-4);
	}

	.empty {
		display: grid;
		justify-items: start;
		gap: var(--s-4);
	}

	.list {
		display: grid;
		gap: var(--s-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row-card {
		display: grid;
		gap: var(--s-5);
	}

	.main {
		display: grid;
		gap: var(--s-2);
	}

	.top {
		margin-bottom: var(--s-2);
	}

	.meta {
		display: grid;
		gap: var(--s-2);
		margin: var(--s-3) 0 0;
	}

	.meta div {
		display: grid;
		gap: 2px;
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
		font-size: 14px;
	}

	.break {
		overflow-wrap: anywhere;
	}

	.opening {
		display: grid;
		gap: var(--s-3);
	}

	.caution {
		border-color: var(--caution-line);
		background: var(--caution-fill);
	}

	@media (min-width: 640px) {
		.meta div {
			grid-template-columns: 110px 1fr;
			gap: var(--s-4);
			align-items: baseline;
		}
	}
</style>
