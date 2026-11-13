#!/usr/bin/env node
/* Cachet command line.
 *
 * Two jobs:
 *   verify   check a proof file against the chain, without the web app
 *   envelope derive an envelope, so a payment can be made from a terminal
 *   sign     sign a withdrawal for an envelope
 *
 * Run `node bin/cachet.mjs` for usage.
 */

import { readFileSync } from 'node:fs';
import { fromHex, randomBytes, toHex } from '../src/lib/core/crypto.js';
import { buildEnvelope, payLinkPayload, encodePayload, signWithdraw } from '../src/lib/core/envelope.js';
import { buildProof, verifyProof } from '../src/lib/core/proof.js';
import { fetchEnvelopes } from '../src/lib/near.js';
import { CONTRACT_ID, RPC_URL, TOKEN } from '../src/lib/config.js';

const args = process.argv.slice(2);
const command = args[0];

function flag(name, fallback = undefined) {
	const at = args.indexOf(`--${name}`);
	if (at === -1 || at === args.length - 1) return fallback;
	return args[at + 1];
}

function usage(code = 0) {
	process.stdout.write(`Cachet ${CONTRACT_ID}

  node bin/cachet.mjs verify <proof.json> [--rpc URL]
      Check a proof against the chain. Exits 0 when verified, 1 when not.

  node bin/cachet.mjs envelope --seed <hex> --index <n> --details <file.json>
      Print the claim key, seal and envelope id, plus the pay link payload.
      Omit --seed to generate one.

  node bin/cachet.mjs proof --seed <hex> --invoices <file.json> --audience <name> --purpose <text> --expires <YYYY-MM-DD>
      Build a signed proof over the invoices listed in the file.

  node bin/cachet.mjs sign --seed <hex> --index <n> --details <file.json> --to <account>
      Print the signature that releases that envelope to that account.

Amounts are in the smallest unit of ${TOKEN.symbol} (${TOKEN.decimals} decimals).
`);
	process.exit(code);
}

function readDetails() {
	const path = flag('details');
	if (!path) fail('--details <file.json> is required');
	return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
	process.stderr.write(`cachet: ${message}\n`);
	process.exit(2);
}

function seedFrom(flagValue, { allowNew = false } = {}) {
	if (flagValue) {
		const seed = fromHex(flagValue);
		if (seed.length !== 32) fail('--seed must be 32 bytes of hex');
		return seed;
	}
	if (!allowNew) fail('--seed <hex> is required');
	const seed = randomBytes(32);
	process.stderr.write(`cachet: generated a seed, keep it: ${toHex(seed)}\n`);
	return seed;
}

const rpc = flag('rpc', RPC_URL);

switch (command) {
	case 'verify': {
		const path = args[1];
		if (!path || path.startsWith('--')) usage(2);
		const bundle = JSON.parse(readFileSync(path, 'utf8'));
		const result = await verifyProof(bundle, (ids) => fetchEnvelopes(ids, { rpc }));

		const s = result.statement ?? {};
		process.stdout.write(`\n${result.verified ? 'VERIFIED' : 'NOT VERIFIED'}\n\n`);
		process.stdout.write(`  payee     ${s.payee ?? '—'}\n`);
		process.stdout.write(`  for       ${s.audience ?? '—'}\n`);
		process.stdout.write(`  purpose   ${s.purpose ?? '—'}\n`);
		process.stdout.write(`  expires   ${s.expires ?? '—'}\n`);
		process.stdout.write(`  contract  ${result.contract ?? '—'}\n\n`);

		for (const payment of result.payments) {
			const mark = payment.ok ? 'ok    ' : 'FAILED';
			const amount = formatAmount(payment.details.amount);
			process.stdout.write(
				`  ${mark} ${amount.padStart(14)} ${TOKEN.symbol}  ${payment.details.issued}  ${payment.details.client}\n`
			);
			if (!payment.ok) process.stdout.write(`         ${payment.reason}\n`);
		}

		const totals = Object.entries(result.total);
		if (totals.length) {
			process.stdout.write('\n');
			for (const [token, sum] of totals) {
				process.stdout.write(`  total   ${formatAmount(sum).padStart(14)} ${token}\n`);
			}
		}
		for (const problem of result.problems) process.stdout.write(`\n  ${problem}\n`);
		process.stdout.write('\n');
		process.exit(result.verified ? 0 : 1);
		break;
	}

	case 'envelope': {
		const seed = seedFrom(flag('seed'), { allowNew: true });
		const index = Number(flag('index', '0'));
		const details = readDetails();
		const envelope = await buildEnvelope(seed, index, details);
		const payload = payLinkPayload(envelope, CONTRACT_ID);
		process.stdout.write(
			JSON.stringify(
				{
					index,
					claim: toHex(envelope.publicKey),
					seal: toHex(envelope.seal),
					id: envelope.idHex,
					ft_transfer_call_msg: JSON.stringify({
						claim: toHex(envelope.publicKey),
						seal: toHex(envelope.seal)
					}),
					pay_link_fragment: encodePayload(payload)
				},
				null,
				2
			) + '\n'
		);
		break;
	}

	case 'proof': {
		const seed = seedFrom(flag('seed'));
		const path = flag('invoices');
		if (!path) fail('--invoices <file.json> is required');
		const invoices = JSON.parse(readFileSync(path, 'utf8'));
		const audience = flag('audience');
		const purpose = flag('purpose');
		const expires = flag('expires');
		if (!audience || !purpose || !expires) {
			fail('--audience, --purpose and --expires are all required');
		}
		const statement = {
			v: 1,
			payee: invoices[0].details.payee,
			audience,
			purpose,
			expires
		};
		const envelopes = [];
		for (const row of invoices) {
			envelopes.push(await buildEnvelope(seed, row.index, row.details));
		}
		const proof = await buildProof(envelopes, statement, CONTRACT_ID);
		process.stdout.write(JSON.stringify(proof, null, 2) + '\n');
		break;
	}

	case 'sign': {
		const seed = seedFrom(flag('seed'));
		const index = Number(flag('index', '0'));
		const to = flag('to');
		if (!to) fail('--to <account> is required');
		const details = readDetails();
		const envelope = await buildEnvelope(seed, index, details);
		const signature = await signWithdraw(envelope, CONTRACT_ID, to);
		process.stdout.write(
			JSON.stringify(
				{
					claim: toHex(envelope.publicKey),
					seal: toHex(envelope.seal),
					recipient_id: to,
					signature: toHex(signature)
				},
				null,
				2
			) + '\n'
		);
		break;
	}

	default:
		usage(command ? 2 : 0);
}

function formatAmount(raw) {
	const value = BigInt(raw);
	const unit = 10n ** BigInt(TOKEN.decimals);
	const whole = value / unit;
	const rest = (value % unit).toString().padStart(TOKEN.decimals, '0').replace(/0+$/, '');
	return rest ? `${whole}.${rest}` : `${whole}`;
}
