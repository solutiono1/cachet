<script>
	/* One invoice, shown as two copies of the same document: the one the
	 * earner keeps, and the one the chain keeps. A wax spine runs between
	 * them, the way a seal closes a folded letter.
	 *
	 * The payment below is real. It settled on NEAR testnet and can be read
	 * out of the contract by anyone; the links go to it.
	 */
	import Mark from '#lib/components/Mark.svelte';
	import { CONTRACT_ID, TOKEN, explorerAccount } from '#lib/config.js';
	import { formatAmount, formatDate, formatTimestamp } from '#lib/format.js';

	const invoice = {
		reference: '014',
		payee: 'Demo Earner',
		client: 'Northwind Studio',
		description: 'Brand identity, phase one',
		amount: '250000000',
		issued: '2026-11-13',
		payer: 'cachetpayer.testnet',
		paidAt: '1794565257548636040',
		seal: '3925220bcac1e00bcfdbb5a6f5e53467d632f71b1fa7acd484ff2ae5ce35415d',
		envelope: '306480f74b310efa2526593e89c1cde35c1d98d674a0686ce50b35b4dd8240a4'
	};

	const rows = [
		{ label: 'Paid to', value: invoice.payee, keeps: false },
		{ label: 'Paid by', value: invoice.payer, keeps: true, mono: true },
		{ label: 'For', value: invoice.description, keeps: false },
		{ label: 'Amount', value: `${formatAmount(invoice.amount)} ${TOKEN.symbol}`, keeps: true, mono: true },
		{ label: 'Issued', value: formatDate(invoice.issued), keeps: false },
		{ label: 'Settled', value: formatTimestamp(invoice.paidAt), keeps: true }
	];

	let figure = $state(null);
	let sealed = $state(false);

	$effect(() => {
		if (!figure) return;

		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (typeof IntersectionObserver === 'undefined' || still) {
			sealed = true;
			return;
		}

		let timer = 0;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					/* A beat of readable text first, so the collapse is seen
					   happening rather than simply being there. */
					timer = setTimeout(() => (sealed = true), 620);
					observer.disconnect();
				}
			},
			{ threshold: 0.32 }
		);

		observer.observe(figure);
		return () => {
			clearTimeout(timer);
			observer.disconnect();
		};
	});

	const shortSeal = `${invoice.seal.slice(0, 10)}…${invoice.seal.slice(-8)}`;
</script>

<figure bind:this={figure} class="copies" class:sealed>
	<figcaption class="head">
		<span class="ref mono">Invoice {invoice.reference}</span>
		<a class="chip" href={explorerAccount(CONTRACT_ID)} target="_blank" rel="noreferrer">
			<span class="live"></span>
			Settled on NEAR testnet
		</a>
	</figcaption>

	<div class="sheet">
		<section class="side" aria-label="The copy you keep">
			<p class="side-label">Your copy</p>
			<dl>
				{#each rows as row (row.label)}
					<div class="row">
						<dt>{row.label}</dt>
						<dd class:mono={row.mono}>{row.value}</dd>
					</div>
				{/each}
			</dl>
		</section>

		<div class="spine" aria-hidden="true">
			<span class="wax"><Mark size={26} /></span>
		</div>

		<section class="side side--public" aria-label="What the chain records">
			<p class="side-label">The public record</p>
			<dl>
				{#each rows as row, i (row.label)}
					<div class="row">
						<dt>{row.label}</dt>
						<dd class:mono={row.mono}>
							{#if row.keeps}
								{row.value}
							{:else}
								<span class="swap" style="--step:{i * 70}ms">
									<span class="plain">{row.value}</span>
									<span class="struck"></span>
								</span>
							{/if}
						</dd>
					</div>
				{/each}
				<div class="row row--seal">
					<dt>Seal</dt>
					<dd class="mono seal">{shortSeal}</dd>
				</div>
			</dl>
		</section>
	</div>

	<p class="foot caption">
		The right-hand column is everything the contract holds. The seal is a salted
		hash, so it proves the invoice without carrying it.
	</p>
</figure>

<style>
	.copies {
		margin: 0;
		display: grid;
		gap: var(--s-5);
		padding: clamp(20px, 3vw, 36px);
		background: var(--surface);
		border: var(--hair) solid var(--border);
		border-radius: 28px;
		box-shadow: var(--shadow-card);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-3);
		flex-wrap: wrap;
	}

	.ref {
		font-size: 13px;
		color: var(--faint);
		letter-spacing: 0.06em;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: 5px 12px 5px 10px;
		border: var(--hair) solid var(--verified-line);
		border-radius: var(--r-full);
		background: var(--verified-fill);
		color: var(--verified);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		transition: translate var(--fast) var(--ease);
	}

	.chip:hover {
		translate: 0 -1px;
		color: var(--verified);
	}

	.live {
		width: 7px;
		height: 7px;
		border-radius: var(--r-full);
		background: currentColor;
	}

	.sheet {
		display: grid;
		gap: var(--s-5);
	}

	.side {
		display: grid;
		gap: var(--s-4);
		align-content: start;
	}

	.side-label {
		margin: 0;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--faint);
	}

	.side--public .side-label {
		color: var(--accent-text);
	}

	dl {
		display: grid;
		gap: 0;
		margin: 0;
	}

	.row {
		display: grid;
		grid-template-columns: 88px 1fr;
		gap: var(--s-4);
		align-items: baseline;
		padding-block: var(--s-3);
		border-top: var(--hair) solid var(--border-soft);
	}

	.row:first-of-type {
		border-top: 0;
	}

	dt {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--faint);
	}

	dd {
		margin: 0;
		font-size: 15px;
		color: var(--text);
		overflow-wrap: anywhere;
	}

	.seal {
		color: var(--muted);
		font-size: 13px;
	}

	/* The swap: readable text gives way to a struck rule, one row after
	   another, as though a clerk ran a pen through them. */
	.swap {
		position: relative;
		display: inline-grid;
		min-height: 1.4em;
		align-items: center;
	}

	.plain {
		grid-area: 1 / 1;
		transition: opacity 420ms var(--ease) var(--step);
	}

	.struck {
		grid-area: 1 / 1;
		height: 9px;
		width: 0;
		border-radius: var(--r-full);
		background: repeating-linear-gradient(
			90deg,
			color-mix(in srgb, var(--text) 18%, transparent) 0 5px,
			transparent 5px 10px
		);
		transition: width 520ms var(--ease) var(--step);
	}

	.sealed .plain {
		opacity: 0;
	}

	.sealed .struck {
		width: min(190px, 100%);
	}

	/* The spine: a hairline with the seal pressed onto it. */
	.spine {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 48px;
	}

	.spine::before {
		content: '';
		position: absolute;
		inset: 50% 0 auto;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--wax) 42%, transparent) 18%,
			color-mix(in srgb, var(--wax) 42%, transparent) 82%,
			transparent
		);
	}

	.wax {
		position: relative;
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		border-radius: var(--r-full);
		background: var(--surface);
		border: var(--hair) solid color-mix(in srgb, var(--wax) 38%, var(--border));
		transition:
			transform 620ms var(--ease) 180ms,
			box-shadow 620ms var(--ease) 180ms;
	}

	.sealed .wax {
		transform: rotate(-6deg);
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--wax) 9%, transparent);
	}

	.foot {
		max-width: 62ch;
	}

	@media (min-width: 860px) {
		.sheet {
			grid-template-columns: 1fr 56px 1fr;
			gap: 0;
			align-items: start;
		}

		.side {
			padding-inline: clamp(4px, 1.4vw, 20px);
		}

		.spine {
			min-height: 100%;
			align-self: stretch;
		}

		.spine::before {
			inset: 0 50% 0 auto;
			width: 1px;
			height: auto;
			background: linear-gradient(
				180deg,
				transparent,
				color-mix(in srgb, var(--wax) 42%, transparent) 14%,
				color-mix(in srgb, var(--wax) 42%, transparent) 86%,
				transparent
			);
		}
	}
</style>
