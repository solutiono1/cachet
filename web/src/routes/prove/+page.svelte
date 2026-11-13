<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Lock from '#lib/components/Lock.svelte';
	import Copy from '#lib/components/Copy.svelte';
	import Seal from '#lib/components/Seal.svelte';
	import { allEnvelopes, load, vault } from '#lib/vault.svelte.js';
	import { fetchEnvelopes } from '#lib/near.js';
	import { buildProof } from '#lib/core/proof.js';
	import { encodePayload } from '#lib/core/envelope.js';
	import { CONTRACT_ID, TOKEN } from '#lib/config.js';
	import { formatAmount, formatDate, monthsFromNow } from '#lib/format.js';

	let envelopes = $state([]);
	let records = $state(new Map());
	let loading = $state(true);
	let chainError = $state('');

	let chosen = $state(new Set());
	let audience = $state('');
	let purpose = $state('');
	let expires = $state(monthsFromNow(3));
	let error = $state('');
	let made = $state(null);

	onMount(async () => {
		load();
		if (vault.status === 'unlocked') await read();
		else loading = false;
	});

	$effect(() => {
		if (vault.status === 'unlocked' && loading && envelopes.length === 0 && !chainError) read();
	});

	async function read() {
		loading = true;
		chainError = '';
		try {
			envelopes = await allEnvelopes();
			if (envelopes.length) records = await fetchEnvelopes(envelopes.map((e) => e.idHex));
		} catch (problem) {
			chainError = problem.message;
		} finally {
			loading = false;
		}
	}

	const payable = $derived(envelopes.filter((e) => records.get(e.idHex)));

	function toggle(idHex) {
		const next = new Set(chosen);
		if (next.has(idHex)) next.delete(idHex);
		else next.add(idHex);
		chosen = next;
	}

	const selected = $derived(payable.filter((e) => chosen.has(e.idHex)));

	const total = $derived(
		selected.reduce((sum, e) => sum + BigInt(e.details.amount), 0n).toString()
	);

	async function make(event) {
		event.preventDefault();
		error = '';
		if (selected.length === 0) {
			error = 'Choose at least one payment to disclose.';
			return;
		}
		try {
			const statement = {
				v: 1,
				payee: selected[0].details.payee,
				audience: audience.trim(),
				purpose: purpose.trim(),
				expires
			};
			const proof = await buildProof(selected, statement, CONTRACT_ID);
			made = { proof, fragment: encodePayload(proof) };
		} catch (problem) {
			error = problem.message;
		}
	}

	const link = $derived(made && browser ? `${location.origin}/verify/#${made.fragment}` : '');

	function download() {
		const blob = new Blob([JSON.stringify(made.proof, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `cachet-proof-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head><title>Build a proof — Cachet</title></svelte:head>

<div class="container page">
	{#if !vault.ready}
		<p class="muted">Opening this browser's vault…</p>
	{:else if vault.status !== 'unlocked'}
		<header class="head">
			<h1>Build a proof</h1>
			<p class="lede">Unlock the vault that holds your invoices.</p>
		</header>
		<Lock />
	{:else if made}
		<header class="head">
			<div class="row"><Seal size={40} pressed /></div>
			<h1>Proof ready</h1>
			<p class="lede">
				{made.proof.items.length}
				{made.proof.items.length === 1 ? 'payment' : 'payments'} for
				{made.proof.statement.audience}. Anyone can check it against the chain; nothing
				you left out is in the file.
			</p>
		</header>

		<section class="card result">
			<p class="label">Link to send</p>
			<Copy value={link} label="Copy link" />
			<div class="row">
				<button class="btn btn--secondary" type="button" onclick={download}>
					Download the file instead
				</button>
				<a class="btn btn--secondary" href="/verify/#{made.fragment}">Check it yourself</a>
			</div>
			<p class="caption">
				The proof travels in the part of the link after the <code class="mono">#</code>,
				so it is never sent to a server, not even to load this page.
			</p>
		</section>

		<button class="btn btn--quiet" type="button" onclick={() => (made = null)}>
			Build another proof
		</button>
	{:else}
		<header class="head">
			<h1>Build a proof</h1>
			<p class="lede">
				Choose which payments to show. Everything else stays private, and cannot be
				worked out from what you send.
			</p>
		</header>

		{#if chainError}
			<div class="panel caution">
				<p class="label">The chain could not be read</p>
				<p class="muted">{chainError}</p>
			</div>
		{/if}

		{#if loading}
			<p class="muted">Reading your envelopes from the chain…</p>
		{:else if payable.length === 0}
			<div class="card empty">
				<h3>No payments to prove yet</h3>
				<p class="muted">
					A proof can only contain payments that have really settled. Once a client pays
					an envelope, it appears here.
				</p>
				<a class="btn btn--primary" href="/app/">See my envelopes</a>
			</div>
		{:else}
			<form class="stack" onsubmit={make}>
				<section class="card">
					<p class="label">Payments to disclose</p>
					<ul class="picks">
						{#each payable as envelope (envelope.idHex)}
							<li>
								<label class="pick">
									<input
										type="checkbox"
										checked={chosen.has(envelope.idHex)}
										onchange={() => toggle(envelope.idHex)}
									/>
									<span class="pick-main">
										<span class="pick-top">
											<strong>{envelope.details.client}</strong>
											<span class="mono">{formatAmount(envelope.details.amount)} {TOKEN.symbol}</span>
										</span>
										<span class="caption">
											{envelope.details.description} · {formatDate(envelope.details.issued)}
										</span>
									</span>
								</label>
							</li>
						{/each}
					</ul>
					{#if selected.length}
						<p class="chosen mono">
							{selected.length} selected · {formatAmount(total)} {TOKEN.symbol}
						</p>
					{/if}
				</section>

				<section class="card stack">
					<p class="label">Who it is for</p>
					<label class="field">
						<span class="label">Name of the person or company</span>
						<input bind:value={audience} required maxlength="80" placeholder="Harbour Lettings" />
					</label>
					<label class="field">
						<span class="label">What they need it for</span>
						<input bind:value={purpose} required maxlength="140" placeholder="Rental application" />
					</label>
					<label class="field">
						<span class="label">Stops being valid</span>
						<input type="date" bind:value={expires} required />
					</label>
					<p class="caption">
						These three lines are signed along with the payments, so the proof cannot be
						passed off as having been made for someone else.
					</p>
				</section>

				{#if error}<p class="hint hint--error">{error}</p>{/if}

				<button class="btn btn--primary" type="submit">Sign the proof</button>
			</form>
		{/if}
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

	.result {
		display: grid;
		gap: var(--s-4);
	}

	.empty {
		display: grid;
		justify-items: start;
		gap: var(--s-4);
	}

	.picks {
		display: grid;
		gap: 0;
		margin: var(--s-4) 0 0;
		padding: 0;
		list-style: none;
	}

	.pick {
		display: flex;
		align-items: flex-start;
		gap: var(--s-3);
		padding-block: var(--s-4);
		border-top: var(--hair) solid var(--border);
		cursor: pointer;
	}

	.pick input {
		width: 20px;
		height: 20px;
		margin-top: 2px;
		accent-color: var(--wax);
		flex: none;
	}

	.pick-main {
		display: grid;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.pick-top {
		display: flex;
		justify-content: space-between;
		gap: var(--s-3);
		flex-wrap: wrap;
	}

	.chosen {
		margin-top: var(--s-4);
		padding-top: var(--s-4);
		border-top: 2px solid var(--wax);
		font-size: 14px;
	}

	.caution {
		border-color: var(--caution-line);
		background: var(--caution-fill);
	}
</style>
