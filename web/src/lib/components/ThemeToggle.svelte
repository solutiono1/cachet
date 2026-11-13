<script>
	import { applyTheme, readTheme, resolved } from '#lib/theme.js';

	let choice = $state('system');
	let shown = $state('paper');

	$effect(() => {
		choice = readTheme();
		shown = resolved(choice);
	});

	function toggle() {
		const next = resolved(choice) === 'ink' ? 'paper' : 'ink';
		applyTheme(next);
		choice = next;
		shown = next;
	}
</script>

<button
	class="toggle"
	type="button"
	onclick={toggle}
	title={shown === 'ink' ? 'Switch to the light theme' : 'Switch to the dark theme'}
	aria-label={shown === 'ink' ? 'Switch to the light theme' : 'Switch to the dark theme'}
>
	{#if shown === 'ink'}
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<circle cx="12" cy="12" r="4.4" fill="currentColor" />
			<g stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
				<path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3" />
				<path d="M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
			</g>
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<path
				d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
				fill="none"
				stroke="currentColor"
				stroke-width="1.7"
				stroke-linejoin="round"
			/>
		</svg>
	{/if}
</button>

<style>
	.toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		padding: 0;
		border: var(--hair) solid var(--border);
		border-radius: var(--r-full);
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		transition:
			background-color var(--fast) var(--ease),
			color var(--fast) var(--ease);
	}

	.toggle:hover {
		background: var(--raised);
		color: var(--text);
	}
</style>
