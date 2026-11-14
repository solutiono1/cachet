<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Lock from '#lib/components/Lock.svelte';
	import Copy from '#lib/components/Copy.svelte';
	import Seal from '#lib/components/Seal.svelte';
	import { addInvoice, load, vault } from '#lib/vault.svelte.js';
	import { encodePayload, payLinkPayload } from '#lib/core/envelope.js';
	import { CONTRACT_ID, MIN_AMOUNT, TOKEN } from '#lib/config.js';
	import { formatAmount, parseAmount, today } from '#lib/format.js';
	import { toHex } from '#lib/core/crypto.js';

	let payee = $state('');
	let client = $state('');
	let description = $state('');
	let amount = $state('');
	let issued = $state(today());

	let error = $state('');
	let busy = $state(false);
	let made = $state(null);

	onMount(load);

	const link = $derived(
		made && browser ? `${location.origin}/pay/#${made.fragment}` : ''
	);

	async function submit(event) {
		event.preventDefault();
		error = '';
		busy = true;
		try {
			const raw = parseAmount(amount);
			if (BigInt(raw) < BigInt(MIN_AMOUNT)) {
				throw new Error(
					`The contract will not accept less than ${formatAmount(MIN_AMOUNT)} ${TOKEN.symbol}.`
				);
			}
			const details = {
				v: 1,
				payee: payee.trim(),
				client: client.trim(),
				description: description.trim(),
				amount: raw,
				token: TOKEN.id,
				issued
			};
			const envelope = await addInvoice(details);
			made = {
				envelope,
				fragment: encodePayload(payLinkPayload(envelope, CONTRACT_ID))
			};
		} catch (problem) {
			error = problem.message;
		} finally {
			busy = false;
		}
	}

	function another() {
		made = null;
		client = '';
		description = '';
		amount = '';
		issued = today();
	}
</script>

<svelte:head><title>Create a pay link on Cachet</title></svelte:head>

<div class="container page">
	{#if !vault.ready}
		<p class="muted">Opening this browser's vault…</p>
	{:else if vault.status !== 'unlocked'}
		<header class="head">
			<p class="eyebrow">New envelope</p>
			<h1>Create a pay link</h1>
			<p class="lede">First, the secret that every invoice hangs on.</p>
		</header>
		<Lock />
	{:else if made}
		<header class="head">
			<div class="sealed"><Seal size={40} pressed /></div>
			<h1>Envelope {made.envelope.index + 1} is sealed</h1>
			<p class="lede">
				Send this link to {made.envelope.details.client}. It carries the invoice and
				nothing else: no account of yours, no other invoice, no way back to you.
			</p>
		</header>

		<section class="card result">
			<div class="row between">
				<p class="label">Pay link</p>
				<span class="badge">Awaiting payment</span>
			</div>
			<Copy value={link} label="Copy link" />

			<dl class="facts">
				<div><dt>Amount</dt><dd class="mono">{formatAmount(made.envelope.details.amount)} {TOKEN.symbol}</dd></div>
				<div><dt>Client</dt><dd>{made.envelope.details.client}</dd></div>
				<div><dt>For</dt><dd>{made.envelope.details.description}</dd></div>
				<div><dt>Envelope id</dt><dd class="mono break">{made.envelope.idHex}</dd></div>
				<div><dt>Seal</dt><dd class="mono break">{toHex(made.envelope.seal)}</dd></div>
			</dl>

			<p class="caption">
				The seal is all the chain ever holds. The invoice itself lives in the link, in
				the part after the <code class="mono">#</code>, which browsers never send to any
				server.
			</p>
		</section>

		<div class="row">
			<a class="btn btn--primary" href="/app/">See my envelopes</a>
			<button class="btn btn--secondary" type="button" onclick={another}>
				Create another
			</button>
		</div>
	{:else}
		<header class="head">
			<h1>Create a pay link</h1>
			<p class="lede">
				One invoice, one envelope, one key. Nothing is written to the chain until your
				client pays.
			</p>
		</header>

		<form class="card form" onsubmit={submit}>
			<label class="field-row">
				<span class="label">Your name, as the client should see it</span>
				<input bind:value={payee} required maxlength="80" placeholder="Solution Nau" />
			</label>

			<label class="field-row">
				<span class="label">Client</span>
				<input bind:value={client} required maxlength="80" placeholder="Northwind Studio" />
			</label>

			<label class="field-row">
				<span class="label">What it is for</span>
				<input
					bind:value={description}
					required
					maxlength="140"
					placeholder="Brand identity, phase one"
				/>
			</label>

			<div class="pair">
				<label class="field-row">
					<span class="label">Amount in {TOKEN.symbol}</span>
					<input class="mono" bind:value={amount} required inputmode="decimal" placeholder="250.00" />
				</label>

				<label class="field-row">
					<span class="label">Issued</span>
					<input type="date" bind:value={issued} required />
				</label>
			</div>

			{#if error}<p class="hint hint--error">{error}</p>{/if}

			<button class="btn btn--primary" type="submit" disabled={busy}>
				{busy ? 'Sealing…' : 'Seal and make the link'}
			</button>

			<p class="caption">
				These details stay in this browser and inside the link you send. Cachet has no
				server to send them to.
			</p>
		</form>
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

	.sealed {
		display: flex;
	}

	.form,
	.result {
		display: grid;
		gap: var(--s-5);
	}

	.pair {
		display: grid;
		gap: var(--s-5);
	}

	.between {
		justify-content: space-between;
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

	@media (min-width: 640px) {
		.pair {
			grid-template-columns: 1fr 200px;
		}

		.facts div {
			grid-template-columns: 140px 1fr;
			gap: var(--s-4);
			align-items: baseline;
		}
	}
</style>
