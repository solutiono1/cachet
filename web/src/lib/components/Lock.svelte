<script>
	/* The gate in front of anything that needs the seed. It creates a vault
	   the first time and unlocks it afterwards. */
	import { create, unlock, vault } from '#lib/vault.svelte.js';

	let passphrase = $state('');
	let confirm = $state('');
	let error = $state('');
	let busy = $state(false);

	const creating = $derived(vault.status === 'empty');

	async function submit(event) {
		event.preventDefault();
		error = '';
		busy = true;
		try {
			if (creating) {
				if (passphrase !== confirm) throw new Error('The two passphrases are not the same.');
				await create(passphrase);
			} else {
				await unlock(passphrase);
			}
			passphrase = '';
			confirm = '';
		} catch (problem) {
			error = problem.message;
		} finally {
			busy = false;
		}
	}
</script>

<div class="card gate">
	<h3>{creating ? 'Choose a passphrase' : 'Unlock Cachet'}</h3>
	<p class="muted">
		{#if creating}
			Cachet makes one secret for you and keeps it in this browser, encrypted with this
			passphrase. It is what your invoices and your money hang on. Nobody can reset it,
			so write it down and make a backup from Settings.
		{:else}
			Your invoices are stored in this browser, encrypted.
		{/if}
	</p>

	<form onsubmit={submit} class="stack">
		<label class="field-row">
			<span class="label">Passphrase</span>
			<input
				type="password"
				bind:value={passphrase}
				autocomplete={creating ? 'new-password' : 'current-password'}
				required
				minlength="8"
			/>
		</label>

		{#if creating}
			<label class="field-row">
				<span class="label">Passphrase again</span>
				<input type="password" bind:value={confirm} autocomplete="new-password" required />
			</label>
		{/if}

		{#if error}
			<p class="hint hint--error">{error}</p>
		{/if}

		<button class="btn btn--primary" type="submit" disabled={busy}>
			{busy ? 'Working…' : creating ? 'Create my vault' : 'Unlock'}
		</button>
	</form>
</div>

<style>
	.gate {
		max-width: var(--form);
		display: grid;
		gap: var(--s-4);
	}
</style>
