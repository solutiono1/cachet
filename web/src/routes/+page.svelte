<script>
	import Seal from '#lib/components/Seal.svelte';

	const steps = [
		{
			n: '01',
			title: 'Seal',
			body: `You fill in the invoice. Cachet derives a one-time key for it and writes
				nothing to any server. The details travel inside the link itself, in the part
				of a web address that browsers never send anywhere.`
		},
		{
			n: '02',
			title: 'Pay',
			body: `Your client opens the link and pays in USDC. The money goes to the Cachet
				contract under that one-time key, not to your account. Nothing on the page
				points back to you.`
		},
		{
			n: '03',
			title: 'Open',
			body: `When you want the money, you sign with the envelope's own key and send it to
				whichever account you like. Only that key can release it, and the signature
				names the destination, so nobody can redirect it.`
		},
		{
			n: '04',
			title: 'Prove',
			body: `Choose the payments a landlord, a lender or an accountant should see. Cachet
				turns them into a link anyone can check against the chain, with no wallet and
				no account.`
		}
	];

	const checks = [
		{
			title: 'The invoice matches its seal',
			body: `Recomputing the hash from the disclosed details and the salt gives exactly
				the value stored on chain. Change one character and it stops matching.`
		},
		{
			title: 'The payment really happened',
			body: `The envelope exists in the contract with that amount, that token and that
				settlement time. The verifier reads it from NEAR, not from the file.`
		},
		{
			title: 'The earner signed it',
			body: `Every disclosed payment carries a signature from its envelope key over the
				statement naming who the proof is for and when it expires.`
		},
		{
			title: 'Nothing else is exposed',
			body: `Payments you did not select are absent from the file and cannot be derived
				from it. There is no list to walk.`
		}
	];

	const visibility = [
		{
			who: 'The client paying you',
			sees: 'Their own invoice, the contract address, one single-use key',
			cannot: 'Your account, your balance, anyone else who pays you'
		},
		{
			who: 'Anyone reading the chain',
			sees: 'That some envelope received an amount from some account',
			cannot: 'Which envelopes belong to one person, and every invoice detail'
		},
		{
			who: 'Whoever you hand a proof to',
			sees: 'Exactly the payments you selected, and nothing more',
			cannot: 'Any payment you left out of the proof'
		}
	];
</script>

<svelte:head>
	<title>Cachet — get paid privately, prove it when it counts</title>
	<meta
		name="description"
		content="Cachet gives every stablecoin invoice its own sealed envelope on NEAR. Clients pay without seeing your wallet or your other income, and you disclose only the payments you choose."
	/>
</svelte:head>

<section class="hero grain">
	<div class="container hero-inner">
		<p class="label">Private stablecoin invoicing · NEAR</p>
		<h1>Get paid privately.<br />Prove it when it counts.</h1>
		<p class="lede">
			Every invoice gets its own sealed envelope. Your client pays it without seeing
			your wallet, your balance, or the other people who pay you. When a landlord or a
			lender asks what you earn, you open only the payments you choose.
		</p>
		<div class="row cta">
			<a class="btn btn--primary btn--block-sm" href="/new/">Create a pay link</a>
			<a class="btn btn--secondary btn--block-sm" href="/verify/">Check a proof</a>
		</div>
		<p class="caption note">
			Runs on NEAR testnet with test USDC. No sign-up, no account, no Cachet server.
		</p>
	</div>
</section>

<section class="band">
	<div class="container">
		<h2>One address tells everyone everything</h2>
		<div class="problems">
			<div class="problem">
				<h4>Your client sees your balance</h4>
				<p class="muted">
					The moment you send a wallet address, whoever pays it can look up everything
					that address has ever received, and watch it from then on.
				</p>
			</div>
			<div class="problem">
				<h4>Your clients see each other</h4>
				<p class="muted">
					Rates you negotiated separately end up side by side in a public ledger, in an
					order anyone can read, permanently.
				</p>
			</div>
			<div class="problem">
				<h4>You still cannot prove your income</h4>
				<p class="muted">
					An explorer link that exposes your whole financial life is not a document a
					landlord, a lender or a tax office will accept.
				</p>
			</div>
		</div>
	</div>
</section>

<section class="band">
	<div class="container">
		<h2>How Cachet works</h2>
		<ol class="steps">
			{#each steps as step (step.n)}
				<li>
					<span class="step-n mono">{step.n}</span>
					<div>
						<h4>{step.title}</h4>
						<p class="muted">{step.body}</p>
					</div>
				</li>
			{/each}
		</ol>
	</div>
</section>

<section class="band">
	<div class="container">
		<h2>What a proof actually proves</h2>
		<p class="lede">
			A Cachet proof is not a screenshot and not a promise. The person you send it to
			runs four checks against the chain, in their own browser.
		</p>
		<div class="checks">
			{#each checks as check, i (check.title)}
				<div class="check">
					<span class="check-n mono">{i + 1}</span>
					<h4>{check.title}</h4>
					<p class="muted">{check.body}</p>
				</div>
			{/each}
		</div>
		<p class="aside">
			The third check is the one that matters most. It is what stops the client who paid
			you from presenting your invoice as their own income: they know every detail, but
			they never hold the envelope key.
		</p>
	</div>
</section>

<section class="band">
	<div class="container">
		<h2>Who sees what</h2>
		<div class="table" role="table" aria-label="What each party can and cannot see">
			<div class="trow thead" role="row">
				<span role="columnheader">Party</span>
				<span role="columnheader">Can see</span>
				<span role="columnheader">Cannot see</span>
			</div>
			{#each visibility as row (row.who)}
				<div class="trow" role="row">
					<span role="cell" class="who">{row.who}</span>
					<span role="cell" class="muted">{row.sees}</span>
					<span role="cell" class="muted">{row.cannot}</span>
				</div>
			{/each}
		</div>

		<div class="panel limits">
			<p class="label">Where the privacy stops</p>
			<p class="muted">
				Amounts, paying accounts and timing are public on NEAR. Opening two envelopes
				into the same account links those two payments to each other. Cachet hides you
				from the people who pay you; it is not a mixer. Settling through NEAR
				Confidential Intents on mainnet, which also hides where the money lands, is on
				the roadmap and is not part of this release.
			</p>
		</div>
	</div>
</section>

<section class="band closing">
	<div class="container closing-inner">
		<Seal size={44} />
		<h2>Send your next invoice sealed</h2>
		<p class="lede center">
			It takes one form and no account. Your details never leave your browser.
		</p>
		<a class="btn btn--primary" href="/new/">Create a pay link</a>
	</div>
</section>

<style>
	.hero {
		padding-block: var(--s-hero) var(--s-band);
		border-bottom: var(--hair) solid var(--border);
	}

	.hero-inner {
		display: grid;
		gap: var(--s-5);
		max-width: 920px;
		margin-inline: auto;
	}

	.hero h1 {
		margin-block: var(--s-1) 0;
	}

	.cta {
		margin-top: var(--s-2);
		gap: var(--s-3);
	}

	.note {
		color: var(--faint);
	}

	h2 {
		margin-bottom: var(--s-6);
	}

	.problems {
		display: grid;
		gap: var(--s-6);
	}

	.problem {
		display: grid;
		gap: var(--s-2);
		padding-top: var(--s-5);
		border-top: 2px solid var(--wax);
	}

	.steps {
		display: grid;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.steps li {
		display: grid;
		grid-template-columns: 48px 1fr;
		gap: var(--s-4);
		padding-block: var(--s-6);
		border-top: var(--hair) solid var(--border);
	}

	.steps li:last-child {
		border-bottom: var(--hair) solid var(--border);
	}

	.steps h4 {
		margin-bottom: var(--s-2);
	}

	.step-n {
		font-size: 13px;
		color: var(--wax);
		padding-top: 4px;
	}

	.checks {
		display: grid;
		gap: var(--s-5);
	}

	.check {
		display: grid;
		gap: var(--s-2);
		padding: var(--s-5);
		background: var(--surface);
		border: var(--hair) solid var(--border);
		border-radius: var(--r-card);
	}

	.check-n {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: var(--r-full);
		background: var(--wax);
		color: #fff;
		font-size: 12px;
	}

	.aside {
		max-width: var(--prose);
		margin-top: var(--s-6);
		padding-left: var(--s-5);
		border-left: 2px solid var(--wax);
		color: var(--muted);
	}

	.table {
		border: var(--hair) solid var(--border);
		border-radius: var(--r-card);
		background: var(--surface);
		overflow: hidden;
	}

	.trow {
		display: grid;
		gap: var(--s-2);
		padding: var(--s-5);
		border-top: var(--hair) solid var(--border);
		font-size: 15px;
	}

	.trow:first-child {
		border-top: 0;
	}

	.thead {
		display: none;
		background: var(--raised);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--faint);
	}

	.who {
		font-weight: 700;
	}

	.limits {
		margin-top: var(--s-6);
		display: grid;
		gap: var(--s-2);
		max-width: var(--prose);
	}

	.closing {
		text-align: center;
	}

	.closing-inner {
		display: grid;
		justify-items: center;
		gap: var(--s-4);
		padding-block: var(--s-section);
	}

	.center {
		margin-inline: auto;
	}

	@media (min-width: 768px) {
		.problems {
			grid-template-columns: repeat(3, 1fr);
			gap: var(--s-8);
		}

		.checks {
			grid-template-columns: repeat(2, 1fr);
		}

		.trow {
			grid-template-columns: 1fr 1.4fr 1.4fr;
			gap: var(--s-6);
			align-items: start;
		}

		.thead {
			display: grid;
		}
	}
</style>
