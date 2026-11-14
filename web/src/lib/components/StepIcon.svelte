<script>
	/* One outline glyph per step, drawn to the same 24px grid and the same
	   1.5 stroke so the row reads as one set. */
	let { name, size = 22 } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'seal'}
		<circle cx="12" cy="12" r="8.25" />
		<circle cx="12" cy="12" r="3.75" />
	{:else if name === 'pay'}
		<rect x="2.75" y="5.75" width="18.5" height="12.5" rx="2.5" />
		<path d="M2.75 10.25h18.5M6.5 14.75h4" />
	{:else if name === 'open'}
		<path d="M3.75 7.5 12 13.5l8.25-6" />
		<rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2.5" />
		<path d="M3.75 18.75 9.5 13.5M20.25 18.75 14.5 13.5" opacity="0.55" />
	{:else if name === 'prove'}
		<path d="M5.75 3.75h8.5l4 4v12.5H5.75z" />
		<path d="M14 3.75v4h4" opacity="0.6" />
		<path d="m8.75 14 2.25 2.25 4.25-4.5" />
	{/if}
</svg>
