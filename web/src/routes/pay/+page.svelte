<script>
	import { onMount } from 'svelte';
	import Seal from '#lib/components/Seal.svelte';
	import { decodePayload, readPayLink } from '#lib/core/envelope.js';
	import { toHex } from '#lib/core/crypto.js';
	import { fetchEnvelopes, isRegistered, tokenBalance } from '#lib/near.js';
	import { CONTRACT_ID, TOKEN, explorerAccount, explorerTx } from '#lib/config.js';
	import { formatAmount, formatDate, formatTimestamp } from '#lib/format.js';
	import { payEnvelope, registerWithToken, restore, signIn, wallet } from '#lib/wallet.svelte.js';

	let invoice = $state(null);
	let problem = $state('');
	let record = $state(null);
	let balance = $state(null);
	let registered = $state(true);
	let paying = $state(false);
	let payError = $state('');
	let justPaid = $state(null);

	onMount(async () => {
		const hashes = new URLSearchParams(location.search).get('transactionHashes');
		if (hashes) justPaid = hashes.split(',')[0];

		const fragment = location.hash.slice(1);
		if (!fragment) {
			problem = 'This page needs a pay link. The part after the # is missing.';
			return;
		}
		try {
			invoice = await readPayLink(decodePayload(fragment));
		} catch (error) {
			problem = `This link could not be read. ${error.message}`;
			return;
		}
		await Promise.all([refreshRecord(), restore()]);
		if (wallet.accountId) await refreshWallet();
	});

	/* Read the payer's balance once per connected account, not on every
	   change that a failed read would cause. */
	let checkedFor = $state(null);

	$effect(() => {
		if (wallet.accountId && invoice && checkedFor !== wallet.accountId) {
			checkedFor = wallet.accountId;
			refreshWallet();
		}
	});

	async function refreshRecord() {
		try {
			const found = await fetchEnvelopes([invoice.idHex]);
			record = found.get(invoice.idHex) ?? null;
		} catch (error) {
			payError = `The chain could not be read: ${error.message}`;
		}
	}

	async function refreshWallet() {
		try {
			balance = await tokenBalance(TOKEN.id, wallet.accountId);
			registered = await isRegistered(TOKEN.id, CONTRACT_ID);
		} catch {
			balance = null;
		}
	}

	async function pay() {
		payError = '';
		paying = true;
		try {
			await payEnvelope({
				claimHex: toHex(invoice.claimPublicKey),
				sealHex: toHex(invoice.seal),
				amount: invoice.details.amount
			});
			await refreshRecord();
		} catch (error) {
			payError = error.message;
		} finally {
			paying = false;
		}
	}

	const enough = $derived(
		balance !== null && BigInt(balance) >= BigInt(invoice?.details.amount ?? 0)
	);
	const settled = $derived(Boolean(record));
</script>

<svelte:head>
	<title>{invoice ? `Pay ${invoice.details.payee} — Cachet` : 'Pay — Cachet'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container page">
	{#if problem}
		<div class="card">
			<h1>This link is not readable</h1>
			<p class="lede">{problem}</p>
			<p class="muted">
				A Cachet pay link ends in a long code after a <code class="mono">#</code>. If the
				link was shortened or wrapped by a chat app, ask the sender for the whole thing.
			</p>
		</div>
	{:else if !invoice}
		<p class="muted">Reading the invoice…</p>
	{:else}
		<header class="head">
			<p class="label">Invoice from {invoice.details.payee}</p>
			<h1>{formatAmount(invoice.details.amount)} {TOKEN.symbol}</h1>
			<p class="lede">{invoice.details.description}</p>
		</header>

		<section class="card letter">
			<dl class="facts">
				<div><dt>To</dt><dd>{invoice.details.client}</dd></div>
				<div><dt>Issued</dt><dd>{formatDate(invoice.details.issued)}</dd></div>
				<div><dt>Pay into</dt>
					<dd class="mono">
						<a href={explorerAccount(invoice.contractId)} target="_blank" rel="noreferrer">
							{invoice.contractId}
						</a>
					</dd>
				</div>
				<div><dt>Envelope</dt><dd class="mono break">{invoice.idHex}</dd></div>
			</dl>

			{#if settled}
				<div class="paid">
					<Seal size={40} pressed title="Paid" />
					<div>
						<h3>Paid</h3>
						<p class="muted">
							{formatAmount(record.amount)}
							{TOKEN.symbol} settled {formatTimestamp(record.paid_at)}, from
							<span class="mono">{record.payer}</span>.
							{#if record.opened}
								The money has since been collected.
							{/if}
						</p>
						{#if justPaid}
							<p class="caption">
								<a href={explorerTx(justPaid)} target="_blank" rel="noreferrer">
									See the transaction
								</a>
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="act">
					{#if !wallet.accountId}
						<button class="btn btn--primary btn--block-sm" type="button" onclick={signIn}>
							Connect a wallet to pay
						</button>
						<p class="caption">
							MyNearWallet opens in a new page. No browser extension is needed.
						</p>
					{:else}
						<div class="row between">
							<p class="caption">
								Paying as <span class="mono">{wallet.accountId}</span>
								{#if balance !== null}
									· {formatAmount(balance)} {TOKEN.symbol} available
								{/if}
							</p>
						</div>

						{#if !registered}
							<div class="panel caution">
								<p class="muted">
									Cachet is not registered with {TOKEN.id} yet, so the payment would
									bounce.
								</p>
								<button
									class="btn btn--quiet"
									type="button"
									onclick={() => registerWithToken(CONTRACT_ID)}
								>
									Register it
								</button>
							</div>
						{:else if balance !== null && !enough}
							<p class="hint hint--error">
								That wallet holds {formatAmount(balance)} {TOKEN.symbol}, which is less than
								this invoice.
							</p>
						{/if}

						<button
							class="btn btn--primary btn--block-sm"
							type="button"
							onclick={pay}
							disabled={paying || (balance !== null && !enough) || !registered}
						>
							{paying ? 'Opening your wallet…' : `Pay ${formatAmount(invoice.details.amount)} ${TOKEN.symbol}`}
						</button>
					{/if}

					{#if payError}<p class="hint hint--error">{payError}</p>{/if}
				</div>
			{/if}
		</section>

		<section class="panel note">
			<p class="label">What you are paying into</p>
			<p class="muted">
				The money goes to the Cachet contract under a key made for this invoice alone.
				{invoice.details.payee} is not named on the chain, and this page cannot tell you
				their account, their balance, or who else pays them. Only the holder of this
				envelope's key can collect it.
			</p>
		</section>
	{/if}
</div>

<style>
	.page {
		padding-block: var(--s-band);
		display: grid;
		gap: var(--s-6);
		max-width: 680px;
	}

	.head {
		display: grid;
		gap: var(--s-2);
	}

	.head h1 {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-size: clamp(2.25rem, 1.6rem + 2.6vw, 3.25rem);
		font-weight: 500;
		letter-spacing: -0.03em;
	}

	.letter {
		display: grid;
		gap: var(--s-6);
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
		border-top: var(--hair) solid var(--border);
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

	.act {
		display: grid;
		gap: var(--s-3);
	}

	.between {
		justify-content: space-between;
	}

	.paid {
		display: flex;
		align-items: flex-start;
		gap: var(--s-4);
	}

	.paid h3 {
		color: var(--verified);
		margin-bottom: var(--s-1);
	}

	.caution {
		display: grid;
		gap: var(--s-3);
		justify-items: start;
		border-color: var(--caution-line);
		background: var(--caution-fill);
	}

	.note {
		display: grid;
		gap: var(--s-2);
	}

	@media (min-width: 640px) {
		.facts div {
			grid-template-columns: 120px 1fr;
			gap: var(--s-4);
			align-items: baseline;
		}
	}
</style>
