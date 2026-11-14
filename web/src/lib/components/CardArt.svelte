<script>
	/* Line art that is invisible until you move over it.
	 *
	 * A full bleed field of drawn marks sits inside the card, masked out
	 * completely. A soft circular hole in that mask follows the pointer, so
	 * the drawings surface where the cursor is and sink again behind it. The
	 * hole eases toward the pointer rather than snapping to it, which is what
	 * gives the movement weight.
	 *
	 * The art never takes pointer events, so nothing underneath stops working.
	 */

	let { radius = 260, opacity = 0.55 } = $props();

	let wrap = $state(null);
	let active = $state(false);

	$effect(() => {
		if (!wrap) return;

		/* The card is the parent; the art is laid over it. */
		const card = wrap.parentElement;
		if (!card) return;

		const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!fine) return;

		let targetX = 0;
		let targetY = 0;
		let x = 0;
		let y = 0;
		let started = false;
		let frame = 0;

		const draw = () => {
			/* Ease toward the pointer. A low factor makes the light trail. */
			x += (targetX - x) * 0.14;
			y += (targetY - y) * 0.14;
			wrap.style.setProperty('--mx', `${x}px`);
			wrap.style.setProperty('--my', `${y}px`);
			frame = requestAnimationFrame(draw);
		};

		const onMove = (event) => {
			const box = card.getBoundingClientRect();
			targetX = event.clientX - box.left;
			targetY = event.clientY - box.top;
			if (!started) {
				started = true;
				x = targetX;
				y = targetY;
				active = true;
				if (still) {
					wrap.style.setProperty('--mx', `${x}px`);
					wrap.style.setProperty('--my', `${y}px`);
				} else {
					frame = requestAnimationFrame(draw);
				}
			}
		};

		const onLeave = () => {
			active = false;
			started = false;
			cancelAnimationFrame(frame);
		};

		card.addEventListener('pointermove', onMove);
		card.addEventListener('pointerleave', onLeave);

		return () => {
			cancelAnimationFrame(frame);
			card.removeEventListener('pointermove', onMove);
			card.removeEventListener('pointerleave', onLeave);
		};
	});
</script>

<div
	bind:this={wrap}
	class="art"
	class:active
	style="--r:{radius}px; --art-opacity:{opacity}"
	aria-hidden="true"
>
	<svg viewBox="0 0 1200 620" fill="none" preserveAspectRatio="xMidYMid slice">
		<g
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linejoin="round"
			stroke-linecap="round"
		>
			<!-- envelopes -->
			<g transform="translate(70 58) rotate(-8)">
				<rect x="0" y="0" width="150" height="98" rx="5" />
				<path d="M0 0 75 60 150 0" />
			</g>
			<g transform="translate(880 44) rotate(6)">
				<rect x="0" y="0" width="168" height="110" rx="5" />
				<path d="M0 0 84 68 168 0" />
			</g>
			<g transform="translate(470 392) rotate(-4)">
				<rect x="0" y="0" width="140" height="92" rx="5" />
				<path d="M0 0 70 56 140 0" />
			</g>

			<!-- seals, as concentric impressions -->
			<g transform="translate(330 96)">
				<circle cx="52" cy="52" r="51" />
				<circle cx="52" cy="52" r="38" opacity="0.7" />
				<circle cx="52" cy="52" r="20" opacity="0.45" />
			</g>
			<g transform="translate(1012 326)">
				<circle cx="46" cy="46" r="45" />
				<circle cx="46" cy="46" r="31" opacity="0.7" />
				<circle cx="46" cy="46" r="15" opacity="0.45" />
			</g>
			<g transform="translate(176 400)">
				<circle cx="40" cy="40" r="39" />
				<circle cx="40" cy="40" r="25" opacity="0.6" />
			</g>

			<!-- stamps, perforated -->
			<g transform="translate(624 60) rotate(9)">
				<rect x="0" y="0" width="84" height="100" rx="4" stroke-dasharray="1 6" />
				<rect x="10" y="10" width="64" height="80" rx="2" />
				<circle cx="42" cy="40" r="15" />
				<path d="M22 76 H62" opacity="0.6" />
			</g>
			<g transform="translate(792 426) rotate(-7)">
				<rect x="0" y="0" width="76" height="92" rx="4" stroke-dasharray="1 6" />
				<rect x="9" y="9" width="58" height="74" rx="2" />
				<circle cx="38" cy="36" r="13" />
			</g>

			<!-- ruled sheets -->
			<g transform="translate(206 196) rotate(5)">
				<path d="M0 9 A9 9 0 0 1 9 0 H104 L142 38 V148 A9 9 0 0 1 133 157 H9 A9 9 0 0 1 0 148 Z" />
				<path d="M104 0 V29 A9 9 0 0 0 113 38 H142" opacity="0.7" />
				<path d="M24 80 H102 M24 100 H82 M24 120 H92" opacity="0.5" />
			</g>
			<g transform="translate(660 212) rotate(-5)">
				<path d="M0 9 A9 9 0 0 1 9 0 H96 L132 36 V142 A9 9 0 0 1 123 151 H9 A9 9 0 0 1 0 142 Z" />
				<path d="M96 0 V27 A9 9 0 0 0 105 36 H132" opacity="0.7" />
				<path d="M22 76 H94 M22 96 H74" opacity="0.5" />
			</g>

			<!-- coins, carrying a seal rather than a currency sign -->
			<g transform="translate(486 148)">
				<circle cx="34" cy="34" r="33" />
				<circle cx="34" cy="34" r="23" opacity="0.6" />
			</g>
			<g transform="translate(922 194)">
				<circle cx="28" cy="28" r="27" />
				<circle cx="28" cy="28" r="18" opacity="0.6" />
			</g>
			<g transform="translate(60 268)">
				<circle cx="30" cy="30" r="29" />
				<circle cx="30" cy="30" r="19" opacity="0.6" />
			</g>
			<g transform="translate(336 486)">
				<circle cx="26" cy="26" r="25" />
				<circle cx="26" cy="26" r="16" opacity="0.6" />
			</g>
		</g>
	</svg>
</div>

<style>
	.art {
		position: absolute;
		inset: 0;
		z-index: 0;
		color: var(--text);
		opacity: 0;
		pointer-events: none;
		transition: opacity 520ms var(--ease);

		/* Everything is hidden except a soft hole around the pointer. */
		--mx: 50%;
		--my: 50%;
		mask-image: radial-gradient(
			var(--r) circle at var(--mx) var(--my),
			#000 0%,
			rgba(0, 0, 0, 0.72) 38%,
			rgba(0, 0, 0, 0.22) 62%,
			transparent 78%
		);
		-webkit-mask-image: radial-gradient(
			var(--r) circle at var(--mx) var(--my),
			#000 0%,
			rgba(0, 0, 0, 0.72) 38%,
			rgba(0, 0, 0, 0.22) 62%,
			transparent 78%
		);
	}

	.art.active {
		opacity: var(--art-opacity);
	}

	svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* Without a fine pointer there is nothing to follow, so the art simply
	   sits there, very faint, rather than never appearing at all. */
	@media (hover: none), (pointer: coarse) {
		.art {
			opacity: calc(var(--art-opacity) * 0.38);
			mask-image: none;
			-webkit-mask-image: none;
		}
	}
</style>
