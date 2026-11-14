<script>
	/* What this invoice would cost from another chain, priced live.
	 *
	 * The numbers come from the real NEAR Intents 1Click API, now, as a dry
	 * quote: nothing is reserved, no deposit address is made and nobody can
	 * send anything. Settlement needs mainnet, which this testnet build does
	 * not do, and the panel says so rather than implying otherwise.
	 */
	import { SOURCES, quoteFor } from '#lib/intents.js';
	import { formatAmount } from '#lib/format.js';
	import { TOKEN } from '#lib/config.js';

	let { amount } = $props();

	let open = $state(false);
	let picked = $state(SOURCES[0]);
	let quote = $state(null);
	let loading = $state(false);
	let error = $state('');
	let controller = null;

	async function load(source) {
		picked = source;
		error = '';
		quote = null;
		loading = true;
		controller?.abort();
		controller = new AbortController();
		try {
			quote = await quoteFor(source, amount, { signal: controller.signal });
		} catch (problem) {
			if (problem.name !== 'AbortError') error = problem.message;
		} finally {
			loading = false;
		}
	}

	function toggle() {
		open = !open;
		if (open && !quote && !loading) load(picked);
	}
</script>

<section class="cross">
	<button class="opener" type="button" onclick={toggle} aria-expanded={open}>
		<span>
			<span class="title">Paying from another chain?</span>
			<span class="caption">See the live price from Base, Solana, Ethereum and more</span>
		</span>
		<svg
			viewBox="0 0 16 16"
			width="16"
			height="16"
			fill="none"
			aria-hidden="true"
			class:flipped={open}
		>
			<path
				d="M4 6.5 8 10.5l4-4"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	{#if open}
		<div class="body">
			<div class="chains" role="group" aria-label="Pay from">
				{#each SOURCES as source (source.id)}
					<button
						type="button"
						class="chip"
						class:on={picked.id === source.id}
						onclick={() => load(source)}
					>
						{source.chain}
						<span class="sym mono">{source.symbol}</span>
					</button>
				{/each}
			</div>

			<div class="readout" aria-live="polite">
				{#if loading}
					<p class="muted">Asking NEAR Intents for a price…</p>
				{:else if error}
					<p class="hint hint--error">{error}</p>
				{:else if quote}
					<div class="line">
						<span class="leg">
							<span class="label">You send</span>
							<span class="amount mono">{quote.pays}</span>
							<span class="where">{quote.source.symbol} on {quote.source.chain}</span>
						</span>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
							<path
								d="M4 12h15M13.5 6.5 20 12l-6.5 5.5"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<span class="leg">
							<span class="label">They receive</span>
							<span class="amount mono">{formatAmount(amount)}</span>
							<span class="where">{TOKEN.symbol} on NEAR</span>
						</span>
					</div>
				{/if}
			</div>

			<p class="caption note">
				A live quote from the NEAR Intents 1Click API, priced this minute, including
				the 0.25% fee charged without a partner key. It reserves nothing: no deposit
				address exists and nothing can be sent against it. Settling this way needs
				mainnet, which this testnet build does not do. It is the first item on the
				roadmap.
			</p>
		</div>
	{/if}
</section>

<style>
	.cross {
		border: var(--hair) solid var(--border);
		border-radius: var(--r-panel);
		background: color-mix(in srgb, var(--surface) 55%, transparent);
		overflow: hidden;
	}

	.opener {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-4);
		width: 100%;
		padding: var(--s-4) var(--s-5);
		background: none;
		border: 0;
		color: var(--text);
		text-align: left;
		cursor: pointer;
		transition: background-color var(--fast) var(--ease);
	}

	.opener:hover {
		background: color-mix(in srgb, var(--text) 4%, transparent);
	}

	.opener > span {
		display: grid;
		gap: 2px;
	}

	.title {
		font-weight: 600;
		font-size: 15px;
	}

	.opener svg {
		flex: none;
		color: var(--muted);
		transition: rotate var(--fast) var(--ease);
	}

	.opener svg.flipped {
		rotate: 180deg;
	}

	.body {
		display: grid;
		gap: var(--s-4);
		padding: 0 var(--s-5) var(--s-5);
	}

	.chains {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
	}

	.chip {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		padding: 7px 12px;
		border: var(--hair) solid var(--border);
		border-radius: var(--r-full);
		background: transparent;
		color: var(--muted);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition:
			color var(--fast) var(--ease),
			border-color var(--fast) var(--ease),
			background-color var(--fast) var(--ease);
	}

	.chip:hover {
		color: var(--text);
		border-color: color-mix(in srgb, var(--text) 24%, transparent);
	}

	.chip.on {
		color: var(--text);
		border-color: color-mix(in srgb, var(--wax) 48%, transparent);
		background: color-mix(in srgb, var(--wax) 10%, transparent);
	}

	.sym {
		font-size: 10.5px;
		color: var(--faint);
	}

	.readout {
		min-height: 64px;
		display: grid;
		align-items: center;
	}

	.line {
		display: flex;
		align-items: center;
		gap: var(--s-5);
		flex-wrap: wrap;
		color: var(--muted);
	}

	.leg {
		display: grid;
		gap: 1px;
	}

	.leg .amount {
		font-size: 19px;
		color: var(--text);
		letter-spacing: -0.02em;
	}

	.where {
		font-size: 12px;
		color: var(--faint);
	}

	.note {
		max-width: 62ch;
	}
</style>
