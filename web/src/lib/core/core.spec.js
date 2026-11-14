import { describe, expect, it } from 'vitest';
import { equalBytes, fromB64, randomBytes, toB64, toHex, verify } from './crypto.js';
import {
	buildEnvelope,
	canonicalDetails,
	decodePayload,
	deriveEnvelope,
	encodePayload,
	payLinkPayload,
	readPayLink,
	signWithdraw,
	withdrawMessage
} from './envelope.js';
import { buildProof, verifyProof } from './proof.js';

const CONTRACT = 'cachet.testnet';

const details = {
	v: 1,
	payee: 'Solution Nau',
	client: 'Northwind Studio',
	description: 'Brand identity, phase one',
	amount: '250000000',
	token: 'usdc.testnet',
	issued: '2026-11-13'
};

/** A chain that returns exactly what the contract would store. */
function chainWith(entries) {
	return async (ids) => {
		const map = new Map();
		for (const id of ids) if (entries[id]) map.set(id, entries[id]);
		return map;
	};
}

async function recordFor(envelope) {
	return {
		seal: toHex(envelope.seal),
		amount: envelope.details.amount,
		token: envelope.details.token,
		payer: 'northwind.testnet',
		paid_at: '1763000000000000000',
		opened: false
	};
}

describe('canonical details', () => {
	it('is stable regardless of key order', () => {
		const shuffled = {
			issued: details.issued,
			token: details.token,
			amount: details.amount,
			description: details.description,
			client: details.client,
			payee: details.payee,
			v: details.v
		};
		expect(canonicalDetails(shuffled)).toBe(canonicalDetails(details));
	});

	it('refuses details with a missing field', () => {
		const { client, ...rest } = details;
		expect(client).toBeTruthy();
		expect(() => canonicalDetails(rest)).toThrow(/client/);
	});
});

describe('envelope derivation', () => {
	it('is deterministic for the same seed and index', async () => {
		const seed = randomBytes(32);
		const a = await deriveEnvelope(seed, 7);
		const b = await deriveEnvelope(seed, 7);
		expect(toHex(a.secret)).toBe(toHex(b.secret));
		expect(toHex(a.salt)).toBe(toHex(b.salt));
	});

	it('gives every invoice an unrelated key and salt', async () => {
		const seed = randomBytes(32);
		const a = await deriveEnvelope(seed, 1);
		const b = await deriveEnvelope(seed, 2);
		expect(toHex(a.secret)).not.toBe(toHex(b.secret));
		expect(toHex(a.salt)).not.toBe(toHex(b.salt));
		expect(toHex(a.publicKey)).not.toBe(toHex(b.publicKey));
	});

	it('changes the seal when any detail changes', async () => {
		const seed = randomBytes(32);
		const a = await buildEnvelope(seed, 0, details);
		const b = await buildEnvelope(seed, 0, { ...details, amount: '250000001' });
		expect(a.idHex).not.toBe(b.idHex);
		expect(equalBytes(a.seal, b.seal)).toBe(false);
	});

	it('hides the invoice behind the salt', async () => {
		const seed = randomBytes(32);
		const envelope = await buildEnvelope(seed, 0, details);
		const asText = toHex(envelope.seal) + envelope.idHex;
		expect(asText).not.toContain('Northwind');
		expect(asText.includes('250000000')).toBe(false);
	});
});

describe('pay links', () => {
	it('round-trips and reproduces the same envelope id without any secret', async () => {
		const seed = randomBytes(32);
		const envelope = await buildEnvelope(seed, 3, details);
		const link = await encodePayload(payLinkPayload(envelope, CONTRACT));
		const read = await readPayLink(await decodePayload(link));
		expect(read.idHex).toBe(envelope.idHex);
		expect(read.details.client).toBe('Northwind Studio');
	});

	it('carries no secret key', async () => {
		const seed = randomBytes(32);
		const envelope = await buildEnvelope(seed, 3, details);
		const link = await encodePayload(payLinkPayload(envelope, CONTRACT));
		/* Decode it the way a reader would, then look through everything the
		   link carries, however it was packed. */
		const payload = await decodePayload(link);
		const plain = JSON.stringify(payload);
		expect(plain).not.toContain(toB64(envelope.secret));
		expect(plain).not.toContain(toHex(envelope.secret));
		expect(link).not.toContain(toB64(envelope.secret));
	});

	it('produces a different id if the details in the link are edited', async () => {
		const seed = randomBytes(32);
		const envelope = await buildEnvelope(seed, 3, details);
		const payload = payLinkPayload(envelope, CONTRACT);
		/* d is positional: payee, client, description, amount, token, issued. */
		payload.d = [...payload.d];
		payload.d[3] = '9999999999';
		const read = await readPayLink(payload);
		expect(read.idHex).not.toBe(envelope.idHex);
	});
});

describe('withdrawal signatures', () => {
	it('only verifies for the recipient that was signed', async () => {
		const seed = randomBytes(32);
		const envelope = await buildEnvelope(seed, 0, details);
		const signature = await signWithdraw(envelope, CONTRACT, 'alice.testnet');

		const intended = await withdrawMessage(CONTRACT, envelope.id, 'alice.testnet');
		expect(verify(signature, intended, envelope.publicKey)).toBe(true);

		const redirected = await withdrawMessage(CONTRACT, envelope.id, 'thief.testnet');
		expect(verify(signature, redirected, envelope.publicKey)).toBe(false);
	});

	it('cannot be replayed against another deployment', async () => {
		const seed = randomBytes(32);
		const envelope = await buildEnvelope(seed, 0, details);
		const signature = await signWithdraw(envelope, CONTRACT, 'alice.testnet');
		const elsewhere = await withdrawMessage('other.testnet', envelope.id, 'alice.testnet');
		expect(verify(signature, elsewhere, envelope.publicKey)).toBe(false);
	});

	it('cannot be reused for a different envelope', async () => {
		const seed = randomBytes(32);
		const one = await buildEnvelope(seed, 0, details);
		const two = await buildEnvelope(seed, 1, details);
		const signature = await signWithdraw(one, CONTRACT, 'alice.testnet');
		const other = await withdrawMessage(CONTRACT, two.id, 'alice.testnet');
		expect(verify(signature, other, two.publicKey)).toBe(false);
	});
});

describe('proofs', () => {
	const statement = {
		v: 1,
		payee: 'Solution Nau',
		audience: 'Harbour Lettings',
		purpose: 'Rental application',
		expires: '2027-01-31'
	};

	async function fixture() {
		const seed = randomBytes(32);
		const a = await buildEnvelope(seed, 0, details);
		const b = await buildEnvelope(seed, 1, { ...details, amount: '400000000', issued: '2026-10-14' });
		const chain = chainWith({
			[a.idHex]: await recordFor(a),
			[b.idHex]: await recordFor(b)
		});
		return { seed, a, b, chain };
	}

	it('verifies payments that are really on chain', async () => {
		const { a, b, chain } = await fixture();
		const proof = await buildProof([a, b], statement, CONTRACT);
		const result = await verifyProof(proof, chain, Date.parse('2026-12-01'));
		expect(result.verified).toBe(true);
		expect(result.payments).toHaveLength(2);
		expect(result.total['usdc.testnet']).toBe(650000000n);
	});

	it('rejects an edited amount', async () => {
		const { a, chain } = await fixture();
		const proof = await buildProof([a], statement, CONTRACT);
		proof.items[0].details = { ...proof.items[0].details, amount: '999000000' };
		const result = await verifyProof(proof, chain, Date.parse('2026-12-01'));
		expect(result.verified).toBe(false);
		expect(result.payments[0].checks.onChain).toBe(false);
	});

	it('rejects an edited statement, because the signatures no longer fit', async () => {
		const { a, chain } = await fixture();
		const proof = await buildProof([a], statement, CONTRACT);
		proof.statement = { ...statement, audience: 'Someone Else' };
		const result = await verifyProof(proof, chain, Date.parse('2026-12-01'));
		expect(result.verified).toBe(false);
		expect(result.payments[0].checks.signed).toBe(false);
	});

	it('rejects a payment the person does not hold the key for', async () => {
		const { a, chain } = await fixture();
		const stranger = await buildEnvelope(randomBytes(32), 0, details);
		const proof = await buildProof([a], statement, CONTRACT);
		/* A client who paid an invoice knows its details and salt, but not its key. */
		proof.items[0].claim = toB64(stranger.publicKey);
		const result = await verifyProof(proof, chain, Date.parse('2026-12-01'));
		expect(result.verified).toBe(false);
	});

	it('refuses a payment listed twice, so a total cannot be inflated', async () => {
		const { a, chain } = await fixture();
		const proof = await buildProof([a], statement, CONTRACT);
		/* Every check passes on both copies: same seal, same record, same
		   signature. Only the repeat itself is the problem. */
		proof.items.push({ ...proof.items[0] });
		const result = await verifyProof(proof, chain, Date.parse('2026-12-01'));
		expect(result.verified).toBe(false);
		expect(result.payments[0].ok).toBe(true);
		expect(result.payments[1].ok).toBe(false);
		expect(result.payments[1].reason).toMatch(/more than once/);
		expect(result.total['usdc.testnet']).toBe(250000000n);
	});

	it('reports expiry', async () => {
		const { a, chain } = await fixture();
		const proof = await buildProof([a], statement, CONTRACT);
		const result = await verifyProof(proof, chain, Date.parse('2027-03-01'));
		expect(result.expired).toBe(true);
		expect(result.verified).toBe(false);
	});

	it('discloses nothing about the payments left out', async () => {
		const { a, b, chain } = await fixture();
		const proof = await buildProof([a], statement, CONTRACT);
		const text = JSON.stringify(proof);
		expect(text).not.toContain(b.idHex);
		expect(text).not.toContain(toB64(b.publicKey));
		expect(text).not.toContain('400000000');
		const result = await verifyProof(proof, chain, Date.parse('2026-12-01'));
		expect(result.payments).toHaveLength(1);
	});

	it('says so plainly when the chain cannot be read', async () => {
		const { a } = await fixture();
		const proof = await buildProof([a], statement, CONTRACT);
		const broken = async () => {
			throw new Error('network down');
		};
		const result = await verifyProof(proof, broken, Date.parse('2026-12-01'));
		expect(result.verified).toBe(false);
		expect(result.problems.join(' ')).toContain('network down');
	});
});
