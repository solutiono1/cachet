<script>
	/* Reveals its content when it first scrolls into view. One short move
	   upward and a fade, nothing more. Honours prefers-reduced-motion, and
	   leaves the content visible if IntersectionObserver is missing. */
	let { delay = 0, children } = $props();

	let element = $state(null);
	let shown = $state(false);

	$effect(() => {
		if (!element) return;

		const reduced =
			typeof matchMedia === 'function' &&
			matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reduced || typeof IntersectionObserver === 'undefined') {
			shown = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						shown = true;
						observer.disconnect();
					}
				}
			},
			{ rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
		);

		observer.observe(element);
		return () => observer.disconnect();
	});
</script>

<div bind:this={element} class="reveal" class:shown style="--delay:{delay}ms">
	{@render children()}
</div>

<style>
	.reveal {
		opacity: 0;
		transform: translate3d(0, 14px, 0);
		transition:
			opacity 620ms cubic-bezier(0.2, 0, 0, 1) var(--delay),
			transform 620ms cubic-bezier(0.2, 0, 0, 1) var(--delay);
	}

	.shown {
		opacity: 1;
		transform: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
