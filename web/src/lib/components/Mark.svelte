<script>
	/* The Cachet mark: a letter, and a seal pressed over its corner.
	   Two shapes, no detail, legible at 16px. The letter takes the current
	   text colour so it inverts with the theme; the seal is always wax. */
	let { size = 26, title = '' } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 32 32"
	fill="none"
	class="mark"
	role={title ? 'img' : 'presentation'}
	aria-label={title || undefined}
	aria-hidden={title ? undefined : 'true'}
>
	<rect x="0.5" y="0.5" width="24" height="24" rx="7" fill="currentColor" />
	<circle cx="23" cy="23" r="9" fill="var(--wax)" />
</svg>

<style>
	.mark {
		display: block;
		flex: none;
	}
</style>
