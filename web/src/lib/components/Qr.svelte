<script>
	/* A QR code, drawn here in the browser.
	 *
	 * A pay link carries the invoice itself, so it must never be sent to a
	 * service that renders codes for you. This encodes it locally and draws
	 * the modules as one SVG path, which keeps it to a single element and
	 * needs no raw markup, so the application still contains no {@html}.
	 */

	import encodeQR from '@paulmillr/qr';
	import { modulesToPath } from '#lib/link.js';

	let { value, size = 320, label = 'QR code' } = $props();

	/* A Cachet link is long, so the code is dense: around 75 modules across.
	   Error correction stays at the lowest level on purpose, because that
	   trades redundancy nobody needs on a clean screen for fewer modules,
	   and fewer modules is what makes a phone camera lock on. Encoding throws
	   rather than truncating when a link will not fit at all, which is the
	   honest outcome: a code that cannot hold the link is not shown. */
	const matrix = $derived.by(() => {
		if (!value) return null;
		try {
			return encodeQR(value, 'raw', { ecc: 'low', encoding: 'byte', border: 3 });
		} catch {
			return null;
		}
	});

	const path = $derived(modulesToPath(matrix));
	const span = $derived(matrix ? matrix.length : 0);
</script>

{#if path}
	<svg
		class="qr"
		style:--qr-size="{size}px"
		viewBox="0 0 {span} {span}"
		role="img"
		aria-label={label}
		shape-rendering="crispEdges"
	>
		<rect width={span} height={span} fill="#ffffff" />
		<path d={path} fill="#000000" />
	</svg>
{:else}
	<p class="hint">This link is too long to show as a QR code.</p>
{/if}

<style>
	.qr {
		display: block;
		/* A dense code needs every pixel it can get, so it takes the width it
		   is given and never overflows a narrow phone. */
		width: min(100%, var(--qr-size));
		height: auto;
		aspect-ratio: 1;
		border-radius: var(--r-sm);
		/* The code stays black on white in both themes, because that is what
		   phone cameras are trained on. The frame keeps it from floating. */
		padding: var(--s-2);
		background: #ffffff;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
	}
</style>
