<script>
	/* Brand marks, drawn from each platform's own published glyph so they are
	   recognisable at 18px. Only destinations that really exist are rendered;
	   a dead icon is worse than a missing one. */
	let { items } = $props();
</script>

<ul class="social">
	{#each items as item (item.name)}
		<li>
			<a href={item.href} target="_blank" rel="noreferrer" aria-label={item.name} title={item.name}>
				{#if item.name === 'GitHub'}
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						<path
							fill="currentColor"
							d="M12 .5A11.5 11.5 0 0 0 8.36 22.91c.58.1.79-.25.79-.56v-1.96c-3.2.7-3.88-1.54-3.88-1.54-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.97.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
						/>
					</svg>
				{:else if item.name === 'X'}
					<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
						<path
							fill="currentColor"
							d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z"
						/>
					</svg>
				{:else if item.name === 'YouTube'}
					<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
						<path
							fill="currentColor"
							d="M23.5 6.9a3 3 0 0 0-2.12-2.13C19.5 4.25 12 4.25 12 4.25s-7.5 0-9.38.52A3 3 0 0 0 .5 6.9C0 8.78 0 12 0 12s0 3.22.5 5.1a3 3 0 0 0 2.12 2.13c1.88.52 9.38.52 9.38.52s7.5 0 9.38-.52a3 3 0 0 0 2.12-2.13C24 15.22 24 12 24 12s0-3.22-.5-5.1ZM9.6 15.6V8.4l6.24 3.6-6.24 3.6Z"
						/>
					</svg>
				{/if}
			</a>
		</li>
	{/each}
</ul>

<style>
	.social {
		display: flex;
		gap: var(--s-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: var(--hair) solid var(--border);
		border-radius: var(--r-sm);
		color: var(--muted);
		transition:
			color var(--fast) var(--ease),
			border-color var(--fast) var(--ease),
			background-color var(--fast) var(--ease),
			translate var(--fast) var(--ease);
	}

	a:hover {
		color: var(--text);
		border-color: color-mix(in srgb, var(--text) 24%, transparent);
		background: var(--raised);
		translate: 0 -2px;
	}
</style>
