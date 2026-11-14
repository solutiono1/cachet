<script>
	/* How a pay link or a proof link is handed over.
	 *
	 * The link is long on purpose: it carries the whole invoice, or the whole
	 * proof, in the part after the #, because Cachet has no server to keep it
	 * on. Long is not the same as messy, so this shows the readable part in
	 * full, shortens the sealed part, and gives three ways to send it: copy,
	 * the system share sheet where there is one, and a QR code for handing it
	 * to a phone.
	 */

	import Qr from './Qr.svelte';
	import { readablePart, shortenPayload, splitLink } from '#lib/link.js';

	let {
		value,
		/* What the sealed part of the link holds, for the explanation. */
		carries = 'invoice',
		shareTitle = 'A link from Cachet',
		shareText = ''
	} = $props();

	let copied = $state(false);
	let failed = $state(false);
	let showQr = $state(false);
	let showAll = $state(false);
	let canShare = $state(false);

	$effect(() => {
		canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	});

	/* Everything up to the # is worth reading; the rest is the sealed payload,
	   and only that part is shortened. What gets copied, shared and encoded is
	   always the whole link. */
	const parts = $derived(splitLink(value));
	const readable = $derived(readablePart(value));
	const shortened = $derived(shortenPayload(parts.tail));

	async function copy() {
		failed = false;
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => (copied = false), 2200);
		} catch {
			failed = true;
			showAll = true;
		}
	}

	async function share() {
		try {
			await navigator.share({ title: shareTitle, text: shareText, url: value });
		} catch {
			/* The person closed the sheet, or the browser refused. Copying is
			   still there, so there is nothing to report. */
		}
	}
</script>

<div class="link">
	<div class="shown">
		<span class="head">{readable}</span><span class="tail">{shortened}</span>
	</div>

	<div class="acts">
		<button class="btn btn--primary" type="button" onclick={copy}>
			{copied ? 'Copied' : 'Copy link'}
		</button>
		{#if canShare}
			<button class="btn btn--secondary" type="button" onclick={share}>Send</button>
		{/if}
		<button
			class="btn btn--quiet"
			type="button"
			onclick={() => (showQr = !showQr)}
			aria-expanded={showQr}
		>
			{showQr ? 'Hide code' : 'QR code'}
		</button>
	</div>
</div>

{#if showQr}
	<div class="code">
		<Qr {value} label="The link as a QR code" />
		<p class="caption">
			Point a phone camera at this to open the same link. The code is drawn in this
			browser rather than by a code service, so the {carries} goes nowhere near a
			server. It does carry everything the link carries, so treat a picture of it the
			way you would treat the link.
		</p>
	</div>
{/if}

{#if failed}
	<p class="hint hint--error">
		Your browser would not let the page use the clipboard. The whole link is below;
		select it and copy.
	</p>
{/if}

<div class="full">
	<button class="plain" type="button" onclick={() => (showAll = !showAll)} aria-expanded={showAll}>
		{showAll ? 'Hide the whole link' : 'Show the whole link'}
	</button>
	{#if showAll}
		<code class="mono raw">{value}</code>
		<p class="caption">
			{parts.tail.length} characters after the <code class="mono">#</code>. That is the
			{carries}, compressed and encoded. Browsers never send that part to any server,
			which is why it can hold the details at all.
		</p>
	{/if}
</div>

<style>
	.link {
		display: grid;
		gap: var(--s-3);
		padding: var(--s-3);
		background: var(--raised);
		border: var(--hair) solid var(--border);
		border-radius: var(--r-sm);
	}

	.shown {
		display: flex;
		align-items: baseline;
		min-width: 0;
		font-size: 14px;
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
	}

	.head {
		flex: none;
		color: var(--text);
		font-weight: 500;
	}

	.tail {
		flex: none;
		font-family: var(--font-mono);
		color: var(--faint);
		letter-spacing: 0.01em;
	}

	.acts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
	}

	.acts .btn {
		flex: none;
	}

	.code {
		display: grid;
		gap: var(--s-3);
		justify-items: start;
		margin-top: var(--s-3);
	}

	.code .caption {
		max-width: 44ch;
	}

	.full {
		display: grid;
		gap: var(--s-2);
		margin-top: var(--s-3);
		justify-items: start;
	}

	.plain {
		padding: 0;
		border: 0;
		background: none;
		color: var(--faint);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--border);
		transition: color var(--fast) var(--ease);
	}

	.plain:hover {
		color: var(--text);
	}

	.raw {
		display: block;
		width: 100%;
		padding: var(--s-3);
		background: var(--raised);
		border: var(--hair) solid var(--border);
		border-radius: var(--r-sm);
		font-size: 12px;
		line-height: 1.6;
		color: var(--muted);
		overflow-wrap: anywhere;
		user-select: all;
	}

	@media (min-width: 560px) {
		.link {
			grid-template-columns: 1fr auto;
			align-items: center;
			gap: var(--s-4);
		}
	}
</style>
