<script>
	/* A value with a copy button. Used for links, keys and hashes. */
	let { value, label = 'Copy', display = null, mono = true } = $props();

	let copied = $state(false);
	let failed = $state(false);

	async function copy() {
		failed = false;
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			failed = true;
		}
	}
</script>

<div class="wrap">
	<code class:mono class="value">{display ?? value}</code>
	<button class="btn btn--quiet" type="button" onclick={copy}>
		{copied ? 'Copied' : label}
	</button>
</div>
{#if failed}
	<p class="hint hint--error">
		Your browser would not let the page use the clipboard. Select the text and copy it.
	</p>
{/if}

<style>
	.wrap {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-2) var(--s-2) var(--s-2) var(--s-3);
		background: var(--raised);
		border: var(--hair) solid var(--border);
		border-radius: var(--r-control);
	}

	.value {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text);
	}

	button {
		flex: none;
	}
</style>
