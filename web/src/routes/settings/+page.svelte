<script>
	import { onMount } from 'svelte';
	import Lock from '#lib/components/Lock.svelte';
	import { backupText, forget, load, lock, restore, vault } from '#lib/vault.svelte.js';
	import Faucet from '#lib/components/Faucet.svelte';
	import { CONTRACT_ID, NETWORK, TOKEN, explorerAccount } from '#lib/config.js';

	let message = $state('');
	let error = $state('');
	let restorePassphrase = $state('');
	let restoreText = $state('');
	let confirmForget = $state(false);

	onMount(load);

	function download() {
		error = '';
		try {
			const blob = new Blob([backupText()], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `cachet-backup-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
			message = 'Backup saved. It is encrypted with your passphrase.';
		} catch (problem) {
			error = problem.message;
		}
	}

	async function pickFile(event) {
		const file = event.currentTarget.files?.[0];
		if (file) restoreText = await file.text();
	}

	async function doRestore(event) {
		event.preventDefault();
		error = '';
		message = '';
		try {
			await restore(restoreText.trim(), restorePassphrase);
			restoreText = '';
			restorePassphrase = '';
			message = 'Restored. Your envelopes are back.';
		} catch (problem) {
			error = problem.message;
		}
	}

	function doForget() {
		forget();
		confirmForget = false;
		message = 'This browser no longer holds the vault.';
	}
</script>

<svelte:head><title>Settings on Cachet</title></svelte:head>

<div class="container page">
	<header class="head">
		<p class="eyebrow">This device</p>
			<h1>Settings</h1>
		<p class="lede">Your vault, and where this copy of Cachet points.</p>
	</header>

	{#if message}<div class="panel good"><p class="muted">{message}</p></div>{/if}
	{#if error}<div class="panel caution"><p class="muted">{error}</p></div>{/if}

	{#if vault.ready && vault.status !== 'unlocked'}
		<Lock />
	{:else if vault.ready}
		<section class="card stack">
			<h3>Back up your vault</h3>
			<p class="muted">
				The file holds your seed and your invoice records, encrypted with your
				passphrase. Without it, a lost browser means unopened envelopes cannot be
				collected and past payments cannot be proven. Nobody can reissue it.
			</p>
			<div class="row">
				<button class="btn btn--primary" type="button" onclick={download}>
					Download the backup
				</button>
				<button class="btn btn--secondary" type="button" onclick={lock}>Lock this browser</button>
			</div>
			<p class="caption">
				{vault.invoices.length}
				{vault.invoices.length === 1 ? 'invoice' : 'invoices'} stored here.
			</p>
		</section>
	{/if}

	<section class="card stack">
		<h3>Restore from a backup</h3>
		<p class="muted">
			This replaces whatever is in this browser with the contents of the file.
		</p>
		<form class="stack" onsubmit={doRestore}>
			<label class="field-row">
				<span class="label">Backup file</span>
				<input type="file" accept="application/json,.json" onchange={pickFile} />
			</label>
			<label class="field-row">
				<span class="label">The passphrase it was saved with</span>
				<input type="password" bind:value={restorePassphrase} autocomplete="current-password" />
			</label>
			<button class="btn btn--secondary" type="submit" disabled={!restoreText || !restorePassphrase}>
				Restore
			</button>
		</form>
	</section>

	<section class="card stack">
		<h3>Test money</h3>
		<p class="muted">
			This deployment runs on a testnet token that anyone may mint, so you can fund
			yourself here instead of hunting for a faucet. It has no value.
		</p>
		<Faucet />
	</section>

	<section class="card stack">
		<h3>This deployment</h3>
		<dl class="facts">
			<div><dt>Network</dt><dd class="mono">NEAR {NETWORK}</dd></div>
			<div><dt>Contract</dt>
				<dd class="mono">
					<a href={explorerAccount(CONTRACT_ID)} target="_blank" rel="noreferrer">{CONTRACT_ID}</a>
				</dd>
			</div>
			<div><dt>Token</dt>
				<dd class="mono">
					<a href={explorerAccount(TOKEN.id)} target="_blank" rel="noreferrer">{TOKEN.id}</a>
				</dd>
			</div>
		</dl>
		<p class="caption">
			Testnet software, not audited. The contract has no owner and no upgrade method,
			so these addresses cannot change under you.
		</p>
	</section>

	{#if vault.ready && vault.status !== 'empty'}
		<section class="card stack danger">
			<h3>Forget this browser</h3>
			<p class="muted">
				Removes the encrypted vault from this device. Anything you have not backed up is
				gone for good, including the right to open envelopes that are already paid.
			</p>
			{#if confirmForget}
				<div class="row">
					<button class="btn btn--primary" type="button" onclick={doForget}>
						Yes, forget it
					</button>
					<button class="btn btn--secondary" type="button" onclick={() => (confirmForget = false)}>
						Keep it
					</button>
				</div>
			{:else}
				<button class="btn btn--secondary" type="button" onclick={() => (confirmForget = true)}>
					Forget the vault
				</button>
			{/if}
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
		gap: var(--s-3);
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

	.good {
		border-color: var(--verified-line);
		background: var(--verified-fill);
	}

	.caution {
		border-color: var(--caution-line);
		background: var(--caution-fill);
	}

	.danger {
		border-color: var(--caution-line);
	}

	@media (min-width: 640px) {
		.facts div {
			grid-template-columns: 110px 1fr;
			gap: var(--s-4);
			align-items: baseline;
		}
	}
</style>
