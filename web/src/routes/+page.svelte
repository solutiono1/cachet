<script>
	import Reveal from '#lib/components/Reveal.svelte';
	import SealedCopy from '#lib/components/SealedCopy.svelte';
	import CardArt from '#lib/components/CardArt.svelte';
	import StepIcon from '#lib/components/StepIcon.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import { TOKEN } from '#lib/config.js';

	const steps = [
		{
			n: '01',
			icon: 'seal',
			title: 'Seal',
			body: `Fill in the invoice. Cachet derives a key for that one invoice in your
				browser and writes nothing to any server. The details ride inside the link, in
				the part of a web address that browsers never send anywhere.`
		},
		{
			n: '02',
			icon: 'pay',
			title: 'Pay',
			body: `Your client opens the link and pays in ${TOKEN.symbol}. The money lands in
				the Cachet contract under that single key, not in your account. Nothing on the
				page points back to you.`
		},
		{
			n: '03',
			icon: 'open',
			title: 'Open',
			body: `Sign with the envelope's own key and send the money wherever you like. The
				destination sits inside the signature, so even the person who submits the
				transaction cannot redirect it.`
		},
		{
			n: '04',
			icon: 'prove',
			title: 'Prove',
			body: `Pick the payments a landlord, a lender or an accountant should see. Cachet
				turns them into a link they can check against the chain, with no wallet and no
				account of their own.`
		}
	];

	const checks = [
		{
			title: 'The invoice matches its seal',
			body: `The details are hashed again with the salt you disclosed, and must equal the
				value stored on chain. One edited character breaks it.`
		},
		{
			title: 'The payment really settled',
			body: `The envelope is read from the contract: amount, token and the moment it
				arrived, straight from NEAR rather than from your file.`
		},
		{
			title: 'The earner signed it',
			body: `Each disclosed payment carries a signature from the key that owns it, over a
				statement naming the reader and an expiry date.`
		}
	];

	const visibility = [
		{
			who: 'The client paying you',
			sees: 'Their own invoice, the contract address, one single use key',
			hidden: 'Your account, your balance, everyone else who pays you'
		},
		{
			who: 'Anyone reading the chain',
			sees: 'That some envelope received an amount from some account',
			hidden: 'Which envelopes belong to one person, and every invoice detail'
		},
		{
			who: 'Whoever you hand a proof to',
			sees: 'Exactly the payments you selected, and when they settled',
			hidden: 'Every payment you left out of that proof'
		}
	];
</script>

<svelte:head>
	<title>Cachet, get paid privately and prove it when it counts</title>
	<meta
		name="description"
		content="Cachet gives every stablecoin invoice its own sealed envelope on NEAR. Clients pay without seeing your wallet or your other income, and you disclose only the payments you choose."
	/>
</svelte:head>

<div class="frame">
	<section class="hero-card settle">
		<div class="wash" aria-hidden="true"></div>
		<CardArt opacity={0.5} radius={280} />

		<div class="hero-body">
			<p class="eyebrow mono">Private stablecoin invoicing on NEAR</p>
			<h1>Get paid privately.<br />Prove it when it counts.</h1>
			<p class="lede">
				Every invoice gets its own sealed envelope. Your client pays it without seeing
				your wallet, your balance, or the other people who pay you. When a landlord or
				a lender asks what you earn, you open only the payments you choose.
			</p>
			<div class="row cta">
				<a class="btn btn--primary btn--block-sm" href="/new/">Create a pay link</a>
				<a class="text-link" href="/verify/">
					Check a proof
					<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
						<path
							d="M3.5 8h9M8.75 4.25 12.5 8l-3.75 3.75"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</a>
			</div>
			<p class="caption note">
				Live on NEAR testnet. No sign up, no account, and no Cachet server to send your
				details to.
			</p>
		</div>
	</section>
</div>

<section class="copies-band">
	<div class="container">
		<Reveal>
			<div class="lead-in lead-in--wide">
				<h2>The same invoice, kept two ways</h2>
				<p class="lede">
					You keep the document. The chain keeps a hash, an amount and a timestamp.
					Below is a payment that really settled, shown both ways.
				</p>
			</div>
		</Reveal>
		<Reveal delay={80}>
			<SealedCopy />
		</Reveal>
	</div>
</section>

<section class="band">
	<div class="container">
		<Reveal>
			<div class="lead-in">
				<h2>One address tells them everything</h2>
				<p class="lede">
					Hand a client your wallet address and you hand them your books. Cachet splits
					apart the two things an address wrongly fuses: taking money, and giving up
					your history.
				</p>
			</div>
		</Reveal>

		<ol class="steps">
			{#each steps as step, i (step.n)}
				<Reveal delay={i * 70}>
					<li class="step">
						<span class="step-icon"><StepIcon name={step.icon} /></span>
						<span class="step-n mono">{step.n}</span>
						<h3>{step.title}</h3>
						<p class="muted">{step.body}</p>
					</li>
				</Reveal>
			{/each}
		</ol>
	</div>
</section>

<section class="band">
	<div class="container">
		<Reveal>
			<div class="lead-in">
				<h2>A proof that answers to the chain</h2>
				<p class="lede">
					Not a screenshot and not a promise. The person you send it to runs three
					checks in their own browser, against NEAR, with nothing to install.
				</p>
			</div>
		</Reveal>

		<Reveal delay={80}>
			<div class="glass proof">
				<div class="proof-head">
					<Mark size={38} />
					<p class="label">Three checks, every time</p>
				</div>

				<ol class="checks">
					{#each checks as check, i (check.title)}
						<li>
							<span class="check-n mono">{i + 1}</span>
							<h4>{check.title}</h4>
							<p class="muted">{check.body}</p>
						</li>
					{/each}
				</ol>

				<p class="aside">
					The third check is the one that matters. A client who paid one of these
					invoices knows every detail of it, and still cannot present it as their own
					income, because they never held the envelope key.
				</p>

				<a class="btn btn--secondary" href="/verify/">Check a real proof</a>
			</div>
		</Reveal>
	</div>
</section>

<section class="band">
	<div class="container">
		<Reveal>
			<div class="lead-in">
				<h2>Who sees what</h2>
			</div>
		</Reveal>

		<div class="matrix">
			{#each visibility as row, i (row.who)}
				<Reveal delay={i * 70}>
					<article class="card matrix-row">
						<h4>{row.who}</h4>
						<div>
							<p class="label">Can see</p>
							<p class="muted">{row.sees}</p>
						</div>
						<div>
							<p class="label">Cannot see</p>
							<p class="muted">{row.hidden}</p>
						</div>
					</article>
				</Reveal>
			{/each}
		</div>

		<Reveal delay={140}>
			<div class="panel limits">
				<p class="label">Where the privacy stops</p>
				<p class="muted">
					Amounts, paying accounts and settlement times are public on NEAR. Opening two
					envelopes into the same account links those two payments to each other.
					Cachet hides you from the people who pay you. It is not a mixer, and it does
					not pretend to be. Settling through NEAR Confidential Intents on mainnet,
					which would hide where the money lands as well, is on the roadmap and is not
					part of this release.
				</p>
			</div>
		</Reveal>
	</div>
</section>

<div class="frame frame--tail">
	<Reveal>
		<section class="closing-card">
			<div class="wash wash--deep" aria-hidden="true"></div>
			<CardArt opacity={0.42} radius={240} />
			<div class="closing-body">
				<Mark size={46} />
				<h2>Send your next invoice sealed</h2>
				<p class="lede center">
					One form, no account, and no server to send your invoice to.
				</p>
				<div class="row cta center-row">
					<a class="btn btn--primary" href="/new/">Create a pay link</a>
					<a class="btn btn--secondary" href="/verify/">Check a proof</a>
				</div>
			</div>
		</section>
	</Reveal>
</div>

<style>
	/* The card sits inside the page, not against its edges. */
	.frame {
		width: min(var(--wide), 100%);
		margin-inline: auto;
		padding-inline: var(--s-4);
		padding-top: var(--s-3);
	}

	.frame--tail {
		padding-top: clamp(48px, 7vw, 96px);
	}

	@media (min-width: 640px) {
		.frame {
			padding-inline: 28px;
			padding-top: var(--s-6);
		}
	}

	.hero-card,
	.closing-card {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border: var(--hair) solid var(--border);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow-lift);
	}

	.hero-card {
		display: grid;
		align-content: end;
		min-height: min(640px, 78vh);
		padding: clamp(28px, 5vw, 64px);
	}

	.wash {
		position: absolute;
		inset: -30%;
		z-index: -1;
		pointer-events: none;
		filter: blur(54px);
		background:
			radial-gradient(54% 60% at 82% 12%, var(--f-g1) 0, transparent 68%),
			radial-gradient(46% 52% at 98% 46%, var(--f-g2) 0, transparent 72%),
			radial-gradient(52% 44% at 24% 96%, var(--f-g2) 0, transparent 70%),
			radial-gradient(44% 50% at 14% 10%, var(--f-hi) 0, transparent 68%),
			linear-gradient(142deg, var(--f-a) 0, var(--f-b) 58%, var(--f-c) 100%);
		animation: drift 24s var(--ease-in-out) infinite alternate;
	}

	.wash--deep {
		filter: blur(60px);
		background:
			radial-gradient(58% 64% at 14% 8%, var(--f-g1) 0, transparent 70%),
			radial-gradient(50% 56% at 92% 88%, var(--f-g1) 0, transparent 72%),
			radial-gradient(46% 50% at 70% 14%, var(--f-hi) 0, transparent 66%),
			linear-gradient(200deg, var(--f-c) 0, var(--f-a) 54%, var(--f-b) 100%);
	}

	.hero-body {
		position: relative;
		z-index: 1;
		display: grid;
		gap: var(--s-5);
		max-width: 46ch;
	}

	.eyebrow {
		font-size: 12px;
		letter-spacing: 0.1em;
		color: var(--accent-text);
		margin: 0;
	}

	.hero-body h1 {
		margin: 0;
	}

	.cta {
		margin-top: var(--s-1);
		gap: var(--s-5);
	}

	.note {
		color: var(--faint);
		max-width: 44ch;
	}

	/* A text link with an arrow that steps forward on hover. */
	.text-link {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		color: var(--text);
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
		transition: color var(--fast) var(--ease);
	}

	.text-link svg {
		transition: translate var(--fast) var(--ease);
	}

	.text-link:hover {
		color: var(--accent-text);
	}

	.text-link:hover svg {
		translate: 3px 0;
	}

	/* ---- The two copies ---- */

	.copies-band {
		padding-block: clamp(56px, 8vw, 104px) 0;
	}

	.lead-in--wide {
		max-width: 52ch;
	}

	/* ---- Sections ---- */

	.lead-in {
		display: grid;
		gap: var(--s-3);
		max-width: 46ch;
		margin-bottom: clamp(32px, 4vw, 48px);
	}

	/* Four cards on one grid, equal height, the way the reference lays its
	   feature set out. */
	.steps {
		display: grid;
		gap: var(--s-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.steps :global(.reveal) {
		height: 100%;
	}

	.step {
		position: relative;
		display: grid;
		align-content: start;
		gap: var(--s-2);
		height: 100%;
		padding: clamp(20px, 2.6vw, 28px);
		background: color-mix(in srgb, var(--surface) 72%, transparent);
		border: var(--hair) solid var(--border-soft);
		border-radius: var(--r-card);
		transition:
			transform 280ms var(--ease),
			border-color 280ms var(--ease),
			background-color 280ms var(--ease),
			box-shadow 280ms var(--ease);
	}

	.step:hover {
		transform: translateY(-3px);
		background: var(--surface);
		border-color: color-mix(in srgb, var(--text) 16%, var(--border));
		box-shadow: var(--shadow-card);
	}

	.step-icon {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		margin-bottom: clamp(24px, 4vw, 44px);
		border-radius: var(--r-sm);
		background: color-mix(in srgb, var(--wax) 12%, transparent);
		color: var(--wax);
		transition: background-color 280ms var(--ease);
	}

	.step:hover .step-icon {
		background: color-mix(in srgb, var(--wax) 20%, transparent);
	}

	.step-n {
		position: absolute;
		top: clamp(20px, 2.6vw, 28px);
		right: clamp(20px, 2.6vw, 28px);
		font-size: 12px;
		color: var(--faint);
	}

	.step h3 {
		font-size: 1.3125rem;
	}

	.step p {
		font-size: 14.5px;
		line-height: 1.6;
	}

	@media (min-width: 680px) {
		.steps {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1040px) {
		.steps {
			grid-template-columns: repeat(4, 1fr);
			gap: var(--s-5);
		}
	}

	/* ---- Proof ---- */

	.proof {
		display: grid;
		gap: var(--s-6);
		justify-items: start;
		padding: clamp(24px, 4vw, 40px);
	}

	.proof-head {
		display: flex;
		align-items: center;
		gap: var(--s-3);
	}

	.checks {
		display: grid;
		gap: var(--s-6);
		margin: 0;
		padding: 0;
		list-style: none;
		width: 100%;
	}

	.checks li {
		display: grid;
		gap: var(--s-2);
		max-width: 62ch;
	}

	.check-n {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: var(--r-full);
		background: var(--wax);
		color: #fff;
		font-size: 12px;
	}

	.aside {
		max-width: 64ch;
		padding-left: var(--s-5);
		border-left: 2px solid var(--wax);
		color: var(--muted);
	}

	@media (min-width: 880px) {
		.checks {
			grid-template-columns: repeat(3, 1fr);
			gap: var(--s-7);
		}
	}

	/* ---- Matrix ---- */

	.matrix {
		display: grid;
		gap: var(--s-4);
	}

	.matrix-row {
		display: grid;
		gap: var(--s-4);
		transition:
			transform 260ms var(--ease),
			border-color 260ms var(--ease),
			box-shadow 260ms var(--ease);
	}

	.matrix-row:hover {
		transform: translateY(-3px);
		border-color: color-mix(in srgb, var(--text) 20%, var(--border));
		box-shadow: var(--shadow-lift);
	}

	.limits {
		margin-top: var(--s-6);
		display: grid;
		gap: var(--s-2);
		max-width: var(--prose);
	}

	@media (min-width: 880px) {
		.matrix-row {
			grid-template-columns: 1fr 1.3fr 1.3fr;
			gap: var(--s-7);
			align-items: start;
		}
	}

	/* ---- Closing ---- */

	.closing-card {
		display: grid;
		place-items: center;
		min-height: min(440px, 62vh);
		padding: clamp(40px, 7vw, 88px) clamp(24px, 5vw, 64px);
		text-align: center;
	}

	.closing-body {
		position: relative;
		z-index: 1;
		display: grid;
		justify-items: center;
		gap: var(--s-4);
		max-width: 44ch;
	}

	.center {
		margin-inline: auto;
	}

	.center-row {
		justify-content: center;
		gap: var(--s-3);
	}
</style>
