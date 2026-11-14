<script>
	/* Test money, without sending anyone off to find a faucet.
	 *
	 * The token on this deployment is a testnet fake that lets any account
	 * mint. So the button below is one transaction the person signs for
	 * themselves. Cachet holds no keys and runs no service to make it work.
	 */
	import { TOKEN } from '#lib/config.js';
	import { formatAmount } from '#lib/format.js';
	import { isRegistered, tokenBalance } from '#lib/near.js';
	import { FAUCET_AMOUNT, claimTestTokens, signIn, wallet } from '#lib/wallet.svelte.js';

	let { compact = false, onfunded = () => {} } = $props();

	let balance = $state(null);
	let busy = $state(false);
	let error = $state('');
	let done = $state(false);
	let checkedFor = $state(null);

	$effect(() => {
		if (wallet.accountId && checkedFor !== wallet.accountId) {
			checkedFor = wallet.accountId;
			read();
		}
	});

	async function read() {
		try {
			balance = await tokenBalance(TOKEN.id, wallet.accountId);
		} catch {
			balance = null;
		}
	}

	async function claim() {
		error = '';
		busy = true;
		try {
			const registered = await isRegistered(TOKEN.id, wallet.accountId);
			await claimTestTokens(wallet.accountId, { needsRegistration: !registered });
			await read();
			done = true;
			onfunded();
		} catch (problem) {
			error = problem.message;
		} finally {
			busy = false;
		}
	}
</script>

<div class="faucet" class:compact>
	<div class="copy">
		<p class="label">Test money</p>
		{#if wallet.accountId}
			<p class="muted">
				{#if balance !== null}
					<span class="mono">{wallet.accountId}</span> holds
					<span class="mono">{formatAmount(balance)} {TOKEN.symbol}</span>.
				{:else}
					Mint yourself {formatAmount(FAUCET_AMOUNT)}
					{TOKEN.symbol} to try Cachet.
				{/if}
			</p>
		{:else}
			<p class="muted">
				Connect a wallet and mint yourself {formatAmount(FAUCET_AMOUNT)}
				{TOKEN.symbol}. It is a testnet token with no value.
			</p>
		{/if}
	</div>

	<div class="act">
		{#if wallet.accountId}
			<button class="btn btn--secondary btn--sm" type="button" onclick={claim} disabled={busy}>
				{busy ? 'Minting…' : done ? 'Mint more' : `Get ${formatAmount(FAUCET_AMOUNT)} ${TOKEN.symbol}`}
			</button>
		{:else}
			<button class="btn btn--secondary btn--sm" type="button" onclick={signIn}>
				Connect a wallet
			</button>
		{/if}
	</div>

	{#if error}<p class="hint hint--error">{error}</p>{/if}
</div>

<style>
	.faucet {
		display: grid;
		gap: var(--s-3);
		padding: var(--s-5);
		background: color-mix(in srgb, var(--surface) 64%, transparent);
		border: var(--hair) dashed color-mix(in srgb, var(--wax) 34%, var(--border));
		border-radius: var(--r-panel);
	}

	.copy {
		display: grid;
		gap: var(--s-2);
	}

	@media (min-width: 640px) {
		.faucet {
			grid-template-columns: 1fr auto;
			align-items: center;
			gap: var(--s-5);
		}

		.faucet .hint {
			grid-column: 1 / -1;
		}
	}
</style>
