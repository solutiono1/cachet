<script>
	/* The wax seal. The one piece of illustration in the product.
	   `pressed` plays the press animation once, used when something is
	   paid or verified. */
	let { size = 28, pressed = false, title = '' } = $props();
</script>

<span class="seal" class:pressed style="--size:{size}px">
	<svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} focusable="false">
		{#if title}<title>{title}</title>{/if}
		<path
			class="wax"
			d="M50 5 C68 5 83 13 90 29 C96 41 96 57 89 69 C82 83 68 95 50 95 C33 95 18 86 11 70 C5 57 6 40 12 28 C20 13 33 5 50 5 Z"
		/>
		<circle class="ring" cx="50" cy="50" r="35" />
		<text class="mark" x="50" y="50" text-anchor="middle" dominant-baseline="central">C</text>
	</svg>
</span>

<style>
	.seal {
		display: inline-flex;
		line-height: 0;
	}

	.wax {
		fill: var(--wax);
	}

	.ring {
		fill: none;
		stroke: rgba(255, 255, 255, 0.34);
		stroke-width: 1.5;
	}

	.mark {
		font-family: var(--font-display);
		font-size: 44px;
		font-weight: 600;
		fill: rgba(255, 255, 255, 0.92);
	}

	.pressed svg {
		animation: press 400ms cubic-bezier(0.2, 0, 0, 1) 1;
		filter: drop-shadow(0 2px 6px var(--seal-shadow));
	}

	@keyframes press {
		0% {
			transform: scale(1.35) rotate(-8deg);
			opacity: 0;
		}
		60% {
			transform: scale(0.96) rotate(1deg);
			opacity: 1;
		}
		100% {
			transform: scale(1) rotate(0deg);
			opacity: 1;
		}
	}
</style>
