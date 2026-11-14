<script>
	/* The hero object: a letter, folded shut, with a wax seal pressed over
	   the flap. Drawn with geometry rather than illustration, so it stays
	   crisp at any size and in both themes. The seal presses down once when
	   the page opens. */
	let { animate = true } = $props();
</script>

<div class="scene" class:animate>
	<svg viewBox="0 0 420 320" role="img" aria-label="A letter closed with a wax seal" fill="none">
		<defs>
			<linearGradient id="waxFace" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="var(--wax-light)" />
				<stop offset="0.55" stop-color="var(--wax)" />
				<stop offset="1" stop-color="var(--wax-deep)" />
			</linearGradient>
			<clipPath id="letterClip">
				<rect x="60" y="54" width="300" height="212" rx="3" />
			</clipPath>
		</defs>

		<!-- the sheet behind, suggesting more than one invoice -->
		<g class="behind">
			<rect
				x="78"
				y="40"
				width="300"
				height="212"
				rx="3"
				fill="var(--surface)"
				stroke="var(--border)"
				stroke-width="1.25"
			/>
		</g>

		<!-- the letter itself -->
		<g class="letter">
			<rect
				x="60"
				y="54"
				width="300"
				height="212"
				rx="3"
				fill="var(--surface)"
				stroke="var(--border)"
				stroke-width="1.25"
			/>

			<g clip-path="url(#letterClip)">
				<!-- the flap, folded down -->
				<path
					d="M60 54 L210 168 L360 54"
					stroke="var(--border)"
					stroke-width="1.25"
					stroke-linejoin="round"
				/>
				<!-- ruled lines, the shape of an invoice rather than its contents -->
				<g class="rules" stroke="var(--border)" stroke-width="1.25" stroke-linecap="round">
					<path d="M96 200 H212" />
					<path d="M96 218 H180" />
					<path d="M248 200 H324" opacity="0.65" />
				</g>
			</g>
		</g>

		<!-- the seal, pressed over the join -->
		<g class="seal">
			<ellipse class="shade" cx="210" cy="178" rx="46" ry="12" fill="var(--seal-shadow)" />
			<path
				class="wax"
				d="M210 124 C234 124 254 135 263 156 C271 172 271 193 262 209 C252 227 234 243 210 243 C187 243 167 231 158 209 C150 192 151 170 159 154 C170 135 187 124 210 124 Z"
				fill="url(#waxFace)"
			/>
			<circle cx="210" cy="183" r="31" stroke="rgba(255,255,255,0.34)" stroke-width="1.5" />
			<text
				x="210"
				y="184"
				text-anchor="middle"
				dominant-baseline="central"
				fill="rgba(255,255,255,0.94)">C</text
			>
		</g>
	</svg>
</div>

<style>
	.scene {
		width: 100%;
		max-width: 460px;
	}

	svg {
		width: 100%;
		height: auto;
		display: block;
		overflow: visible;
	}

	text {
		font-family: var(--font-display);
		font-size: 40px;
		font-weight: 600;
		font-variation-settings: 'opsz' 40;
	}

	.behind {
		transform-origin: 228px 146px;
		transform: rotate(-3.5deg);
		opacity: 0.55;
	}

	.animate .behind {
		animation: settle 900ms cubic-bezier(0.2, 0, 0, 1) both;
	}

	.animate .letter {
		animation: rise 760ms cubic-bezier(0.2, 0, 0, 1) both;
	}

	.animate .seal {
		transform-origin: 210px 183px;
		animation: press 760ms cubic-bezier(0.22, 1.1, 0.3, 1) 420ms both;
	}

	.animate .rules path {
		animation: draw 700ms cubic-bezier(0.2, 0, 0, 1) 620ms both;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes settle {
		from {
			opacity: 0;
			transform: rotate(-9deg) translateY(10px);
		}
		to {
			opacity: 0.55;
			transform: rotate(-3.5deg);
		}
	}

	@keyframes press {
		0% {
			opacity: 0;
			transform: scale(1.5) rotate(-11deg);
		}
		58% {
			opacity: 1;
			transform: scale(0.95) rotate(2deg);
		}
		100% {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	@keyframes draw {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate .behind,
		.animate .letter,
		.animate .seal,
		.animate .rules path {
			animation: none;
		}
	}
</style>
